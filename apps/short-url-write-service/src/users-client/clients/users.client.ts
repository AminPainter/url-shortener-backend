import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import {
  AUTH_SERVICE,
  AUTH_SERVICE_TIMEOUT_MS,
  FIND_USER_BY_ID,
} from '../constants/auth-service';
import { AuthServiceUnavailableError } from '../errors/auth-service-unavailable.error';
import { UserNotFoundError } from '../errors/user-not-found.error';

export interface UserAddress {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  country: string;
  pincode?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  address: UserAddress | null;
}

@Injectable()
export class UsersClient {
  constructor(
    @Inject(AUTH_SERVICE) private readonly clientProxy: ClientProxy,
  ) {}

  async findById(userId: string) {
    try {
      return await firstValueFrom(
        this.clientProxy
          .send<UserProfile>(FIND_USER_BY_ID, { id: userId })
          .pipe(timeout(AUTH_SERVICE_TIMEOUT_MS)),
      );
    } catch (error) {
      if ((error as { errorCode?: string })?.errorCode === 'USER_NOT_FOUND') {
        throw new UserNotFoundError();
      }
      throw new AuthServiceUnavailableError(undefined, { cause: error });
    }
  }
}
