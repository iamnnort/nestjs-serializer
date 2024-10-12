import { Module } from '@nestjs/common';
import { LoggerModule } from '@iamnnort/nestjs-logger';
import { SerializerModule } from '../src';
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
