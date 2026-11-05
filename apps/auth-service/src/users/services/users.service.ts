import { Injectable } from '@nestjs/common';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { UsersRepository } from '../repositories/users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async getProfile(userId: string) {
    return this.toProfile(await this.usersRepository.findProfile(userId));
  }

  async updateProfile(userId: string, { name, address }: UpdateProfileDto) {
    return this.toProfile(
      await this.usersRepository.updateProfile(userId, name, address),
    );
  }

  private toProfile(user: {
    id: string;
    email: string;
    name: string | null;
    address: unknown;
  }) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      address: user.address,
    };
  }
}
