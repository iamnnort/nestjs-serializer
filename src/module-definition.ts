import { ConfigurableModuleBuilder } from '@nestjs/common';
import type { SerializerConfig } from './types';

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN, ASYNC_OPTIONS_TYPE, OPTIONS_TYPE } =
  new ConfigurableModuleBuilder<SerializerConfig>().build();
