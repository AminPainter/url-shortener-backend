import { TransactionalAdapterPrisma } from '@nestjs-cls/transactional-adapter-prisma';
import { ShortUrlsDbService } from './short-urls-db.service';

export type ShortUrlsTransactionalAdapter =
  TransactionalAdapterPrisma<ShortUrlsDbService>;
