import { Module } from '@nestjs/common';
import { SerializerModule } from '../src';

@Module({
  imports: [
    SerializerModule.register({
      local: true,
    }),
  ],
})
export class AppModule {}
