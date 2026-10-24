import { OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client';

export class ShortUrlsDbService
  extends PrismaClient
  implements OnModuleDestroy
{
  constructor(connectionString: string) {
    super({
      adapter: new PrismaPg({ connectionString }, { schema: 'shorturls' }),
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
