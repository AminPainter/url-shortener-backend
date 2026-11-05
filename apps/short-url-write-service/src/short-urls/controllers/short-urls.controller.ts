import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateShortUrlDto } from '../dto/create-short-url.dto';
import { ListShortUrlsDto } from '../dto/list-short-urls.dto';
import { ShortUrlsService } from '../services/short-urls.service';

@Controller('short-urls')
@UseGuards(JwtAuthGuard)
export class ShortUrlsController {
  constructor(private readonly shortUrlsService: ShortUrlsService) {}

  @Post()
  create(
    @Body() { longUrl }: CreateShortUrlDto,
    @Req() request: { userId: bigint },
  ) {
    return this.shortUrlsService.create(longUrl, request.userId);
  }

  @Get()
  list(
    @Query() { cursor, limit }: ListShortUrlsDto,
    @Req() request: { userId: bigint },
  ) {
    return this.shortUrlsService.list(request.userId, limit, cursor);
  }
}
