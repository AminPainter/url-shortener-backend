import { randomBytes } from 'node:crypto';
import { Test } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuthDbService } from '@app/auth-db';
import { AuthServiceModule } from './../src/auth-service.module';

describe('AuthService (e2e)', () => {
  let app: NestFastifyApplication;
  let email: string;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AuthServiceModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    app.setGlobalPrefix('api/auth');
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    email = `e2e-${randomBytes(6).toString('hex')}@example.com`;
  });

  const signup = (payload: object) =>
    app.inject({ method: 'POST', url: '/api/auth/signup', payload });

  const login = (payload: object) =>
    app.inject({ method: 'POST', url: '/api/auth/login', payload });

  it('GET /api/auth/health', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/api/auth/health',
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: 'ok' });
  });

  it('POST /api/auth/signup creates a user', async () => {
    const response = await signup({ email, password: 'correct-horse' });
    expect(response.statusCode).toBe(201);
    expect(response.json()).toEqual({
      id: expect.stringMatching(/^\d+$/),
      email,
    });
  });

  it('POST /api/auth/signup rejects a taken email', async () => {
    await signup({ email, password: 'correct-horse' });
    const response = await signup({ email, password: 'another-pass' });
    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({
      statusCode: 409,
      message: 'Conflict',
      errorCode: 'EMAIL_TAKEN',
    });
  });

  it.each([
    {},
    { email: 'not-an-email', password: 'correct-horse' },
    { email: 'valid@example.com', password: 'short' },
  ])('POST /api/auth/signup rejects %j', async (payload) => {
    const response = await signup(payload);
    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      statusCode: 400,
      message: 'Validation failed',
      errors: expect.any(Object),
      errorCode: 'VALIDATION_FAILED',
    });
  });

  it('POST /api/auth/signup rejects a malformed JSON body', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/signup',
      headers: { 'content-type': 'application/json' },
      payload: '{"email":',
    });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toEqual({
      statusCode: 400,
      message:
        "Body is not valid JSON but content-type is set to 'application/json'",
      errorCode: 'BAD_REQUEST',
    });
  });

  it('POST /api/auth/login returns an RS256 token for the user', async () => {
    const { id } = (await signup({ email, password: 'correct-horse' })).json();

    const response = await login({ email, password: 'correct-horse' });
    expect(response.statusCode).toBe(200);

    const jwtService = new JwtService({
      publicKey: Buffer.from(
        app.get(ConfigService).getOrThrow<string>('JWT_PUBLIC_KEY'),
        'base64',
      ).toString(),
    });
    const payload = await jwtService.verifyAsync(response.json().accessToken, {
      algorithms: ['RS256'],
      issuer: 'auth-service',
    });
    expect(payload).toMatchObject({ sub: id });
  });

  it('POST /api/auth/login rejects a wrong password', async () => {
    await signup({ email, password: 'correct-horse' });
    const response = await login({ email, password: 'wrong-password' });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      statusCode: 401,
      message: 'Unauthorized',
      errorCode: 'INVALID_CREDENTIALS',
    });
  });

  it('POST /api/auth/signup treats email case-insensitively', async () => {
    await signup({ email, password: 'correct-horse' });
    const response = await signup({
      email: email.toUpperCase(),
      password: 'correct-horse',
    });
    expect(response.statusCode).toBe(409);

    const loginResponse = await login({
      email: email.toUpperCase(),
      password: 'correct-horse',
    });
    expect(loginResponse.statusCode).toBe(200);
  });

  it('POST /api/auth/login rejects an unknown user', async () => {
    const response = await login({ email, password: 'correct-horse' });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      statusCode: 401,
      message: 'Unauthorized',
      errorCode: 'INVALID_CREDENTIALS',
    });
  });

  it('cannot read the shorturls schema', async () => {
    await expect(
      app.get(AuthDbService).$queryRaw`SELECT 1 FROM shorturls.short_urls`,
    ).rejects.toThrow(/permission denied/i);
  });

  afterEach(async () => {
    await app.get(AuthDbService).user.deleteMany({ where: { email } });
    await app.close();
  });
});
