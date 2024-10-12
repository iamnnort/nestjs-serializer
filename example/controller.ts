import { Controller, Get, Post, UseInterceptors } from '@nestjs/common';
import { SerializerIdInterceptor, SerializerInterceptor } from '../src';
import { User } from './user';
import { Scopes } from './types';
import { City } from './city';

@Controller()
export class AppController {
  @Get()
  @UseInterceptors(SerializerInterceptor({ scopes: [Scopes.BASE] }))
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
  @UseInterceptors(SerializerInterceptor({ scopes: [Scopes.BASE, Scopes.FULL] }))
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

  @Post()
  @UseInterceptors(SerializerIdInterceptor)
  create() {
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
