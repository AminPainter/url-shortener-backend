import { ConflictError } from '@app/errors';

export class AlreadySubscribedError extends ConflictError {
  readonly code = 'ALREADY_SUBSCRIBED';
}
