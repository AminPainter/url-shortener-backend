import { Module } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ClsPluginTransactional } from '@nestjs-cls/transactional';
import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { ClsModule } from 'nestjs-cls';
import { ErrorResponseFilter } from '@app/errors';
import { PinoLoggerModule } from '@app/logger';
import { ShortUrlsDbModule, ShortUrlsDbService } from '@app/short-urls-db';
import { ZodValidationPipe } from '@app/validation';
import { AuthModule } from './auth/auth.module';
import { HealthModule } from './health/health.module';
import { ShortUrlsModule } from './short-urls/short-urls.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ClsModule.forRoot({
      global: true,
      plugins: [
        new ClsPluginTransactional({
          imports: [
            ShortUrlsDbModule.forRoot({
              urlKey: 'SHORT_URLS_WRITE_DATABASE_URL',
            }),
          ],
          adapter: new TransactionalAdapterPrisma<ShortUrlsDbService>({
            prismaInjectionToken: ShortUrlsDbService,
            sqlFlavor: 'postgresql',
          }),
        }),
      ],
    }),
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
