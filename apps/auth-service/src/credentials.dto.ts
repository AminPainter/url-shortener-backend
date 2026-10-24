import { z } from 'zod';
import { createZodDto } from '@app/validation';

export class CredentialsDto extends createZodDto(
  z.object({
    email: z.email().max(254),
    password: z.string().min(8).max(72),
  }),
) {}
