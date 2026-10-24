import { Injectable } from '@nestjs/common';
import { Prisma, PrismaService } from '@app/prisma';
import { EmailTakenError } from './email-taken.error';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

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
}
