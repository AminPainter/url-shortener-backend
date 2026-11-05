import { Injectable } from '@nestjs/common';
import { GlomoHttpClient } from './glomo-http.client';

export interface GlomoSubscriptionInput {
  customerId: string;
  productName: string;
  productDescription: string;
  planName: string;
  amount: number;
  currency: string;
  intervalType: 'month' | 'year';
  billingCycles: number;
  startDate: string;
  expiresAt: string;
  notes: Record<string, string>;
}

export interface GlomoSubscription {
  id: string;
  customer_id: string;
  status: string;
  amount: number;
  currency: string;
  next_payment_date: string | null;
  cancelled_at: string | null;
  halt_reason?: { code: string; description: string } | null;
}

@Injectable()
export class GlomoSubscriptionsClient {
  constructor(private readonly glomoHttpClient: GlomoHttpClient) {}

  create(subscription: GlomoSubscriptionInput) {
    return this.glomoHttpClient.request<GlomoSubscription>(
      'POST',
      '/subscriptions',
      {
        customer_id: subscription.customerId,
        product_name: subscription.productName,
        product_description: subscription.productDescription,
        plan_name: subscription.planName,
        amount: subscription.amount,
        currency: subscription.currency,
        interval_type: subscription.intervalType,
        interval_count: 1,
        billing_cycles: subscription.billingCycles,
        start_date: subscription.startDate,
        expires_at: subscription.expiresAt,
        notify_customer: true,
        starts_with_first_payment: true,
        notes: subscription.notes,
      },
    );
  }

  get(subscriptionId: string) {
    return this.glomoHttpClient.request<GlomoSubscription>(
      'GET',
      `/subscriptions/${encodeURIComponent(subscriptionId)}`,
    );
  }

  async cancel(subscriptionId: string) {
    await this.glomoHttpClient.request(
      'PATCH',
      `/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`,
    );
  }
}
