import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CreateShortUrlDto } from '../dto/create-short-url.dto';
import { ListShortUrlsDto } from '../dto/list-short-urls.dto';
import { ShortUrlsService } from '../services/short-urls.service';

@Controller('short-urls')
@UseGuards(AuthGuard('jwt'))
export class ShortUrlsController {
  constructor(private readonly shortUrlsService: ShortUrlsService) {}

  @Post()
  create(
    @Body() { longUrl }: CreateShortUrlDto,
    @Req() request: { user: { userId: bigint } },
  ) {
    return this.shortUrlsService.create(longUrl, request.user.userId);
  }

  @Get()
  list(
    @Query() { cursor, limit }: ListShortUrlsDto,
    @Req() request: { user: { userId: bigint } },
  ) {
    return this.shortUrlsService.list(request.user.userId, limit, cursor);
  }
}
