import { BillingSubscriptionStatus } from '@app/short-urls-db';

export const CANCELLABLE_SUBSCRIPTION_STATUSES: BillingSubscriptionStatus[] = [
  BillingSubscriptionStatus.AUTHORIZED,
  BillingSubscriptionStatus.ACTIVE,
  BillingSubscriptionStatus.PAUSED,
  BillingSubscriptionStatus.HALTED,
];

export const LIVE_SUBSCRIPTION_STATUSES: BillingSubscriptionStatus[] = [
  ...CANCELLABLE_SUBSCRIPTION_STATUSES,
  BillingSubscriptionStatus.ACTION_REQUIRED,
  BillingSubscriptionStatus.UNDER_REVIEW,
];
