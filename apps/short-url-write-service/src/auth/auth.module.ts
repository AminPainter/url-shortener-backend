import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '@app/jwt-auth';

@Module({
  imports: [PassportModule],
  providers: [JwtStrategy],
})
export class AuthModule {}
