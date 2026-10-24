import { Module } from '@nestjs/common';
import { AuthDbService } from './auth-db.service';

@Module({
  providers: [AuthDbService],
  exports: [AuthDbService],
})
export class AuthDbModule {}
