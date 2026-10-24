import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client';

@Injectable()
export class AuthDbService extends PrismaClient implements OnModuleDestroy {
  constructor(config: ConfigService) {
    super({
      adapter: new PrismaPg(
        { connectionString: config.getOrThrow<string>('AUTH_DATABASE_URL') },
        { schema: 'auth' },
      ),
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
