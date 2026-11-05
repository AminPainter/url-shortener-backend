export const PLANS = [
  { plan: 'FREE', name: 'Free', linkLimit: 10, prices: null },
  {
    plan: 'PRO',
    name: 'Pro',
    linkLimit: 100,
    prices: { currency: 'USD', MONTH: 500, YEAR: 5000 },
  },
  {
    plan: 'BUSINESS',
    name: 'Business',
    linkLimit: 1000,
    prices: { currency: 'USD', MONTH: 2000, YEAR: 20000 },
  },
] as const;
