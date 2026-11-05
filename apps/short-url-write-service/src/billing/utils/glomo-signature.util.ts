import { createHmac, timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GlomoSignature {
  constructor(private readonly configService: ConfigService) {}

  isValidCheckout(
    subscriptionId: string,
    paymentId: string,
    status: string,
    signature: string,
  ) {
    return this.matches(
      this.configService.getOrThrow<string>('GLOMO_SECRET_KEY'),
      `${subscriptionId}|${paymentId}|${status}`,
      signature,
    );
  }

  isValidWebhook(rawBody: Buffer, signature: string | undefined) {
    return this.matches(
      this.configService.getOrThrow<string>('GLOMO_WEBHOOK_SECRET'),
      rawBody,
      signature ?? '',
    );
  }

  private matches(secret: string, payload: string | Buffer, signature: string) {
    const expected = Buffer.from(
      createHmac('sha256', secret).update(payload).digest('hex'),
    );
    const received = Buffer.from(signature.toLowerCase());
    return (
      expected.length === received.length && timingSafeEqual(expected, received)
    );
  }
}
