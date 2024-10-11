import { Inject, Injectable } from '@nestjs/common';
import { MODULE_OPTIONS_TOKEN } from './module-definition';
import type { SerializerConfig } from './types';

@Injectable()
export class SerializerService {
  constructor(
    @Inject(MODULE_OPTIONS_TOKEN)
    public config: SerializerConfig,
  ) {}
}
