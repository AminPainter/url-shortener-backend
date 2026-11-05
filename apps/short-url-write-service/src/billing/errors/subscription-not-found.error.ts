import { NotFoundError } from '@app/errors';

export class SubscriptionNotFoundError extends NotFoundError {
  readonly code = 'SUBSCRIPTION_NOT_FOUND';
}
