import { NotFoundError } from '@app/errors';

export class ShortUrlNotFoundError extends NotFoundError {
  readonly code = 'SHORT_URL_NOT_FOUND';
}
