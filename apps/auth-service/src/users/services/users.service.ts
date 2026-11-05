import { Injectable } from '@nestjs/common';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { UsersRepository } from '../repositories/users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  getProfile(userId: string) {
    return this.usersRepository.findProfile(userId);
  }

  updateProfile(userId: string, { name, address }: UpdateProfileDto) {
    return this.usersRepository.updateProfile(userId, name, address);
  }
}
