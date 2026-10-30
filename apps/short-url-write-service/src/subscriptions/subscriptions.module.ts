import { Module } from '@nestjs/common';
import { ShortUrlsDbModule } from '@app/short-urls-db';
import { PlansController } from './controllers/plans.controller';
import { SubscriptionController } from './controllers/subscription.controller';
import { SubscriptionsRepository } from './repositories/subscriptions.repository';
import { SubscriptionsService } from './services/subscriptions.service';

@Module({
  imports: [
    ShortUrlsDbModule.forRoot({ urlKey: 'SHORT_URLS_WRITE_DATABASE_URL' }),
  ],
  controllers: [PlansController, SubscriptionController],
  providers: [SubscriptionsService, SubscriptionsRepository],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
