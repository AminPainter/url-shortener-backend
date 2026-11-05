import { Injectable } from '@nestjs/common';
import { isAxiosError } from 'axios';
import { GLOMO_EMAIL_TAKEN_MESSAGE } from '../constants/glomo';
import { PaymentGatewayError } from '../errors/payment-gateway.error';
import { GlomoHttpClient } from './glomo-http.client';

export interface GlomoCustomerInput {
  name: string;
  email: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode?: string;
}

@Injectable()
export class GlomoCustomersClient {
  constructor(private readonly glomoHttpClient: GlomoHttpClient) {}

  async ensure(customer: GlomoCustomerInput) {
    try {
      const created = await this.glomoHttpClient.request<{ id: string }>(
        'POST',
        '/customer',
        { ...customer, customer_type: 'individual' },
      );
      return created.id;
    } catch (error) {
      if (!this.isEmailTaken(error)) throw error;
      const existing = await this.glomoHttpClient.request<{
        data: { id: string }[];
      }>('GET', '/customer', undefined, { email_address: customer.email });
      const [existingCustomer] = existing.data;
      if (!existingCustomer) throw error;
      return existingCustomer.id;
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
