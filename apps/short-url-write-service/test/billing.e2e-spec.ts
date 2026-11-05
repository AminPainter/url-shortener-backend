import { createHmac, randomInt } from 'node:crypto';
import { Test } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { INestMicroservice } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Transport } from '@nestjs/microservices';
import { AuthDbService } from '@app/auth-db';
import { ShortUrlsDbService } from '@app/short-urls-db';
import { AuthServiceModule } from '../../auth-service/src/auth-service.module';
import { GlomoClient } from '../src/billing/clients/glomo.client';
import { ShortUrlWriteServiceModule } from '../src/short-url-write-service.module';

const GLOMO_SECRET_KEY = 'test-glomo-secret-key';
const GLOMO_WEBHOOK_SECRET = 'whsec_test-webhook-secret';

process.env.GLOMO_API_BASE_URL = 'https://glomo.invalid/api/v1';
process.env.GLOMO_SECRET_KEY = GLOMO_SECRET_KEY;
process.env.GLOMO_PUBLIC_KEY = 'test_public-key';
process.env.GLOMO_WEBHOOK_SECRET = GLOMO_WEBHOOK_SECRET;
process.env.AUTH_INTERNAL_HOST = '127.0.0.1';
process.env.AUTH_INTERNAL_PORT = String(randomInt(20_000, 40_000));

const futureDate = (days: number) =>
  new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

