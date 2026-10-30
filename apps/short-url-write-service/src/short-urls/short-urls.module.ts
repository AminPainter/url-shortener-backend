import { Module } from '@nestjs/common';
import { ShortUrlsDbModule } from '@app/short-urls-db';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { ShortUrlsController } from './controllers/short-urls.controller';
import { ShortUrlsRepository } from './repositories/short-urls.repository';
import { ShortUrlsService } from './services/short-urls.service';

@Module({
  imports: [
    ShortUrlsDbModule.forRoot({ urlKey: 'SHORT_URLS_WRITE_DATABASE_URL' }),
    SubscriptionsModule,
  ],
  controllers: [ShortUrlsController],
  providers: [ShortUrlsService, ShortUrlsRepository],
})
export class ShortUrlsModule {}
