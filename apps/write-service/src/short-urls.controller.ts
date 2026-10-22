import { randomInt } from 'node:crypto';
import { Body, Controller, Post } from '@nestjs/common';
import { ZodValidationPipe } from '@app/validation';
import { createShortUrlSchema, type CreateShortUrlDto } from './create-short-url.dto';

const ALPHABET =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

@Controller('short-urls')
export class ShortUrlsController {
  @Post()
  create(
    @Body(new ZodValidationPipe(createShortUrlSchema))
    { longUrl }: CreateShortUrlDto,
  ) {
    const shortCode = Array.from(
      { length: 7 },
      () => ALPHABET[randomInt(62)],
    ).join('');
    return { shortCode, longUrl };
  }
}
