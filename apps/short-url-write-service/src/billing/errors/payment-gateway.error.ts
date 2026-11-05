import { BadGatewayError } from '@app/errors';

export class PaymentGatewayError extends BadGatewayError {
  readonly code = 'PAYMENT_GATEWAY_ERROR';
}
