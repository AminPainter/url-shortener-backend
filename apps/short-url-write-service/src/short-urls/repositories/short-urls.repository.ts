import { Injectable } from '@nestjs/common';
import { ShortUrlsDbService } from '@app/short-urls-db';

@Injectable()
export class ShortUrlsRepository {
  constructor(private readonly prisma: ShortUrlsDbService) {}

  create(shortCode: string, longUrl: string, userId: bigint) {
    return this.prisma.shortUrl.create({
      data: { shortCode, longUrl, userId },
      select: { shortCode: true, longUrl: true },
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
