import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { PrismaService } from '@app/prisma';

const LONG_URL_CACHE_TTL_MS = 86_400_000;

@Injectable()
export class RedirectService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async resolve(shortCode: string): Promise<string | null> {
    const cachedLongUrl = await this.cache.get<string>(shortCode);
    if (cachedLongUrl) return cachedLongUrl;

    const shortUrl = await this.prisma.shortUrl.findUnique({
      where: { shortCode },
      select: { longUrl: true },
    });
    if (!shortUrl) return null;

    await this.cache.set(shortCode, shortUrl.longUrl, LONG_URL_CACHE_TTL_MS);
    return shortUrl.longUrl;
  }
}
