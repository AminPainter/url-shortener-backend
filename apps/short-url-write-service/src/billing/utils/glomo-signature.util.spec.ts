import { createHmac } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { GlomoSignature } from './glomo-signature.util';

const DOCS_WEBHOOK_SECRET = 'whsec_2f1c9b7a4d6e8031';
const DOCS_WEBHOOK_BODY =
  '{"data":{"amount":250000,"beneficiary":{"country":"DEU","name":"Acme GmbH"},"created_at":"2026-09-09T07:00:09Z","currency":"USD","id":"payout_6a8fd80eo6coZ","status":"success"},"entity_type":"payout","event_type":"success"}';
const DOCS_WEBHOOK_SIGNATURE =
  'd5b5a68b9729f41c4a46f1e94c750bf10fb32f345a5467cbfec7739df83f2c02';

describe('GlomoSignature', () => {
  const glomoSignature = new GlomoSignature(
    new ConfigService({
      GLOMO_SECRET_KEY: 'test-secret-key',
      GLOMO_WEBHOOK_SECRET: DOCS_WEBHOOK_SECRET,
    }),
  );

  it('accepts the worked example from the Glomo webhook docs', () => {
    expect(
      glomoSignature.isValidWebhook(
        Buffer.from(DOCS_WEBHOOK_BODY),
        DOCS_WEBHOOK_SIGNATURE,
      ),
    ).toBe(true);
  });

  it('rejects a webhook body that was re-serialised', () => {
    const reformattedBody = JSON.stringify(
      JSON.parse(DOCS_WEBHOOK_BODY),
      null,
      2,
    );
    expect(
      glomoSignature.isValidWebhook(
        Buffer.from(reformattedBody),
        DOCS_WEBHOOK_SIGNATURE,
      ),
    ).toBe(false);
  });

  it('rejects a missing or truncated webhook signature', () => {
    const body = Buffer.from(DOCS_WEBHOOK_BODY);
    expect(glomoSignature.isValidWebhook(body, undefined)).toBe(false);
    expect(
      glomoSignature.isValidWebhook(body, DOCS_WEBHOOK_SIGNATURE.slice(1)),
    ).toBe(false);
  });

  it('verifies the checkout signature over subscriptionId|paymentId|status', () => {
    const signature = createHmac('sha256', 'test-secret-key')
      .update('sub_abc|payt_def|success')
      .digest('hex');
    expect(
      glomoSignature.isValidCheckout(
        'sub_abc',
        'payt_def',
        'success',
        signature,
      ),
    ).toBe(true);
    expect(
      glomoSignature.isValidCheckout(
        'sub_abc',
        'payt_def',
        'failed',
        signature,
      ),
    ).toBe(false);
  });
});
