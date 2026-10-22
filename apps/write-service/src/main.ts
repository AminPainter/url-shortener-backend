import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { WriteServiceModule } from './write-service.module.js';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    WriteServiceModule,
    new FastifyAdapter(),
  );
  app.setGlobalPrefix('api');
  await app.listen(
    app.get(ConfigService).getOrThrow<string>('WRITE_SERVICE_PORT'),
    '0.0.0.0',
  );
}
await bootstrap();
