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

// city.ts

import { SerializeField } from '@iamnnort/nestjs-serializer';
import { Model } from './model';
import { Scopes } from './types';

export class City extends Model {
  @SerializeField([{ scopes: [Scopes.FULL] }])
  name: string;

  constructor(dto: { id: number; name: string }) {
    super(dto);

    this.name = dto.name;
  }
}

// user.ts

import { SerializeField, SerializeRelation } from '@iamnnort/nestjs-serializer';
import { City } from './city';
import { Model } from './model';
import { Scopes } from './types';

export class User extends Model {
  @SerializeField([{ scopes: [Scopes.FULL] }])
  name: string;

  @SerializeRelation([{ scopes: [Scopes.FULL], relationScopes: [Scopes.BASE, Scopes.FULL] }])
  city: City;

  constructor(dto: { id: number; name: string; city: City }) {
    super(dto);

    this.name = dto.name;
    this.city = dto.city;
  }
}

// controller.ts

import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { SerializerInterceptor } from '@iamnnort/nestjs-serializer';
import { User } from './user';
import { Scopes } from './types';
import { City } from './city';

@Controller()
export class AppController {
  @Get()
  @UseInterceptors(SerializerInterceptor([Scopes.BASE]))
  search() {
    const city = new City({
      id: 1,
      name: 'London',
    });

    const user = new User({
      id: 1,
      name: 'John',
      city,
    });

    return [user];
  }

  @Get(':id')
  @UseInterceptors(SerializerInterceptor([Scopes.BASE, Scopes.FULL]))
  get() {
    const city = new City({
      id: 1,
      name: 'London',
    });

    const user = new User({
      id: 1,
      name: 'John',
      city,
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
[System] [Response] GET /1 200 OK [{ id: 1, name: "John", city: { id: 1, name: "London" } }]
```

## License

This project is licensed under the MIT license. See the [LICENSE](LICENSE) file for more info.
