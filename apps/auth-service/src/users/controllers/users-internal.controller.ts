import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { FIND_USER_BY_ID } from '../constants/message-patterns';
import { FindUserDto } from '../dto/find-user.dto';
import { UsersService } from '../services/users.service';

@Controller()
export class UsersInternalController {
  constructor(private readonly usersService: UsersService) {}

  @MessagePattern(FIND_USER_BY_ID)
  findById(@Payload() { id }: FindUserDto) {
    return this.usersService.getProfile(id);
  }
}
