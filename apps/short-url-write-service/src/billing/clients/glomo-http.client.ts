import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { isAxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import { PaymentGatewayError } from '../errors/payment-gateway.error';

@Injectable()
export class GlomoHttpClient {
  private readonly logger = new Logger(GlomoHttpClient.name);

  constructor(private readonly httpService: HttpService) {}

  async request<T>(
    method: 'GET' | 'POST' | 'PATCH',
    path: string,
    data?: object,
    params?: Record<string, string>,
  ) {
    try {
      const response = await firstValueFrom(
        this.httpService.request<T>({ method, url: path, data, params }),
      );
      return response.data;
    } catch (error) {
      const status = isAxiosError(error) ? error.response?.status : undefined;
      this.logger.warn({ method, path, status }, 'Glomo request failed');
      throw new PaymentGatewayError(undefined, { cause: error });
    }
  }
}
