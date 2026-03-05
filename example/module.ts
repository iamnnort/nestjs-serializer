import { Module } from '@nestjs/common';
import { LoggerModule } from '@iamnnort/nestjs-logger';
import { SerializerModule } from '../src';
import { AppController } from './controller';

@Module({
  imports: [LoggerModule, SerializerModule],
  controllers: [AppController],
})
export class AppModule {}
