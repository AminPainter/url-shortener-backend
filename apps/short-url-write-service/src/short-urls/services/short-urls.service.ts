import { randomInt } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { ShortUrlsTransactionalAdapter } from '@app/short-urls-db';
import { SubscriptionsService } from '../../subscriptions/services/subscriptions.service';
import { LinkLimitReachedError } from '../errors/link-limit-reached.error';
import { ShortUrlsRepository } from '../repositories/short-urls.repository';
import { UserLinkLock } from '../utils/user-link-lock.util';

const ALPHABET =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

@Injectable()
export class ShortUrlsService {
  constructor(
    private readonly shortUrlsRepository: ShortUrlsRepository,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly transactionHost: TransactionHost<ShortUrlsTransactionalAdapter>,
    private readonly userLinkLock: UserLinkLock,
  ) {}

  async create(longUrl: string, userId: bigint) {
    const { linkLimit } = await this.subscriptionsService.getPlan(userId);
    const shortCode = Array.from(
      { length: 7 },
      () => ALPHABET[randomInt(62)],
    ).join('');
    return this.userLinkLock.withLock(userId, () =>
      this.transactionHost.withTransaction(async () => {
        const linkCount = await this.shortUrlsRepository.countByUser(userId);
        if (linkCount >= linkLimit) throw new LinkLimitReachedError();
        return this.shortUrlsRepository.create(shortCode, longUrl, userId);
      }),
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
