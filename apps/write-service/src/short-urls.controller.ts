import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CreateShortUrlDto } from './create-short-url.dto';
import { ShortUrlsService } from './short-urls.service';

@Controller('short-urls')
export class ShortUrlsController {
  constructor(private readonly shortUrlsService: ShortUrlsService) {}

  @Post()
  @UseGuards(AuthGuard('jwt'))
  create(
    @Body() { longUrl }: CreateShortUrlDto,
    @Req() request: { user: { userId: bigint } },
  ) {
    return this.shortUrlsService.create(longUrl, request.user.userId);
  }
}
