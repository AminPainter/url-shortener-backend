import { randomInt } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ShortUrlsRepository } from '../repositories/short-urls.repository';

const ALPHABET =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

@Injectable()
export class ShortUrlsService {
  constructor(private readonly shortUrlsRepository: ShortUrlsRepository) {}

  create(longUrl: string, userId: bigint) {
    const shortCode = Array.from(
      { length: 7 },
      () => ALPHABET[randomInt(62)],
    ).join('');
    return this.shortUrlsRepository.create(shortCode, longUrl, userId);
  }

  async list(userId: bigint, limit: number, cursor?: bigint) {
    const shortUrls = await this.shortUrlsRepository.findByUser(
      userId,
      limit + 1,
      cursor,
    );
    const page = shortUrls.slice(0, limit);
    return {
      items: page.map(({ shortCode, longUrl, createdAt }) => ({
        shortCode,
        longUrl,
        createdAt,
      })),
      nextCursor:
        shortUrls.length > limit ? String(page[page.length - 1].id) : null,
    };
  }
}
