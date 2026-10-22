import { Test } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { PrismaService } from '@app/prisma';
import { WriteServiceModule } from './../src/write-service.module';

describe('WriteService (e2e)', () => {
  let app: NestFastifyApplication;

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
  });

  it('GET /api/health', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
  });

  it('POST /api/short-urls', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/short-urls',
      payload: { longUrl: 'https://glomo.one' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toEqual({
      shortCode: expect.stringMatching(/^[0-9A-Za-z]{7}$/),
      longUrl: 'https://glomo.one',
    });

    const prisma = app.get(PrismaService);
    const { shortCode } = res.json();
    const row = await prisma.shortUrl.findUnique({ where: { shortCode } });
    expect(row?.longUrl).toBe('https://glomo.one');
    await prisma.shortUrl.delete({ where: { shortCode } });
  });

  it.each([{}, { longUrl: 'not a url' }, { longUrl: 'ftp://x' }])(
    'POST /api/short-urls rejects %j',
    async (payload) => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/short-urls',
        payload,
      });
      expect(res.statusCode).toBe(400);
    },
  );

  afterEach(async () => {
    await app.close();
  });
});
