import { z } from 'zod';

export const createShortUrlSchema = z.object({ longUrl: z.httpUrl() });

export type CreateShortUrlDto = z.infer<typeof createShortUrlSchema>;
