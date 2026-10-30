import { Controller, Get } from '@nestjs/common';
import { SubscriptionsService } from '../services/subscriptions.service';

@Controller('plans')
export class PlansController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get()
  list() {
    return this.subscriptionsService.listPlans();
  }
}
