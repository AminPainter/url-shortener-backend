import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';
import { z } from 'zod';

export interface ZodDto<T extends z.ZodType = z.ZodType> {
  new (): z.infer<T>;
  schema: T;
}

// Wraps a schema in a class so it survives as the parameter's design:type
// metadata, which is how the global pipe finds it.
export function createZodDto<T extends z.ZodType>(schema: T): ZodDto<T> {
  class Dto {
    static schema = schema;
  }
  return Dto as unknown as ZodDto<T>;
}

function isZodDto(metatype: unknown): metatype is ZodDto {
  return (
    typeof metatype === 'function' &&
    (metatype as Partial<ZodDto>).schema instanceof z.ZodType
  );
}

// Registered globally via APP_PIPE. Parameters whose type isn't a ZodDto
// (primitives, plain types) pass through untouched.
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  transform(value: unknown, { metatype }: ArgumentMetadata) {
    if (!isZodDto(metatype)) return value;
    const result = metatype.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: z.flattenError(result.error).fieldErrors,
      });
    }
    return result.data;
  }
}
