import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const UserId = createParamDecorator(
  (_data: unknown, context: ExecutionContext): bigint =>
    context.switchToHttp().getRequest<{ userId: bigint }>().userId,
);
