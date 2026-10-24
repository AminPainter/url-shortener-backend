import { Injectable } from '@nestjs/common';
import { ShortUrlsDbService } from '@app/short-urls-db';

@Injectable()
export class ShortUrlsRepository {
  constructor(private readonly prisma: ShortUrlsDbService) {}

  async findLongUrl(shortCode: string) {
    const shortUrl = await this.prisma.shortUrl.findUnique({
      where: { shortCode },
      select: { longUrl: true },
    });
    return shortUrl?.longUrl ?? null;
  }
}
