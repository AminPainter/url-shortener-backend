import { Module } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { PinoLoggerModule } from '@app/logger';
import { PrismaModule } from '@app/prisma';
import { ZodValidationPipe } from '@app/validation';
import { HealthController } from './health.controller';
import { ShortUrlsController } from './short-urls.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PinoLoggerModule,
    PrismaModule,
  ],
  controllers: [HealthController, ShortUrlsController],
  providers: [{ provide: APP_PIPE, useClass: ZodValidationPipe }],
})
export class WriteServiceModule {}
