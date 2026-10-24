import { randomInt } from 'node:crypto';
import { Test } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@app/prisma';
import { WriteServiceModule } from './../src/write-service.module';

describe('WriteService (e2e)', () => {
  let app: NestFastifyApplication;
  let userId: string;
  let accessToken: string;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [WriteServiceModule],
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

    const prisma = app.get(PrismaService);
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

  afterEach(async () => {
    await app.close();
  });
});
