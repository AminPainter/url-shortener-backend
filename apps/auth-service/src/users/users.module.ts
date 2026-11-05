import { Module } from '@nestjs/common';
import { AuthDbModule } from '@app/auth-db';
import { MeController } from './controllers/me.controller';
import { UsersInternalController } from './controllers/users-internal.controller';
import { UsersRepository } from './repositories/users.repository';
import { UsersService } from './services/users.service';

@Module({
  imports: [AuthDbModule],
  controllers: [MeController, UsersInternalController],
  providers: [UsersRepository, UsersService],
  exports: [UsersRepository],
})
export class UsersModule {}
