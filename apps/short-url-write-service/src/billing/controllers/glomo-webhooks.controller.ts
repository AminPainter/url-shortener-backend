import { Controller, Headers, HttpCode, Post, Req } from '@nestjs/common';
import { GlomoWebhooksService } from '../services/glomo-webhooks.service';

@Controller('webhooks/glomo')
export class GlomoWebhooksController {
  constructor(private readonly glomoWebhooksService: GlomoWebhooksService) {}

  @Post()
  @HttpCode(200)
  async receive(
    @Req() request: { rawBody?: Buffer },
    @Headers('x-glomopay-signature') signature: string | undefined,
  ) {
    await this.glomoWebhooksService.handle(request.rawBody, signature);
    return { received: true };
  }
}
