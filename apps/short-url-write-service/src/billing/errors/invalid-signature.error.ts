import { UnauthorizedError } from '@app/errors';

export class InvalidSignatureError extends UnauthorizedError {
  readonly code = 'INVALID_SIGNATURE';
}
