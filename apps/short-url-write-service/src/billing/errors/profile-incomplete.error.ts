import { UnprocessableError } from '@app/errors';

export class ProfileIncompleteError extends UnprocessableError {
  readonly code = 'PROFILE_INCOMPLETE';
}
