import { randomInt } from 'node:crypto';
import { Test } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ShortUrlsDbService } from '@app/short-urls-db';
import { ShortUrlWriteServiceModule } from './../src/short-url-write-service.module';

describe('ShortUrlWriteService (e2e)', () => {
  let app: NestFastifyApplication;
  let userId: string;
  let accessToken: string;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [ShortUrlWriteServiceModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    app.setGlobalPrefix('api');
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    userId = String(randomInt(1, 2 ** 47));
    accessToken = await new JwtService({
      privateKey: Buffer.from(
        app.get(ConfigService).getOrThrow<string>('JWT_PRIVATE_KEY'),
        'base64',
      ).toString(),
    }).signAsync(
      { sub: userId },
      { algorithm: 'RS256', expiresIn: '1h', issuer: 'auth-service' },
    );
  });

  const createShortUrl = (payload: object, authorization?: string) =>
    app.inject({
      method: 'POST',
      url: '/api/short-urls',
      payload,
      headers: authorization ? { authorization } : {},
    });

  it('GET /api/health', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });

  it('POST /api/short-urls stores the link for the token user', async () => {
    const response = await createShortUrl(
      { longUrl: 'https://example.com' },
      `Bearer ${accessToken}`,
    );
    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      shortCode: expect.stringMatching(/^[0-9A-Za-z]{7}$/),
      longUrl: 'https://example.com',
    });

    const prisma = app.get(ShortUrlsDbService);
    const { shortCode } = response.json();
    const shortUrl = await prisma.shortUrl.findUnique({ where: { shortCode } });
    expect(shortUrl?.longUrl).toBe('https://example.com');
    expect(shortUrl?.userId).toBe(BigInt(userId));
    await prisma.shortUrl.delete({ where: { shortCode } });
  });

  it.each([{}, { longUrl: 'not a url' }, { longUrl: 'ftp://x' }])(
    'POST /api/short-urls rejects %j',
    async (payload) => {
      const response = await createShortUrl(payload, `Bearer ${accessToken}`);
      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({
        statusCode: 400,
        errorCode: 'VALIDATION_FAILED',
      });
    },
  );

  it('POST /api/short-urls rejects a missing token', async () => {
    const response = await createShortUrl({ longUrl: 'https://example.com' });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      statusCode: 401,
      message: 'Unauthorized',
      errorCode: 'UNAUTHORIZED',
    });
  });

  it('POST /api/short-urls rejects a malformed token', async () => {
    const response = await createShortUrl(
      { longUrl: 'https://example.com' },
      'Bearer not-a-jwt',
    );
    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      statusCode: 401,
      message: 'Unauthorized',
      errorCode: 'UNAUTHORIZED',
    });
  });

  it('POST /api/short-urls rejects an HS256 token', async () => {
    const forgedToken = await new JwtService({
      secret: 'forged-secret',
    }).signAsync({ sub: userId }, { issuer: 'auth-service' });
    const response = await createShortUrl(
      { longUrl: 'https://example.com' },
      `Bearer ${forgedToken}`,
    );
    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      statusCode: 401,
      message: 'Unauthorized',
      errorCode: 'UNAUTHORIZED',
    });
  });

  const listShortUrls = (query: string, authorization?: string) =>
    app.inject({
      method: 'GET',
      url: `/api/short-urls${query}`,
      headers: authorization ? { authorization } : {},
    });

  it('GET /api/short-urls pages through only the token user links, newest first', async () => {
    const prisma = app.get(ShortUrlsDbService);
    const shortCodes = Array.from({ length: 3 }, () =>
      randomInt(36 ** 6, 36 ** 7).toString(36),
    );
    for (const shortCode of shortCodes) {
      await prisma.shortUrl.create({
        data: {
          shortCode,
          longUrl: `https://example.com/${shortCode}`,
          userId: BigInt(userId),
        },
      });
    }
    const otherShortCode = randomInt(36 ** 6, 36 ** 7).toString(36);
    await prisma.shortUrl.create({
      data: {
        shortCode: otherShortCode,
        longUrl: 'https://example.com',
        userId: BigInt(userId) + 1n,
      },
    });

    const firstPage = await listShortUrls('?limit=2', `Bearer ${accessToken}`);
    expect(firstPage.statusCode).toBe(200);
    expect(firstPage.json()).toEqual({
      items: [shortCodes[2], shortCodes[1]].map((shortCode) => ({
        shortCode,
        longUrl: `https://example.com/${shortCode}`,
        createdAt: expect.any(String),
      })),
      nextCursor: expect.stringMatching(/^\d+$/),
    });

    const secondPage = await listShortUrls(
      `?limit=2&cursor=${firstPage.json().nextCursor}`,
      `Bearer ${accessToken}`,
    );
    expect(secondPage.json()).toEqual({
      items: [
        {
          shortCode: shortCodes[0],
          longUrl: `https://example.com/${shortCodes[0]}`,
          createdAt: expect.any(String),
        },
      ],
      nextCursor: null,
    });

    await prisma.shortUrl.deleteMany({
      where: { shortCode: { in: [...shortCodes, otherShortCode] } },
    });
  });

  it.each(['?limit=0', '?limit=101', '?cursor=abc'])(
    'GET /api/short-urls rejects %s',
    async (query) => {
      const response = await listShortUrls(query, `Bearer ${accessToken}`);
      expect(response.statusCode).toBe(400);
      expect(response.json()).toMatchObject({ errorCode: 'VALIDATION_FAILED' });
    },
  );

  it('GET /api/short-urls rejects a missing token', async () => {
    const response = await listShortUrls('');
    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ errorCode: 'UNAUTHORIZED' });
  });

  const getSubscription = (authorization?: string) =>
    app.inject({
      method: 'GET',
      url: '/api/subscription',
      headers: authorization ? { authorization } : {},
    });

  const seedShortUrls = async (count: number) => {
    const shortCodes = Array.from({ length: count }, () =>
      randomInt(36 ** 6, 36 ** 7).toString(36),
    );
    await app.get(ShortUrlsDbService).shortUrl.createMany({
      data: shortCodes.map((shortCode) => ({
        shortCode,
        longUrl: 'https://example.com',
        userId: BigInt(userId),
      })),
    });
  };

  const cleanUpUser = async () => {
    const prisma = app.get(ShortUrlsDbService);
    await prisma.shortUrl.deleteMany({ where: { userId: BigInt(userId) } });
    await prisma.subscriptionPlan.deleteMany({
      where: { userId: BigInt(userId) },
    });
  };

  it('GET /api/plans lists the plans', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/plans' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      items: [
        { plan: 'FREE', name: 'Free', linkLimit: 10 },
        { plan: 'PRO', name: 'Pro', linkLimit: 100 },
        { plan: 'BUSINESS', name: 'Business', linkLimit: 1000 },
      ],
    });
  });

  it('GET /api/subscription defaults a new user to Free', async () => {
    const response = await getSubscription(`Bearer ${accessToken}`);
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      plan: 'FREE',
      name: 'Free',
      linkLimit: 10,
      linkCount: 0,
    });
  });

  it('GET /api/subscription rejects a missing token', async () => {
    const response = await getSubscription();
    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ errorCode: 'UNAUTHORIZED' });
  });

  it('POST /api/short-urls rejects a link past the plan limit', async () => {
    await seedShortUrls(10);
    const response = await createShortUrl(
      { longUrl: 'https://example.com' },
      `Bearer ${accessToken}`,
    );
    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({
      statusCode: 403,
      message: 'Forbidden',
      errorCode: 'LINK_LIMIT_REACHED',
    });
    expect(
      (await getSubscription(`Bearer ${accessToken}`)).json(),
    ).toMatchObject({ linkCount: 10 });
    await cleanUpUser();
  });

  it('POST /api/short-urls follows the stored plan', async () => {
    await seedShortUrls(10);
    await app.get(ShortUrlsDbService).subscriptionPlan.create({
      data: { userId: BigInt(userId), plan: 'PRO' },
    });
    const response = await createShortUrl(
      { longUrl: 'https://example.com' },
      `Bearer ${accessToken}`,
    );
    expect(response.statusCode).toBe(201);
    expect((await getSubscription(`Bearer ${accessToken}`)).json()).toEqual({
      plan: 'PRO',
      name: 'Pro',
      linkLimit: 100,
      linkCount: 11,
    });
    await cleanUpUser();
  });

  it('POST /api/short-urls admits only one concurrent create at the limit', async () => {
    await seedShortUrls(9);
    const responses = await Promise.all(
      Array.from({ length: 3 }, () =>
        createShortUrl(
          { longUrl: 'https://example.com' },
          `Bearer ${accessToken}`,
        ),
      ),
    );
    expect(responses.map((response) => response.statusCode).sort()).toEqual([
      201, 403, 403,
    ]);
    await cleanUpUser();
  });

  it('cannot read the auth schema', async () => {
    await expect(
      app.get(ShortUrlsDbService).$queryRaw`SELECT 1 FROM auth.users`,
    ).rejects.toThrow(/permission denied/i);
  });

  afterEach(async () => {
    await app.close();
  });
});
