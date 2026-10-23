import { randomBytes } from 'node:crypto';
import { Test } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '@app/prisma';
import { ReadServiceModule } from './../src/read-service.module';

describe('ReadService (e2e)', () => {
  let app: NestFastifyApplication;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [ReadServiceModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  it('GET /health', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
  });

  it('GET /:code redirects to the long URL', async () => {
    const prisma = app.get(PrismaService);
    const shortCode = randomBytes(4).toString('hex').slice(0, 7);
    await prisma.shortUrl.create({
      data: { shortCode, longUrl: 'https://glomo.one' },
    });

    const res = await app.inject({ method: 'GET', url: `/${shortCode}` });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('https://glomo.one');

    await prisma.shortUrl.delete({ where: { shortCode } });
    await app.get<Cache>(CACHE_MANAGER).del(shortCode);
  });

  it('GET /:code serves a cached redirect after the row is gone', async () => {
    const prisma = app.get(PrismaService);
    const shortCode = randomBytes(4).toString('hex').slice(0, 7);
    await prisma.shortUrl.create({
      data: { shortCode, longUrl: 'https://glomo.one' },
    });
    await app.inject({ method: 'GET', url: `/${shortCode}` });
    await prisma.shortUrl.delete({ where: { shortCode } });

    const res = await app.inject({ method: 'GET', url: `/${shortCode}` });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('https://glomo.one');

    await app.get<Cache>(CACHE_MANAGER).del(shortCode);
  });

  it('GET /:code does not cache a miss', async () => {
    const prisma = app.get(PrismaService);
    const shortCode = randomBytes(4).toString('hex').slice(0, 7);
    await app.inject({ method: 'GET', url: `/${shortCode}` });
    await prisma.shortUrl.create({
      data: { shortCode, longUrl: 'https://glomo.one' },
    });

    const res = await app.inject({ method: 'GET', url: `/${shortCode}` });
    expect(res.statusCode).toBe(302);

    await prisma.shortUrl.delete({ where: { shortCode } });
    await app.get<Cache>(CACHE_MANAGER).del(shortCode);
  });

  it('GET /:code returns 404 for an unknown code', async () => {
    const res = await app.inject({ method: 'GET', url: '/zzzzzzz' });
    expect(res.statusCode).toBe(404);
  });

  afterEach(async () => {
    await app.close();
  });
});
