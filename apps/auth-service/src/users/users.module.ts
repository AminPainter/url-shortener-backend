import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/prisma';
import { UsersRepository } from './repositories/users.repository';

@Module({
  imports: [PrismaModule],
  providers: [UsersRepository],
  exports: [UsersRepository],
})
export class UsersModule {}
