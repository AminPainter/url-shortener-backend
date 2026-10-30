import { randomInt } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { SubscriptionsService } from '../../subscriptions/services/subscriptions.service';
import { ShortUrlsRepository } from '../repositories/short-urls.repository';

const ALPHABET =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

@Injectable()
export class ShortUrlsService {
  constructor(
    private readonly shortUrlsRepository: ShortUrlsRepository,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async create(longUrl: string, userId: bigint) {
    const { linkLimit } = await this.subscriptionsService.getPlan(userId);
    const shortCode = Array.from(
      { length: 7 },
      () => ALPHABET[randomInt(62)],
    ).join('');
    return this.shortUrlsRepository.createWithinLimit(
      shortCode,
      longUrl,
      userId,
      linkLimit,
    );
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
