import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ReadServiceModule } from './read-service.module.js';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    ReadServiceModule,
    new FastifyAdapter(),
  );
  await app.listen(
    app.get(ConfigService).getOrThrow<string>('READ_SERVICE_PORT'),
    '0.0.0.0',
  );
}
await bootstrap();
