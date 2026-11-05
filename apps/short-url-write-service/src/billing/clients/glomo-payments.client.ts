import { Injectable } from '@nestjs/common';
import { GlomoHttpClient } from './glomo-http.client';

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
export class GlomoPaymentsClient {
  constructor(private readonly glomoHttpClient: GlomoHttpClient) {}

  get(paymentId: string) {
    return this.glomoHttpClient.request<GlomoPayment>(
      'GET',
      `/payment/${encodeURIComponent(paymentId)}`,
    );
  }
}
