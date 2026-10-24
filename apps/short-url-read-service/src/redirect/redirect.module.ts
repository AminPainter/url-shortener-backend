import { Module } from '@nestjs/common';
import { RedisCacheModule } from '@app/cache';
import { ShortUrlsDbModule } from '@app/short-urls-db';
import { RedirectController } from './controllers/redirect.controller';
import { ShortUrlsRepository } from './repositories/short-urls.repository';
import { RedirectService } from './services/redirect.service';

@Module({
  imports: [
    ShortUrlsDbModule.forRoot({ urlKey: 'SHORT_URLS_READ_DATABASE_URL' }),
    RedisCacheModule,
  ],
  controllers: [RedirectController],
  providers: [RedirectService, ShortUrlsRepository],
})
export class RedirectModule {}
