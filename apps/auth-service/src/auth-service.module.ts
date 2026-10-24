import { Module } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ErrorResponseFilter } from '@app/errors';
import { PinoLoggerModule } from '@app/logger';
import { PrismaModule } from '@app/prisma';
import { ZodValidationPipe } from '@app/validation';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { HealthController } from './health.controller';
import { LocalStrategy } from './local.strategy';
import { UsersRepository } from './users.repository';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PinoLoggerModule,
    PrismaModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        privateKey: Buffer.from(
          configService.getOrThrow<string>('JWT_PRIVATE_KEY'),
          'base64',
        ).toString(),
        signOptions: {
          algorithm: 'RS256',
          expiresIn: '1h',
          issuer: 'auth-service',
        },
      }),
    }),
  ],
  controllers: [HealthController, AuthController],
  providers: [
    { provide: APP_FILTER, useClass: ErrorResponseFilter },
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    AuthService,
    UsersRepository,
    LocalStrategy,
  ],
})
export class AuthServiceModule {}
