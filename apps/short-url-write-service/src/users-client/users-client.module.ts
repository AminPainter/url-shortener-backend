import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { UsersClient } from './clients/users.client';
import { AUTH_SERVICE } from './constants/auth-service';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: AUTH_SERVICE,
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: configService.getOrThrow<string>('AUTH_INTERNAL_HOST'),
            port: Number(
              configService.getOrThrow<string>('AUTH_INTERNAL_PORT'),
            ),
          },
        }),
      },
    ]),
  ],
  providers: [UsersClient],
  exports: [UsersClient],
})
export class UsersClientModule {}
