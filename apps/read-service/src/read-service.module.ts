import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { RedisCacheModule } from '@app/cache';
import { ErrorResponseFilter } from '@app/errors';
import { PinoLoggerModule } from '@app/logger';
import { PrismaModule } from '@app/prisma';
import { HealthController } from './health.controller';
import { RedirectController } from './redirect.controller';
import { RedirectService } from './redirect.service';
import { ShortUrlsRepository } from './short-urls.repository';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PinoLoggerModule,
    PrismaModule,
    RedisCacheModule,
  ],
  controllers: [HealthController, RedirectController],
  providers: [
    { provide: APP_FILTER, useClass: ErrorResponseFilter },
    RedirectService,
    ShortUrlsRepository,
  ],
})
export class ReadServiceModule {}
