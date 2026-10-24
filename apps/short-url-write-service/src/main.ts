import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Logger } from '@app/logger';
import { ShortUrlWriteServiceModule } from './short-url-write-service.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    ShortUrlWriteServiceModule,
    new FastifyAdapter(),
    { bufferLogs: true },
  );
  app.useLogger(app.get(Logger));
  app.setGlobalPrefix('api');
  app.enableShutdownHooks();
  await app.listen(
    app.get(ConfigService).getOrThrow<string>('WRITE_SERVICE_PORT'),
    '0.0.0.0',
  );
}
await bootstrap();
