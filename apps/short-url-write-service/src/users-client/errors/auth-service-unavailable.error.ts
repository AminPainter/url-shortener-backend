import { ServiceUnavailableError } from '@app/errors';

export class AuthServiceUnavailableError extends ServiceUnavailableError {
  readonly code = 'AUTH_SERVICE_UNAVAILABLE';
}
