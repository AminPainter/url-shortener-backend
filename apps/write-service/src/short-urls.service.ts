import { randomInt } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ShortUrlsRepository } from './short-urls.repository';

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
}
