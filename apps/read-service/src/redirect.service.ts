import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { ShortUrlNotFoundError } from './short-url-not-found.error';
import { ShortUrlsRepository } from './short-urls.repository';

const LONG_URL_CACHE_TTL_MS = 86_400_000;

@Injectable()
export class RedirectService {
  constructor(
    private readonly shortUrlsRepository: ShortUrlsRepository,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async resolve(shortCode: string): Promise<string> {
    const cachedLongUrl = await this.cache.get<string>(shortCode);
    if (cachedLongUrl) return cachedLongUrl;

    const longUrl = await this.shortUrlsRepository.findLongUrl(shortCode);
    if (!longUrl) throw new ShortUrlNotFoundError();

    await this.cache.set(shortCode, longUrl, LONG_URL_CACHE_TTL_MS);
    return longUrl;
  }
}
