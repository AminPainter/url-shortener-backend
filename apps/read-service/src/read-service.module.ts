import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RedisCacheModule } from '@app/cache';
import { PinoLoggerModule } from '@app/logger';
import { PrismaModule } from '@app/prisma';
import { HealthController } from './health.controller';
import { RedirectController } from './redirect.controller';
import { RedirectService } from './redirect.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PinoLoggerModule,
    PrismaModule,
    RedisCacheModule,
  ],
  controllers: [HealthController, RedirectController],
  providers: [RedirectService],
})
export class ReadServiceModule {}
