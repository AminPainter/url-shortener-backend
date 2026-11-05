import { z } from 'zod';
import { createZodDto } from '@app/validation';

export class ConfirmCheckoutDto extends createZodDto(
  z.object({
    subscriptionId: z.string().regex(/^sub_[0-9A-Za-z]+$/),
    paymentId: z.string().regex(/^payt_[0-9A-Za-z]+$/),
    status: z.string().min(1).max(32),
    signature: z.string().regex(/^[0-9a-fA-F]{64}$/),
  }),
) {}
