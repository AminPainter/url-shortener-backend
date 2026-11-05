import { Injectable } from '@nestjs/common';
import { AuthDbService, Prisma } from '@app/auth-db';
import { EmailTakenError } from '../errors/email-taken.error';
import { UserNotFoundError } from '../errors/user-not-found.error';

const PROFILE_FIELDS = {
  id: true,
  email: true,
  name: true,
  address: true,
} as const;

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: AuthDbService) {}

  async create(email: string, passwordHash: string) {
    try {
      return await this.prisma.user.create({
        data: { email, passwordHash },
        select: { id: true, email: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new EmailTakenError();
      }
      throw error;
    }
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, passwordHash: true },
    });
  }

  async findProfile(id: bigint) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: PROFILE_FIELDS,
    });
    if (!user) throw new UserNotFoundError();
    return user;
  }

  async updateProfile(
    id: bigint,
    name: string,
    address: Prisma.InputJsonObject,
  ) {
    try {
      return await this.prisma.user.update({
        where: { id },
        data: { name, address },
        select: PROFILE_FIELDS,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new UserNotFoundError();
      }
      throw error;
    }
  }
}
