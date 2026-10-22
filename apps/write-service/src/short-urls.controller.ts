import { randomInt } from 'node:crypto';
import { Body, Controller, Post } from '@nestjs/common';
import { z } from 'zod';
import { ZodValidationPipe } from '@app/validation';

const ALPHABET =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

const createShortUrlSchema = z.object({ longUrl: z.httpUrl() });

@Controller('short-urls')
export class ShortUrlsController {
  @Post()
  create(
    @Body(new ZodValidationPipe(createShortUrlSchema))
    { longUrl }: z.infer<typeof createShortUrlSchema>,
  ) {
    const shortCode = Array.from(
      { length: 7 },
      () => ALPHABET[randomInt(62)],
    ).join('');
    return { shortCode, longUrl };
  }
}
