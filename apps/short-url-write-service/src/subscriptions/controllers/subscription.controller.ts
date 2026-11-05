import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, UserId } from '@app/jwt-auth';
import { SubscriptionsService } from '../services/subscriptions.service';

@Controller('subscription')
@UseGuards(JwtAuthGuard)
export class SubscriptionController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get()
  get(@UserId() userId: string) {
    return this.subscriptionsService.getSubscription(userId);
  }
}
