import { z } from 'zod';
import { createZodDto } from '@app/validation';

export class ListShortUrlsDto extends createZodDto(
  z.object({
    cursor: z.coerce.bigint().positive().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
) {}
