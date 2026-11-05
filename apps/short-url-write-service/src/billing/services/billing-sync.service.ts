import { Injectable } from '@nestjs/common';
import { BillingSubscriptionStatus, Prisma } from '@app/short-urls-db';
import { SubscriptionsService } from '../../subscriptions/services/subscriptions.service';
import { GlomoPayment } from '../clients/glomo-payments.client';
import { GlomoSubscription } from '../clients/glomo-subscriptions.client';
import { BillingRepository } from '../repositories/billing.repository';

interface TrackedSubscription {
  id: bigint;
  userId: string;
  plan: 'FREE' | 'PRO' | 'BUSINESS';
  interval: 'MONTH' | 'YEAR';
  status: BillingSubscriptionStatus;
  currentPeriodEnd: Date | null;
}

@Injectable()
export class BillingSyncService {
  constructor(
    private readonly billingRepository: BillingRepository,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async applySubscriptionSnapshot(
    billingSubscription: TrackedSubscription,
    glomoSubscription: GlomoSubscription,
    paidAt: Date | null = null,
  ) {
    const status = this.toStatus(
      glomoSubscription.status,
      billingSubscription.status,
    );
    const updated = await this.billingRepository.updateSubscription(
      billingSubscription.id,
      {
        status,
        currentPeriodEnd:
          this.parseDate(glomoSubscription.next_payment_date) ??
          billingSubscription.currentPeriodEnd ??
          (paidAt
            ? this.addInterval(paidAt, billingSubscription.interval)
            : null),
        cancelledAt: this.parseDate(glomoSubscription.cancelled_at),
        haltReason: glomoSubscription.halt_reason ?? Prisma.DbNull,
      },
    );
    await this.subscriptionsService.applyEntitlement(updated);
    return updated;
  }

  recordPayment(
    billingSubscriptionId: bigint,
    glomoPayment: GlomoPayment,
    sequence: 'FIRST' | 'SUBSEQUENT',
  ) {
    return this.billingRepository.savePayment({
      billingSubscriptionId,
      partnerPaymentId: glomoPayment.id,
      sequence,
      amount: glomoPayment.requested_amount,
      currency: glomoPayment.requested_currency,
      status: glomoPayment.status,
      complianceStatus: glomoPayment.compliance_status ?? null,
      paidAt: glomoPayment.paid_at ? new Date(glomoPayment.paid_at) : null,
      failureCode: glomoPayment.error_code ?? null,
      failureMessage: glomoPayment.error_description ?? null,
    });
  }

  private toStatus(glomoStatus: string, fallback: BillingSubscriptionStatus) {
    const status = glomoStatus.toUpperCase();
    return (
      Object.values(BillingSubscriptionStatus).find(
        (known) => known === status,
      ) ?? fallback
    );
  }

  private parseDate(value: string | null | undefined) {
    return value ? new Date(value) : null;
  }

  private addInterval(from: Date, interval: 'MONTH' | 'YEAR') {
    const next = new Date(from);
    if (interval === 'MONTH') next.setUTCMonth(next.getUTCMonth() + 1);
    else next.setUTCFullYear(next.getUTCFullYear() + 1);
    return next;
  }
}
