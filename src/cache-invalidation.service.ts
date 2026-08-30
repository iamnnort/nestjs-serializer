import { Inject, Injectable } from '@nestjs/common';
import { isNil } from 'lodash';
import { MODULE_OPTIONS_TOKEN } from './module-definition';
import type { SerializerConfig } from './types';
import { CacheService } from './cache-service';
import { getEntityPrefix } from './decorator';

@Injectable()
export class CacheInvalidationService {
  constructor(
    @Inject(MODULE_OPTIONS_TOKEN) private readonly config: SerializerConfig,
    private readonly cacheService: CacheService,
  ) {}

  async invalidate(entity: any): Promise<void> {
    if (!this.config.cache || !entity) return;

    const typePrefix = getEntityPrefix(entity.constructor);
    const entityId = entity.id;

    if (!typePrefix || isNil(entityId)) return;

    await this.cacheService.remove(entityId, typePrefix);
  }
}
