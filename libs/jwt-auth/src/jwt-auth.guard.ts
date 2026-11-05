import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  getAuthenticateOptions(_context: ExecutionContext) {
    return { property: 'userId' };
  }
}
