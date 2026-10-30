import { Injectable } from '@nestjs/common';
import { ShortUrlsDbService } from '@app/short-urls-db';

@Injectable()
export class SubscriptionsRepository {
  constructor(private readonly prisma: ShortUrlsDbService) {}

  async findPlan(userId: bigint) {
    const subscriptionPlan = await this.prisma.subscriptionPlan.findUnique({
      where: { userId },
      select: { plan: true },
    });
    return subscriptionPlan?.plan ?? null;
  }

  countLinks(userId: bigint) {
    return this.prisma.shortUrl.count({ where: { userId } });
  }
}
