import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/prisma';

@Injectable()
export class ShortUrlsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findLongUrl(shortCode: string) {
    const shortUrl = await this.prisma.shortUrl.findUnique({
      where: { shortCode },
      select: { longUrl: true },
    });
    return shortUrl?.longUrl ?? null;
  }
}
