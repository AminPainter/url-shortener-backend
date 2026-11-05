export const GLOMO_HTTP_TIMEOUT_MS = 10_000;

export const GLOMO_PRODUCT_NAMES = {
  PRO: 'Cut It Short Pro',
  BUSINESS: 'Cut It Short Business',
} as const;

export const GLOMO_PRODUCT_DESCRIPTION =
  'Cut It Short URL shortener subscription';

export const GLOMO_INTERVAL_TYPES = { MONTH: 'month', YEAR: 'year' } as const;

export const GLOMO_MAX_BILLING_CYCLES = { MONTH: 360, YEAR: 30 } as const;

export const GLOMO_EMAIL_TAKEN_MESSAGE = 'Email has already been taken';