describe('Billing (e2e)', () => {
  let app: NestFastifyApplication;
  let authMicroservice: INestMicroservice;
  let userId: bigint;
  let accessToken: string;
  let subscriptionCounter = 0;
  const glomoSubscriptions = new Map<string, Record<string, unknown>>();

  const glomoClient = {
    ensureCustomer: vi.fn(async () => 'cust_test123'),
    createSubscription: vi.fn(async () => {
      const id = `sub_test${Date.now()}${subscriptionCounter++}`;
      glomoSubscriptions.set(id, {
        id,
        status: 'created',
        next_payment_date: null,
        cancelled_at: null,
      });
      return glomoSubscriptions.get(id);
    }),
    getSubscription: vi.fn(async (id: string) => glomoSubscriptions.get(id)),
    cancelSubscription: vi.fn(async (id: string) => {
      glomoSubscriptions.set(id, {
        ...glomoSubscriptions.get(id),
        status: 'cancelled',
        cancelled_at: futureDate(0),
      });
    }),
    getPayment: vi.fn(async (id: string) => ({
      id,
      subscription_id: [...glomoSubscriptions.keys()].at(-1),
      status: 'success',
      requested_amount: 500,
      requested_currency: 'USD',
      paid_at: new Date().toISOString(),
    })),
  };

  beforeAll(async () => {
    const authModule = await Test.createTestingModule({
      imports: [AuthServiceModule],
    }).compile();
    authMicroservice = authModule.createNestMicroservice({
      transport: Transport.TCP,
      options: {
        host: process.env.AUTH_INTERNAL_HOST,
        port: Number(process.env.AUTH_INTERNAL_PORT),
      },
    });
    await authMicroservice.listen();
  });

  afterAll(async () => {
    await authMicroservice.close();
  });

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [ShortUrlWriteServiceModule],
    })
      .overrideProvider(GlomoClient)
      .useValue(glomoClient)
      .compile();
    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
      { rawBody: true },
    );
    app.setGlobalPrefix('api');
    await app.init();
    await app.getHttpAdapter().getInstance().ready();

    const user = await authMicroservice.get(AuthDbService).user.create({
      data: {
        email: `billing-${randomInt(2 ** 40)}@example.com`,
        passwordHash: 'not-a-real-hash',
        name: 'Test Payer',
        address: {
          addressLine1: '1 Main St',
          city: 'Bengaluru',
          state: 'Karnataka',
          country: 'IND',
          pincode: '560001',
        },
      },
      select: { id: true },
    });
    userId = user.id;
    accessToken = await new JwtService({
      privateKey: Buffer.from(
        app.get(ConfigService).getOrThrow<string>('JWT_PRIVATE_KEY'),
        'base64',
      ).toString(),
    }).signAsync(
      { sub: userId.toString() },
      { algorithm: 'RS256', expiresIn: '1h', issuer: 'auth-service' },
    );
  });

  afterEach(async () => {
    const prisma = app.get(ShortUrlsDbService);
    const billingSubscriptions = await prisma.billingSubscription.findMany({
      where: { userId },
      select: { id: true, partnerSubscriptionId: true },
    });
    await prisma.subscriptionPlan.deleteMany({ where: { userId } });
    await prisma.billingPayment.deleteMany({
      where: {
        billingSubscriptionId: { in: billingSubscriptions.map(({ id }) => id) },
      },
    });
    await prisma.webhookEvent.deleteMany({
      where: {
        entityId: {
          in: billingSubscriptions.map(
            ({ partnerSubscriptionId }) => partnerSubscriptionId,
          ),
        },
      },
    });
    await prisma.billingSubscription.deleteMany({ where: { userId } });
    await prisma.billingCustomer.deleteMany({ where: { userId } });
    await authMicroservice
      .get(AuthDbService)
      .user.delete({ where: { id: userId } });
    await app.close();
    vi.clearAllMocks();
  });

  const post = (url: string, payload?: object) =>
    app.inject({
      method: 'POST',
      url,
      payload,
      headers: { authorization: `Bearer ${accessToken}` },
    });

  const getSubscription = () =>
    app.inject({
      method: 'GET',
      url: '/api/subscription',
      headers: { authorization: `Bearer ${accessToken}` },
    });

  const checkoutSignature = (
    subscriptionId: string,
    paymentId: string,
    status: string,
  ) =>
    createHmac('sha256', GLOMO_SECRET_KEY)
      .update(`${subscriptionId}|${paymentId}|${status}`)
      .digest('hex');

  const sendWebhook = (body: object, secret = GLOMO_WEBHOOK_SECRET) => {
    const rawBody = JSON.stringify(body);
    return app.inject({
      method: 'POST',
      url: '/api/webhooks/glomo',
      payload: rawBody,
      headers: {
        'content-type': 'application/json',
        'x-glomopay-signature': createHmac('sha256', secret)
          .update(rawBody)
          .digest('hex'),
      },
    });
  };

  const subscribeToPro = async () => {
    const checkout = await post('/api/billing/checkout', {
      plan: 'PRO',
      interval: 'MONTH',
    });
    const { subscriptionId } = checkout.json();
    glomoSubscriptions.set(subscriptionId, {
      ...glomoSubscriptions.get(subscriptionId),
      status: 'active',
      next_payment_date: futureDate(30),
    });
    const confirm = await post('/api/billing/checkout/confirm', {
      subscriptionId,
      paymentId: 'payt_first1',
      status: 'success',
      signature: checkoutSignature(subscriptionId, 'payt_first1', 'success'),
    });
    return { subscriptionId, confirm };
  };

  it('POST /api/billing/checkout creates a Glomo subscription and reuses it on retry', async () => {
    const first = await post('/api/billing/checkout', {
      plan: 'PRO',
      interval: 'MONTH',
    });
    expect(first.statusCode).toBe(201);
    expect(first.json()).toEqual({
      subscriptionId: expect.stringMatching(/^sub_/),
      publicKey: 'test_public-key',
    });
    expect(glomoClient.ensureCustomer).toHaveBeenCalledWith({
      name: 'Test Payer',
      email: expect.stringMatching(/@example\.com$/),
      address: '1 Main St',
      city: 'Bengaluru',
      state: 'Karnataka',
      country: 'IND',
      pincode: '560001',
    });
    expect(glomoClient.createSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: 'cust_test123',
        amount: 500,
        currency: 'USD',
        intervalType: 'month',
        billingCycles: 360,
      }),
    );

    const retry = await post('/api/billing/checkout', {
      plan: 'PRO',
      interval: 'MONTH',
    });
    expect(retry.json().subscriptionId).toBe(first.json().subscriptionId);
    expect(glomoClient.createSubscription).toHaveBeenCalledTimes(1);
  });

  it('POST /api/billing/checkout rejects an incomplete profile', async () => {
    await authMicroservice
      .get(AuthDbService)
      .user.update({ where: { id: userId }, data: { name: null } });
    const response = await post('/api/billing/checkout', {
      plan: 'PRO',
      interval: 'MONTH',
    });
    expect(response.statusCode).toBe(422);
    expect(response.json()).toMatchObject({ errorCode: 'PROFILE_INCOMPLETE' });
    expect(glomoClient.createSubscription).not.toHaveBeenCalled();
  });

  it('POST /api/billing/checkout rejects an invalid plan', async () => {
    const response = await post('/api/billing/checkout', {
      plan: 'FREE',
      interval: 'MONTH',
    });
    expect(response.statusCode).toBe(400);
  });

  it('POST /api/billing/checkout/confirm rejects a forged signature', async () => {
    const checkout = await post('/api/billing/checkout', {
      plan: 'PRO',
      interval: 'MONTH',
    });
    const response = await post('/api/billing/checkout/confirm', {
      subscriptionId: checkout.json().subscriptionId,
      paymentId: 'payt_forged',
      status: 'success',
      signature: 'a'.repeat(64),
    });
    expect(response.statusCode).toBe(401);
    expect(response.json()).toMatchObject({ errorCode: 'INVALID_SIGNATURE' });
    expect((await getSubscription()).json()).toMatchObject({ plan: 'FREE' });
  });

  it('POST /api/billing/checkout/confirm grants the plan once, idempotently', async () => {
    const { subscriptionId, confirm } = await subscribeToPro();
    expect(confirm.statusCode).toBe(200);
    expect(confirm.json()).toMatchObject({
      plan: 'PRO',
      linkLimit: 100,
      billing: { status: 'ACTIVE', interval: 'MONTH', validUntil: null },
    });

    const repeat = await post('/api/billing/checkout/confirm', {
      subscriptionId,
      paymentId: 'payt_first1',
      status: 'success',
      signature: checkoutSignature(subscriptionId, 'payt_first1', 'success'),
    });
    expect(repeat.statusCode).toBe(200);
    expect(
      await app.get(ShortUrlsDbService).billingPayment.count({
        where: { partnerPaymentId: 'payt_first1' },
      }),
    ).toBe(1);

    const secondCheckout = await post('/api/billing/checkout', {
      plan: 'BUSINESS',
      interval: 'YEAR',
    });
    expect(secondCheckout.statusCode).toBe(409);
    expect(secondCheckout.json()).toMatchObject({
      errorCode: 'ALREADY_SUBSCRIBED',
    });
  });

  it('POST /api/billing/cancel keeps the plan until the period ends', async () => {
    await subscribeToPro();
    const response = await post('/api/billing/cancel');
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      plan: 'PRO',
      billing: {
        status: 'CANCELLED',
        validUntil: expect.stringContaining(futureDate(30)),
      },
    });
  });

  it('POST /api/billing/cancel returns 404 without a subscription', async () => {
    const response = await post('/api/billing/cancel');
    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({
      errorCode: 'SUBSCRIPTION_NOT_FOUND',
    });
  });

  it('POST /api/webhooks/glomo rejects a bad signature', async () => {
    const response = await sendWebhook(
      { entity_type: 'subscription', event_type: 'active', data: {} },
      'wrong-secret',
    );
    expect(response.statusCode).toBe(401);
  });

  it('POST /api/webhooks/glomo processes a delivery once and downgrades an ended subscription', async () => {
    const { subscriptionId } = await subscribeToPro();
    const webhook = {
      entity_type: 'subscription',
      event_type: 'expired',
      data: {
        id: subscriptionId,
        status: 'expired',
        next_payment_date: null,
        cancelled_at: null,
      },
    };
    const first = await sendWebhook(webhook);
    const duplicate = await sendWebhook(webhook);
    expect(first.statusCode).toBe(200);
    expect(duplicate.statusCode).toBe(200);
    expect(
      await app.get(ShortUrlsDbService).webhookEvent.findMany({
        where: { entityId: subscriptionId },
        select: { status: true },
      }),
    ).toEqual([{ status: 'PROCESSED' }]);
    expect((await getSubscription()).json()).toMatchObject({
      plan: 'FREE',
      billing: null,
    });
  });

  it('POST /api/webhooks/glomo records a renewal payment', async () => {
    const { subscriptionId } = await subscribeToPro();
    glomoSubscriptions.set(subscriptionId, {
      ...glomoSubscriptions.get(subscriptionId),
      next_payment_date: futureDate(60),
    });
    const response = await sendWebhook({
      entity_type: 'payment',
      event_type: 'success',
      data: {
        id: 'payt_renewal1',
        subscription_id: subscriptionId,
        status: 'success',
        requested_amount: 500,
        requested_currency: 'USD',
        paid_at: new Date().toISOString(),
        'auto_debit?': true,
      },
    });
    expect(response.statusCode).toBe(200);
    expect(
      await app.get(ShortUrlsDbService).billingPayment.findMany({
        where: { partnerPaymentId: 'payt_renewal1' },
        select: { sequence: true, status: true },
      }),
    ).toEqual([{ sequence: 'SUBSEQUENT', status: 'success' }]);
    expect((await getSubscription()).json()).toMatchObject({
      plan: 'PRO',
      billing: { currentPeriodEnd: expect.stringContaining(futureDate(60)) },
    });
    await app
      .get(ShortUrlsDbService)
      .webhookEvent.deleteMany({ where: { entityId: 'payt_renewal1' } });
  });
});
