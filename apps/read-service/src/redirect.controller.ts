import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Redirect,
} from '@nestjs/common';
import { RedirectService } from './redirect.service';

@Controller()
export class RedirectController {
  constructor(private readonly redirectService: RedirectService) {}

  @Get(':shortCode')
  @Redirect()
  async redirect(@Param('shortCode') shortCode: string) {
    const longUrl = await this.redirectService.resolve(shortCode);
    if (!longUrl) throw new NotFoundException();
    return { url: longUrl, statusCode: 302 };
  }
}
