import { Module } from '@nestjs/common';
import { AuthDbModule } from '@app/auth-db';
import { UsersRepository } from './repositories/users.repository';

@Module({
  imports: [AuthDbModule],
  providers: [UsersRepository],
  exports: [UsersRepository],
})
export class UsersModule {}
