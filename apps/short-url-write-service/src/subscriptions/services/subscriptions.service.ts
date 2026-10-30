import { Injectable } from '@nestjs/common';
import { PLANS } from '../constants/plans';
import { SubscriptionsRepository } from '../repositories/subscriptions.repository';

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly subscriptionsRepository: SubscriptionsRepository,
  ) {}

  listPlans() {
    return { items: PLANS };
  }

  async getPlan(userId: bigint) {
    const plan =
      (await this.subscriptionsRepository.findPlan(userId)) ?? 'FREE';
    return PLANS.find((planDetails) => planDetails.plan === plan) ?? PLANS[0];
  }

  async getSubscription(userId: bigint) {
    const [planDetails, linkCount] = await Promise.all([
      this.getPlan(userId),
      this.subscriptionsRepository.countLinks(userId),
    ]);
    return { ...planDetails, linkCount };
  }
}
