import { randomInt } from 'node:crypto';
import { Body, Controller, Post } from '@nestjs/common';
import { PrismaService } from '@app/prisma';
import { CreateShortUrlDto } from './create-short-url.dto';

const ALPHABET =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

@Controller('short-urls')
export class ShortUrlsController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  create(@Body() { longUrl }: CreateShortUrlDto) {
    const shortCode = Array.from(
      { length: 7 },
      () => ALPHABET[randomInt(62)],
    ).join('');
    return this.prisma.shortUrl.create({
      data: { shortCode, longUrl },
      select: { shortCode: true, longUrl: true },
    });
  }
}
