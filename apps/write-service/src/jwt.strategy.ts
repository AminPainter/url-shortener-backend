import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: Buffer.from(
        configService.getOrThrow<string>('JWT_PUBLIC_KEY'),
        'base64',
      ).toString(),
      algorithms: ['RS256'],
      issuer: 'auth-service',
    });
  }

  validate({ sub }: { sub: string }) {
    return { userId: BigInt(sub) };
  }
}
