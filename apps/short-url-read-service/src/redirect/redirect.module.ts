import { Module } from '@nestjs/common';
import { RedisCacheModule } from '@app/cache';
import { PrismaModule } from '@app/prisma';
import { RedirectController } from './controllers/redirect.controller';
import { ShortUrlsRepository } from './repositories/short-urls.repository';
import { RedirectService } from './services/redirect.service';

@Module({
  imports: [PrismaModule, RedisCacheModule],
  controllers: [RedirectController],
  providers: [RedirectService, ShortUrlsRepository],
})
export class RedirectModule {}
