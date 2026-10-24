import { Module } from '@nestjs/common';
import { PrismaModule } from '@app/prisma';
import { ShortUrlsController } from './controllers/short-urls.controller';
import { ShortUrlsRepository } from './repositories/short-urls.repository';
import { ShortUrlsService } from './services/short-urls.service';

@Module({
  imports: [PrismaModule],
  controllers: [ShortUrlsController],
  providers: [ShortUrlsService, ShortUrlsRepository],
})
export class ShortUrlsModule {}
