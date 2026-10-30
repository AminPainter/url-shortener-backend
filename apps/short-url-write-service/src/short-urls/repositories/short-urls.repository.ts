import { Injectable } from '@nestjs/common';
import { ShortUrlsDbService } from '@app/short-urls-db';
import { LinkLimitReachedError } from '../errors/link-limit-reached.error';

@Injectable()
export class ShortUrlsRepository {
  constructor(private readonly prisma: ShortUrlsDbService) {}

  createWithinLimit(
    shortCode: string,
    longUrl: string,
    userId: bigint,
    linkLimit: number,
  ) {
    return this.prisma.$transaction(async (transaction) => {
      await transaction.$executeRaw`SELECT pg_advisory_xact_lock(${userId})`;
      const linkCount = await transaction.shortUrl.count({ where: { userId } });
      if (linkCount >= linkLimit) throw new LinkLimitReachedError();
      return transaction.shortUrl.create({
        data: { shortCode, longUrl, userId },
        select: { shortCode: true, longUrl: true },
      });
    });
  }

  findByUser(userId: bigint, take: number, beforeId?: bigint) {
    return this.prisma.shortUrl.findMany({
      where: { userId, id: beforeId ? { lt: beforeId } : undefined },
      orderBy: { id: 'desc' },
      take,
      select: { id: true, shortCode: true, longUrl: true, createdAt: true },
    });
  }
}
