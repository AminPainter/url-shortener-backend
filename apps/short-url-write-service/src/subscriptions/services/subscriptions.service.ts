import { Injectable } from '@nestjs/common';
import { BillingSubscriptionStatus } from '@app/short-urls-db';
import { PLANS } from '../constants/plans';
import { SubscriptionsRepository } from '../repositories/subscriptions.repository';

type Plan = 'FREE' | 'PRO' | 'BUSINESS';

export interface EntitlementSource {
  id: bigint;
  userId: string;
  plan: Plan;
  status: BillingSubscriptionStatus;
  currentPeriodEnd: Date | null;
}

const GRANTING_STATUSES = new Set<BillingSubscriptionStatus>([
  BillingSubscriptionStatus.ACTIVE,
  BillingSubscriptionStatus.AUTHORIZED,
]);
const GRACE_STATUSES = new Set<BillingSubscriptionStatus>([
  BillingSubscriptionStatus.CANCELLED,
  BillingSubscriptionStatus.HALTED,
  BillingSubscriptionStatus.PAUSED,
]);
const ENDED_STATUSES = new Set<BillingSubscriptionStatus>([
  BillingSubscriptionStatus.EXPIRED,
  BillingSubscriptionStatus.FAILED,
  BillingSubscriptionStatus.COMPLETED,
]);

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly subscriptionsRepository: SubscriptionsRepository,
  ) {}

  listPlans() {
    return { items: PLANS };
  }

  async getPlan(userId: string) {
    const subscriptionPlan =
      await this.subscriptionsRepository.findPlan(userId);
    return this.planDetails(this.effectivePlan(subscriptionPlan));
  }

  async getSubscription(userId: string) {
    const [subscriptionPlan, linkCount] = await Promise.all([
      this.subscriptionsRepository.findPlan(userId),
      this.subscriptionsRepository.countLinks(userId),
    ]);
    const plan = this.effectivePlan(subscriptionPlan);
    const billingSubscription =
      plan === 'FREE' ? null : subscriptionPlan?.billingSubscription;
    return {
      ...this.planDetails(plan),
      linkCount,
      billing: billingSubscription
        ? {
            status: billingSubscription.status,
            interval: billingSubscription.interval,
            currentPeriodEnd: billingSubscription.currentPeriodEnd,
            cancelledAt: billingSubscription.cancelledAt,
            validUntil: subscriptionPlan?.validUntil ?? null,
          }
        : null,
    };
  }

  async applyEntitlement(source: EntitlementSource) {
    if (GRANTING_STATUSES.has(source.status)) {
      await this.subscriptionsRepository.grantPlan(
        source.userId,
        source.plan,
        source.id,
      );
      return;
    }
    if (
      GRACE_STATUSES.has(source.status) ||
      ENDED_STATUSES.has(source.status)
    ) {
      const now = new Date();
      const validUntil =
        GRACE_STATUSES.has(source.status) &&
        source.currentPeriodEnd &&
        source.currentPeriodEnd > now
          ? source.currentPeriodEnd
          : now;
      await this.subscriptionsRepository.limitPlanValidity(
        source.userId,
        source.id,
        validUntil,
      );
    }
  }

  private effectivePlan(
    subscriptionPlan: { plan: Plan; validUntil: Date | null } | null,
  ): Plan {
    if (!subscriptionPlan) return 'FREE';
    if (
      subscriptionPlan.validUntil &&
      subscriptionPlan.validUntil <= new Date()
    )
      return 'FREE';
    return subscriptionPlan.plan;
  }

  private planDetails(plan: Plan) {
    return PLANS.find((planDetails) => planDetails.plan === plan) ?? PLANS[0];
  }
}
