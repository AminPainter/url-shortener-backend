import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisModule, RedisToken } from '@nestjs-redis/client';
import { RedlockModule } from '@nestjs-redis/lock';
import type { RedisClientType } from 'redis';

@Module({
  imports: [
    RedlockModule.forRootAsync({
      imports: [
        RedisModule.forRootAsync({
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => ({
            options: {
              url: configService.getOrThrow<string>('REDIS_URL'),
              disableOfflineQueue: true,
            },
          }),
        }),
      ],
      inject: [RedisToken()],
      useFactory: (redisClient: RedisClientType) => ({
        clients: [redisClient],
        redlockConfig: {
          retryDelayMs: 25,
          retryJitterMs: 25,
          maxRetryAttempts: 150,
        },
      }),
    }),
  ],
  exports: [RedlockModule],
})
export class RedisLockModule {}
