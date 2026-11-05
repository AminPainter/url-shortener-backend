import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SubscriptionsService } from '../services/subscriptions.service';

@Controller('subscription')
@UseGuards(JwtAuthGuard)
export class SubscriptionController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get()
  get(@Req() request: { userId: bigint }) {
    return this.subscriptionsService.getSubscription(request.userId);
  }
}
