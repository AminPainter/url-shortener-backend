import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
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
    @Req() request: { userId: bigint },
  ) {
    return this.billingService.startCheckout(request.userId, plan, interval);
  }

  @Post('checkout/confirm')
  @HttpCode(200)
  confirmCheckout(
    @Body() confirmCheckoutDto: ConfirmCheckoutDto,
    @Req() request: { userId: bigint },
  ) {
    return this.billingService.confirmCheckout(
      request.userId,
      confirmCheckoutDto,
    );
  }

  @Post('cancel')
  @HttpCode(200)
  cancel(@Req() request: { userId: bigint }) {
    return this.billingService.cancel(request.userId);
  }
}
