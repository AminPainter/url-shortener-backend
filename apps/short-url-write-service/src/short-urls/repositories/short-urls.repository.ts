import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { ShortUrlsTransactionalAdapter } from '@app/short-urls-db';

@Injectable()
export class ShortUrlsRepository {
  constructor(
    private readonly transactionHost: TransactionHost<ShortUrlsTransactionalAdapter>,
  ) {}

  countByUser(userId: string) {
    return this.transactionHost.tx.shortUrl.count({ where: { userId } });
  }

  create(shortCode: string, longUrl: string, userId: string) {
    return this.transactionHost.tx.shortUrl.create({
      data: { shortCode, longUrl, userId },
      select: { shortCode: true, longUrl: true },
    });
  }

  findByUser(userId: string, take: number, beforeId?: bigint) {
    return this.transactionHost.tx.shortUrl.findMany({
      where: { userId, id: beforeId ? { lt: beforeId } : undefined },
      orderBy: { id: 'desc' },
      take,
      select: { id: true, shortCode: true, longUrl: true, createdAt: true },
    });
  }
}
