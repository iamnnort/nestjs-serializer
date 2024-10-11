import { ConfigurableModuleBuilder } from '@nestjs/common';
import type { SerializerConfig } from './types';

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } =
  new ConfigurableModuleBuilder<SerializerConfig>().build();
