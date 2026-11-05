import { z } from 'zod';
import { createZodDto } from '@app/validation';

const addressText = z.string().trim().min(1).max(128);

export class UpdateProfileDto extends createZodDto(
  z.object({
    name: z.string().trim().min(1).max(128),
    address: z.object({
      addressLine1: addressText,
      addressLine2: addressText.optional(),
      city: addressText,
      state: addressText,
      country: z
        .string()
        .trim()
        .toUpperCase()
        .regex(/^[A-Z]{3}$/),
      pincode: z.string().trim().min(1).max(16).optional(),
    }),
  }),
) {}
