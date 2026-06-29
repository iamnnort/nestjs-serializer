import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Optional } from '@nestjs/common';
import superjson from 'superjson';
import { MODULE_OPTIONS_TOKEN } from './module-definition';
import type { SerializerConfig } from './types';

@Injectable()
export class CacheService {
  constructor(
    @Optional()
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache | null,
    @Inject(MODULE_OPTIONS_TOKEN)
    private config: SerializerConfig,
  ) {}

  async set(entityId: string | number, typePrefix: string, data: any, ttl?: number) {
    if (!this.cacheManager) return;

    await this.cacheManager.set(
      this.getCacheKey(entityId, typePrefix),
      superjson.stringify(data),
      ttl ?? this.config.cache!.ttl,
    );
  }

  async get(entityId: number | string, typePrefix: string) {
    if (!this.cacheManager) return null;

    const cached = await this.cacheManager.get<string>(this.getCacheKey(entityId, typePrefix));

    return cached ? superjson.parse(cached) : null;
  }

  async remove(entityId: number | string, typePrefix: string) {
    await this.cacheManager?.del(this.getCacheKey(entityId, typePrefix));
  }

  private getCacheKey(entityId: number | string, typePrefix: string) {
    return `${this.config.cache!.prefix}:${typePrefix}:${entityId}`;
  }
}
