import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import {
  BillingSubscriptionStatus,
  Prisma,
  ShortUrlsTransactionalAdapter,
} from '@app/short-urls-db';
import {
  CANCELLABLE_SUBSCRIPTION_STATUSES,
  LIVE_SUBSCRIPTION_STATUSES,
} from '../constants/billing-statuses';
import { AlreadySubscribedError } from '../errors/already-subscribed.error';
import { SubscriptionNotFoundError } from '../errors/subscription-not-found.error';

const PARTNER = 'GLOMO';

type Plan = 'PRO' | 'BUSINESS';
type Interval = 'MONTH' | 'YEAR';

const SUBSCRIPTION_FIELDS = {
  id: true,
  userId: true,
  partnerSubscriptionId: true,
  plan: true,
  interval: true,
  status: true,
  currentPeriodEnd: true,
} as const;

export interface SubscriptionChanges {
  status: BillingSubscriptionStatus;
  currentPeriodEnd: Date | null;
  cancelledAt: Date | null;
  haltReason: Prisma.InputJsonValue | typeof Prisma.DbNull;
}

export interface PaymentRecord {
  billingSubscriptionId: bigint;
  partnerPaymentId: string;
  sequence: 'FIRST' | 'SUBSEQUENT';
  amount: number;
  currency: string;
  status: string;
  complianceStatus: string | null;
  paidAt: Date | null;
  failureCode: string | null;
  failureMessage: string | null;
}

@Injectable()
export class BillingRepository {
  constructor(
    private readonly transactionHost: TransactionHost<ShortUrlsTransactionalAdapter>,
  ) {}

  async findPartnerCustomerId(userId: string) {
    const billingCustomer =
      await this.transactionHost.tx.billingCustomer.findUnique({
        where: { userId_partner: { userId, partner: PARTNER } },
        select: { partnerCustomerId: true },
      });
    return billingCustomer?.partnerCustomerId ?? null;
  }

  saveCustomer(userId: string, partnerCustomerId: string) {
    return this.transactionHost.tx.billingCustomer.upsert({
      where: { userId_partner: { userId, partner: PARTNER } },
      create: { userId, partner: PARTNER, partnerCustomerId },
      update: { partnerCustomerId },
    });
  }

  findLiveSubscription(userId: string) {
    return this.transactionHost.tx.billingSubscription.findFirst({
      where: { userId, status: { in: LIVE_SUBSCRIPTION_STATUSES } },
      select: SUBSCRIPTION_FIELDS,
    });
  }

  findPendingCheckout(
    userId: string,
    plan: Plan,
    interval: Interval,
    createdAfter: Date,
  ) {
    return this.transactionHost.tx.billingSubscription.findFirst({
      where: {
        userId,
        plan,
        interval,
        status: BillingSubscriptionStatus.CREATED,
        createdAt: { gte: createdAfter },
      },
      orderBy: { id: 'desc' },
      select: SUBSCRIPTION_FIELDS,
    });
  }

  createSubscription(subscription: {
    userId: string;
    partnerSubscriptionId: string;
    plan: Plan;
    interval: Interval;
    amount: number;
    currency: string;
  }) {
    return this.transactionHost.tx.billingSubscription.create({
      data: {
        ...subscription,
        partner: PARTNER,
        status: BillingSubscriptionStatus.CREATED,
      },
      select: SUBSCRIPTION_FIELDS,
    });
  }

  async findUserSubscription(userId: string, partnerSubscriptionId: string) {
    const billingSubscription =
      await this.transactionHost.tx.billingSubscription.findFirst({
        where: { userId, partner: PARTNER, partnerSubscriptionId },
        select: SUBSCRIPTION_FIELDS,
      });
    if (!billingSubscription) throw new SubscriptionNotFoundError();
    return billingSubscription;
  }

  async findCancellableSubscription(userId: string) {
    const billingSubscription =
      await this.transactionHost.tx.billingSubscription.findFirst({
        where: {
          userId,
          status: { in: CANCELLABLE_SUBSCRIPTION_STATUSES },
        },
        select: SUBSCRIPTION_FIELDS,
      });
    if (!billingSubscription) throw new SubscriptionNotFoundError();
    return billingSubscription;
  }

  findByPartnerSubscriptionId(partnerSubscriptionId: string) {
    return this.transactionHost.tx.billingSubscription.findUnique({
      where: {
        partner_partnerSubscriptionId: {
          partner: PARTNER,
          partnerSubscriptionId,
        },
      },
      select: SUBSCRIPTION_FIELDS,
    });
  }

  async updateSubscription(id: bigint, changes: SubscriptionChanges) {
    try {
      return await this.transactionHost.tx.billingSubscription.update({
        where: { id },
        data: changes,
        select: SUBSCRIPTION_FIELDS,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new AlreadySubscribedError();
      }
      throw error;
    }
  }

  savePayment({
    billingSubscriptionId,
    partnerPaymentId,
    sequence,
    ...state
  }: PaymentRecord) {
    return this.transactionHost.tx.billingPayment.upsert({
      where: {
        partner_partnerPaymentId: { partner: PARTNER, partnerPaymentId },
      },
      create: {
        billingSubscriptionId,
        partner: PARTNER,
        partnerPaymentId,
        sequence,
        ...state,
      },
      update: state,
    });
  }
}
