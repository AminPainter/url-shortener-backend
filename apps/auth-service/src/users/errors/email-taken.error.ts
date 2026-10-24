import { ConflictError } from '@app/errors';

export class EmailTakenError extends ConflictError {
  readonly code = 'EMAIL_TAKEN';
}
