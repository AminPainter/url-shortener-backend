import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { RedisLockModule } from '@app/lock';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { UsersClientModule } from '../users-client/users-client.module';
import { GlomoCustomersClient } from './clients/glomo-customers.client';
import { GlomoHttpClient } from './clients/glomo-http.client';
import { GlomoPaymentsClient } from './clients/glomo-payments.client';
import { GlomoSubscriptionsClient } from './clients/glomo-subscriptions.client';
import { GLOMO_HTTP_TIMEOUT_MS } from './constants/glomo';
import { BillingController } from './controllers/billing.controller';
import { GlomoWebhooksController } from './controllers/glomo-webhooks.controller';
import { BillingRepository } from './repositories/billing.repository';
import { WebhookEventsRepository } from './repositories/webhook-events.repository';
import { BillingSyncService } from './services/billing-sync.service';
import { BillingService } from './services/billing.service';
import { GlomoWebhooksService } from './services/glomo-webhooks.service';
import { BillingLock } from './utils/billing-lock.util';
import { GlomoSignature } from './utils/glomo-signature.util';

@Module({
  imports: [
    HttpModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        baseURL: configService.getOrThrow<string>('GLOMO_API_BASE_URL'),
        timeout: GLOMO_HTTP_TIMEOUT_MS,
        headers: {
          Authorization: `Bearer ${configService.getOrThrow<string>('GLOMO_SECRET_KEY')}`,
          'Content-Type': 'application/json',
        },
      }),
    }),
    RedisLockModule,
    SubscriptionsModule,
    UsersClientModule,
  ],
  controllers: [BillingController, GlomoWebhooksController],
  providers: [
    BillingService,
    BillingSyncService,
    GlomoWebhooksService,
    BillingRepository,
    WebhookEventsRepository,
    GlomoHttpClient,
    GlomoCustomersClient,
    GlomoSubscriptionsClient,
    GlomoPaymentsClient,
    GlomoSignature,
    BillingLock,
  ],
})
export class BillingModule {}
