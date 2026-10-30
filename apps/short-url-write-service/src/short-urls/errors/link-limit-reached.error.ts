import { ForbiddenError } from '@app/errors';

export class LinkLimitReachedError extends ForbiddenError {
  readonly code = 'LINK_LIMIT_REACHED';
}
