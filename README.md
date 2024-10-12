## Info

Serialization module for NestJS - Efficient - Flexible - Streamlined

## Installation

```bash
yarn install @iamnnort/nestjs-serializer
```

## Usage

```javascript

// types.ts

export enum Scopes {
  BASE = 'BASE',
  FULL = 'FULL',
}

// model.ts

import { SerializeField } from '@iamnnort/nestjs-serializer';
import { Scopes } from './types';

export class Model {
  @SerializeField([{ scopes: [Scopes.BASE] }])
  id: number;

  constructor(dto: { id: number }) {
    this.id = dto.id;
  }
}

// user.ts

import { SerializeField } from '@iamnnort/nestjs-serializer';
import { Model } from './model';
import { Scopes } from './types';

export class User extends Model {
  @SerializeField([{ scopes: [Scopes.FULL] }])
  name: string;

  constructor(dto: { id: number; name: string }) {
    super(dto);

    this.name = dto.name;
  }
}

// controller.ts
import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { SerializerInterceptor } from '@iamnnort/nestjs-serializer';
import { User } from './user';
import { Scopes } from './types';

@Controller()
export class AppController {
  @Get()
  @UseInterceptors(SerializerInterceptor([Scopes.BASE]))
  search() {
    const user = new User({
      id: 1,
      name: 'John',
    });

    return [user];
  }

  @Get(':id')
  @UseInterceptors(SerializerInterceptor([Scopes.BASE, Scopes.FULL]))
  get() {
    const user = new User({
      id: 1,
      name: 'John',
    });

    return user;
  }
}

// module.ts
import { Module } from '@nestjs/common';
import { LoggerModule } from '@iamnnort/nestjs-logger';
import { SerializerModule } from '@iamnnort/nestjs-serializer';
import { Model } from './model';
import { AppController } from './controller';

@Module({
  imports: [
    LoggerModule,
    SerializerModule.register({
      globalEntityNames: [Model.name],
    }),
  ],
  controllers: [AppController],
})
export class AppModule {}

// index.ts
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
```

## Output

```bash
[System] Application is starting...
[System] Application started.
[System] [Request] GET /
[System] [Response] GET / 200 OK [{ id: 1 }]
[System] [Request] GET /1
[System] [Response] GET /1 200 OK [{ id: 1, name: "John" }]
```

## License

This project is licensed under the MIT license. See the [LICENSE](LICENSE) file for more info.
