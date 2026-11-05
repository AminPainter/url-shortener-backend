import { z } from 'zod';
import { createZodDto } from '@app/validation';

export class StartCheckoutDto extends createZodDto(
  z.object({
    plan: z.enum(['PRO', 'BUSINESS']),
    interval: z.enum(['MONTH', 'YEAR']),
  }),
) {}
