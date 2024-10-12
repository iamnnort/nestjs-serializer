import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { SerializerInterceptor } from '../src';
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
