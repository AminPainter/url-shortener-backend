import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/prisma';

@Injectable()
export class ShortUrlsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(shortCode: string, longUrl: string, userId: bigint) {
    return this.prisma.shortUrl.create({
      data: { shortCode, longUrl, userId },
      select: { shortCode: true, longUrl: true },
    });
  }
}
