import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ErrorResponseFilter } from '@app/errors';
import { PinoLoggerModule } from '@app/logger';
import { HealthModule } from './health/health.module';
import { RedirectModule } from './redirect/redirect.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PinoLoggerModule,
    HealthModule,
    RedirectModule,
  ],
  providers: [{ provide: APP_FILTER, useClass: ErrorResponseFilter }],
})
export class ShortUrlReadServiceModule {}
