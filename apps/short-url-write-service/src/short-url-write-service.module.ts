import { Module } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ErrorResponseFilter } from '@app/errors';
import { PinoLoggerModule } from '@app/logger';
import { ZodValidationPipe } from '@app/validation';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { ShortUrlsModule } from './short-urls/short-urls.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PinoLoggerModule,
    HealthModule,
    AuthModule,
    ShortUrlsModule,
    SubscriptionsModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: ErrorResponseFilter },
    { provide: APP_PIPE, useClass: ZodValidationPipe },
  ],
})
export class ShortUrlWriteServiceModule {}
