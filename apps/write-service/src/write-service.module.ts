import { Module } from '@nestjs/common';
import { APP_PIPE } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { PinoLoggerModule } from '@app/logger';
import { PrismaModule } from '@app/prisma';
import { ZodValidationPipe } from '@app/validation';
import { HealthController } from './health.controller';
import { JwtStrategy } from './jwt.strategy';
import { ShortUrlsController } from './short-urls.controller';
import { ShortUrlsRepository } from './short-urls.repository';
import { ShortUrlsService } from './short-urls.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PinoLoggerModule,
    PrismaModule,
    PassportModule,
  ],
  controllers: [HealthController, ShortUrlsController],
  providers: [
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    JwtStrategy,
    ShortUrlsService,
    ShortUrlsRepository,
  ],
})
export class WriteServiceModule {}
