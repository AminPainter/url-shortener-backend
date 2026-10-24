import { z } from 'zod';
import { createZodDto } from '@app/validation';

export class CreateShortUrlDto extends createZodDto(
  z.object({ longUrl: z.httpUrl() }),
) {}
