import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfirmCheckoutDto } from '../dto/confirm-checkout.dto';
import { StartCheckoutDto } from '../dto/start-checkout.dto';
import { BillingService } from '../services/billing.service';

@Controller('billing')
@UseGuards(AuthGuard('jwt'))
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('checkout')
  startCheckout(
    @Body() { plan, interval }: StartCheckoutDto,
    @Req() request: { user: { userId: bigint } },
  ) {
    return this.billingService.startCheckout(
      request.user.userId,
      plan,
      interval,
    );
  }

  @Post('checkout/confirm')
  @HttpCode(200)
  confirmCheckout(
    @Body() confirmCheckoutDto: ConfirmCheckoutDto,
    @Req() request: { user: { userId: bigint } },
  ) {
    return this.billingService.confirmCheckout(
      request.user.userId,
      confirmCheckoutDto,
    );
  }

  @Post('cancel')
  @HttpCode(200)
  cancel(@Req() request: { user: { userId: bigint } }) {
    return this.billingService.cancel(request.user.userId);
  }
}
