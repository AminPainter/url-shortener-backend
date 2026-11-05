import { NotFoundError } from '@app/errors';

export class UserNotFoundError extends NotFoundError {
  readonly code = 'USER_NOT_FOUND';
}
