import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { isAxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { GLOMO_EMAIL_TAKEN_MESSAGE } from '../constants/glomo';
import { PaymentGatewayError } from '../errors/payment-gateway.error';

export interface GlomoCustomerInput {
  name: string;
  email: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode?: string;
}

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

export type GlomoPaymentStatus =
  'in_progress' | 'action_required' | 'under_review' | 'success' | 'failed';

export type GlomoComplianceStatus =
  'action_required' | 'under_review' | 'approved' | 'rejected';

export interface GlomoPayment {
  id: string;
  subscription_id: string | null;
  status: GlomoPaymentStatus;
  compliance_status?: GlomoComplianceStatus | null;
  requested_amount: number;
  requested_currency: string;
  paid_at: string | null;
  error_code?: string;
  error_description?: string;
  'auto_debit?'?: boolean | null;
}

@Injectable()
export class GlomoClient {
  private readonly logger = new Logger(GlomoClient.name);

  constructor(private readonly httpService: HttpService) {}

  async ensureCustomer(customer: GlomoCustomerInput) {
    try {
      const created = await this.request<{ id: string }>('POST', '/customer', {
        ...customer,
        customer_type: 'individual',
      });
      return created.id;
    } catch (error) {
      if (!this.isEmailTaken(error)) throw error;
      const existing = await this.request<{ data: { id: string }[] }>(
        'GET',
        '/customer',
        undefined,
        { email_address: customer.email },
      );
      const [existingCustomer] = existing.data;
      if (!existingCustomer) throw error;
      return existingCustomer.id;
    }
  }

  createSubscription(subscription: GlomoSubscriptionInput) {
    return this.request<GlomoSubscription>('POST', '/subscriptions', {
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
    });
  }

  getSubscription(subscriptionId: string) {
    return this.request<GlomoSubscription>(
      'GET',
      `/subscriptions/${encodeURIComponent(subscriptionId)}`,
    );
  }

  async cancelSubscription(subscriptionId: string) {
    await this.request(
      'PATCH',
      `/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`,
    );
  }

  getPayment(paymentId: string) {
    return this.request<GlomoPayment>(
      'GET',
      `/payment/${encodeURIComponent(paymentId)}`,
    );
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'PATCH',
    path: string,
    data?: object,
    params?: Record<string, string>,
  ) {
    try {
      const response = await firstValueFrom(
        this.httpService.request<T>({ method, url: path, data, params }),
      );
      return response.data;
    } catch (error) {
      const status = isAxiosError(error) ? error.response?.status : undefined;
      this.logger.warn({ method, path, status }, 'Glomo request failed');
      throw new PaymentGatewayError(undefined, { cause: error });
    }
  }

  private isEmailTaken(error: unknown) {
    const cause = error instanceof PaymentGatewayError ? error.cause : error;
    return (
      isAxiosError<{ message?: string }>(cause) &&
      cause.response?.status === 400 &&
      Boolean(cause.response.data?.message?.includes(GLOMO_EMAIL_TAKEN_MESSAGE))
    );
  }
}
