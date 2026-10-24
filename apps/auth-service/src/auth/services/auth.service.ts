import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { UsersRepository } from '../../users/repositories/users.repository';

const BCRYPT_ROUNDS = 12;
const UNKNOWN_USER_PASSWORD_HASH =
  '$2b$12$w2R6AVNjtwVsoZrPTuBGLOZtbAsWAj29jJjDhiB.qX8.WOpgP1Bnu';

export interface AuthenticatedUser {
  id: bigint;
  email: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
  ) {}

  async signup(email: string, password: string) {
    return this.usersRepository.create(
      email.toLowerCase(),
      await bcrypt.hash(password, BCRYPT_ROUNDS),
    );
  }

  async validateUser(
    email: string,
    password: string,
  ): Promise<AuthenticatedUser | null> {
    const user = await this.usersRepository.findByEmail(email.toLowerCase());
    const passwordMatches = await bcrypt.compare(
      password,
      user?.passwordHash ?? UNKNOWN_USER_PASSWORD_HASH,
    );
    if (!user || !passwordMatches) return null;
    return { id: user.id, email: user.email };
  }

  issueAccessToken(user: AuthenticatedUser) {
    return this.jwtService.signAsync({ sub: user.id.toString() });
  }
}
