import { DynamicModule, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ShortUrlsDbService } from './short-urls-db.service';

// Write and read services connect as different roles, so each passes its own
// connection string key.
@Module({})
export class ShortUrlsDbModule {
  static forRoot({ urlKey }: { urlKey: string }): DynamicModule {
    return {
      module: ShortUrlsDbModule,
      providers: [
        {
          provide: ShortUrlsDbService,
          inject: [ConfigService],
          useFactory: (config: ConfigService) =>
            new ShortUrlsDbService(config.getOrThrow<string>(urlKey)),
        },
      ],
      exports: [ShortUrlsDbService],
    };
  }
}
