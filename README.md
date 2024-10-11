## Info

Serialization module for NestJS - Efficient - Flexible - Streamlined

## Installation

```bash
yarn install @iamnnort/nestjs-serializer
```

## Usage

```javascript
// app.controller.ts
import { Controller, Get } from '@nestjs/common';
import { RequestService } from '@iamnnort/nestjs-serializer';

@Controller('demo')
export class AppController {
  constructor(private requestService: RequestService<{ id: number }>) {}

  @Get()
  demo() {
    return this.requestService.get(1);
  }
}

// app.ts
import { Module } from '@nestjs/common';
import { RequestModule } from '@iamnnort/nestjs-serializer';
import { AppController } from './app.controller';

@Module({
  imports: [
    RequestModule.register({
      name: 'Demo Api',
      baseUrl: 'https://jsonplaceholder.typicode.com',
      url: '/todos',
      logger: true,
    }),
  ],
  controllers: [AppController],
})
export class AppModule {}

// index.ts
import { NestFactory } from '@nestjs/core';
import { LoggerService } from '@iamnnort/nestjs-logger';
import { AppModule } from './app';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  app.useLogger(new LoggerService());

  await app.listen(3000);
}

bootstrap();
```

## Output

```bash
[System] Application is starting...
[System] Application started.
[System] [Request] GET /demo
[Demo Api] [Request] GET /todos/1
[Demo Api] [Response] GET /todos/1 200 OK {"userId":1,"id":1,"title":"delectus aut autem","completed":false}
[System] [Response] GET /demo 200 OK
```

## License

This project is licensed under the MIT license. See the [LICENSE](LICENSE) file for more info.
