import { z } from 'zod';
import { createZodDto } from '@app/validation';

export class FindUserDto extends createZodDto(
  z.object({ id: z.coerce.bigint().positive() }),
) {}
