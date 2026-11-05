import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, UserId } from '@app/jwt-auth';
import { CreateShortUrlDto } from '../dto/create-short-url.dto';
import { ListShortUrlsDto } from '../dto/list-short-urls.dto';
import { ShortUrlsService } from '../services/short-urls.service';

@Controller('short-urls')
@UseGuards(JwtAuthGuard)
export class ShortUrlsController {
  constructor(private readonly shortUrlsService: ShortUrlsService) {}

  @Post()
  create(@Body() { longUrl }: CreateShortUrlDto, @UserId() userId: string) {
    return this.shortUrlsService.create(longUrl, userId);
  }

  @Get()
  list(@Query() { cursor, limit }: ListShortUrlsDto, @UserId() userId: string) {
    return this.shortUrlsService.list(userId, limit, cursor);
  }
}
