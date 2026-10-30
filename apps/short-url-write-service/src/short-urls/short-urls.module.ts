import { Module } from '@nestjs/common';
import { RedisLockModule } from '@app/lock';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { ShortUrlsController } from './controllers/short-urls.controller';
import { ShortUrlsRepository } from './repositories/short-urls.repository';
import { ShortUrlsService } from './services/short-urls.service';
import { UserLinkLock } from './utils/user-link-lock.util';

@Module({
  imports: [RedisLockModule, SubscriptionsModule],
  controllers: [ShortUrlsController],
  providers: [ShortUrlsService, ShortUrlsRepository, UserLinkLock],
})
export class ShortUrlsModule {}
