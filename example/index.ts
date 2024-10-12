import { NestFactory } from '@nestjs/core';
import { LoggerService } from '@iamnnort/nestjs-logger';
import { AppModule } from './module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  app.useLogger(new LoggerService());

  await app.listen(3000);
}

bootstrap();
