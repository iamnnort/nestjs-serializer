import { Module } from '@nestjs/common';
import { ConfigurableModuleClass } from './module-definition';
import { SerializerService } from './service';

@Module({
  providers: [SerializerService],
  exports: [SerializerService],
})
export class SerializerModule extends ConfigurableModuleClass {}
