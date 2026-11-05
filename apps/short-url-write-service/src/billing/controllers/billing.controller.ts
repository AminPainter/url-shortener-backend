import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, UserId } from '@app/jwt-auth';
import { ConfirmCheckoutDto } from '../dto/confirm-checkout.dto';
import { StartCheckoutDto } from '../dto/start-checkout.dto';
import { BillingService } from '../services/billing.service';

@Controller('billing')
@UseGuards(JwtAuthGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('checkout')
  startCheckout(
    @Body() { plan, interval }: StartCheckoutDto,
    @UserId() userId: string,
  ) {
    return this.billingService.startCheckout(userId, plan, interval);
  }

  @Post('checkout/confirm')
  @HttpCode(200)
  confirmCheckout(
    @Body() confirmCheckoutDto: ConfirmCheckoutDto,
    @UserId() userId: string,
  ) {
    return this.billingService.confirmCheckout(userId, confirmCheckoutDto);
  }

  @Post('cancel')
  @HttpCode(200)
  cancel(@UserId() userId: string) {
    return this.billingService.cancel(userId);
  }
}
