import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Redirect,
} from '@nestjs/common';
import { PrismaService } from '@app/prisma';

@Controller()
export class RedirectController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(':code')
  @Redirect()
  async redirect(@Param('code') code: string) {
    const row = await this.prisma.shortUrl.findUnique({
      where: { shortCode: code },
      select: { longUrl: true },
    });
    if (!row) throw new NotFoundException();
    return { url: row.longUrl, statusCode: 302 };
  }
}
