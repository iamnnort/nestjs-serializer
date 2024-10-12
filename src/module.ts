import { Global, Module } from '@nestjs/common';
import { ConfigurableModuleClass } from './module-definition';
import { SerializerService } from './service';

@Global()
@Module({
  providers: [SerializerService],
  exports: [SerializerService],
})
export class SerializerModule extends ConfigurableModuleClass {}
