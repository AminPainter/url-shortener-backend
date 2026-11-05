import { Controller, Headers, HttpCode, Post, Req } from '@nestjs/common';
import { GlomoWebhooksService } from '../services/glomo-webhooks.service';

// TODO: move to a generic BullMQ-based webhook pipeline that scales across partners: one ingest endpoint per partner that only verifies the signature, stores the raw event in webhook_events and enqueues it, then per-partner workers process events with retries, backoff and a dead-letter queue, instead of processing synchronously inside the HTTP request.
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
