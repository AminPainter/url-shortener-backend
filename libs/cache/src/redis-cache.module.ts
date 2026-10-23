import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { createKeyv } from '@keyv/redis';

@Module({
  imports: [
    CacheModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        stores: [
          createKeyv(
            {
              url: configService.getOrThrow<string>('REDIS_URL'),
              disableOfflineQueue: true,
            },
            {
              namespace: 'short-url',
              keyPrefixSeparator: ':',
              throwOnConnectError: false,
            },
          ),
        ],
      }),
    }),
  ],
  exports: [CacheModule],
})
export class RedisCacheModule {}
