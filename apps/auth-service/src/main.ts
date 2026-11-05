import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from '@app/logger';
import { AuthServiceModule } from './auth-service.module';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AuthServiceModule,
    new FastifyAdapter(),
    { bufferLogs: true },
  );
  app.useLogger(app.get(Logger));
  app.setGlobalPrefix('api/auth');
  app.enableShutdownHooks();
  const configService = app.get(ConfigService);
  app.connectMicroservice<MicroserviceOptions>(
    {
      transport: Transport.TCP,
      options: {
        host: configService.getOrThrow<string>('AUTH_INTERNAL_HOST'),
        port: Number(configService.getOrThrow<string>('AUTH_INTERNAL_PORT')),
      },
    },
    { inheritAppConfig: true },
  );
  await app.startAllMicroservices();
  await app.listen(
    configService.getOrThrow<string>('AUTH_SERVICE_PORT'),
    '0.0.0.0',
  );
}
await bootstrap();
