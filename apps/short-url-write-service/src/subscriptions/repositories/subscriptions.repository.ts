import { Injectable } from '@nestjs/common';
import { TransactionHost } from '@nestjs-cls/transactional';
import { ShortUrlsTransactionalAdapter } from '@app/short-urls-db';

type Plan = 'FREE' | 'PRO' | 'BUSINESS';

@Injectable()
export class SubscriptionsRepository {
  constructor(
    private readonly transactionHost: TransactionHost<ShortUrlsTransactionalAdapter>,
  ) {}

  findPlan(userId: bigint) {
    return this.transactionHost.tx.subscriptionPlan.findUnique({
      where: { userId },
      select: {
        plan: true,
        validUntil: true,
        billingSubscription: {
          select: {
            status: true,
            interval: true,
            currentPeriodEnd: true,
            cancelledAt: true,
          },
        },
      },
    });
  }

  countLinks(userId: bigint) {
    return this.transactionHost.tx.shortUrl.count({ where: { userId } });
  }

  grantPlan(userId: bigint, plan: Plan, billingSubscriptionId: bigint) {
    return this.transactionHost.tx.subscriptionPlan.upsert({
      where: { userId },
      create: { userId, plan, billingSubscriptionId, validUntil: null },
      update: { plan, billingSubscriptionId, validUntil: null },
    });
  }

  limitPlanValidity(
    userId: bigint,
    billingSubscriptionId: bigint,
    validUntil: Date,
  ) {
    return this.transactionHost.tx.subscriptionPlan.updateMany({
      where: { userId, billingSubscriptionId },
      data: { validUntil },
    });
  }
}
