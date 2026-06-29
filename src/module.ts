import { DynamicModule, Global, Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigurableModuleClass, ASYNC_OPTIONS_TYPE, OPTIONS_TYPE } from './module-definition';
import { SerializerService } from './service';
import type { SerializerConfig } from './types';
import KeyvRedis, { RedisClientConnectionType } from '@keyv/redis';
import { createClient } from 'redis';
import { CacheService } from './cache-service';
import { CacheInvalidationService } from './cache-invalidation.service';

async function createRedisStore(redis: NonNullable<SerializerConfig['cache']>['redis']) {
  const redisClient = createClient({
    socket: {
      host: redis.host,
      port: 6379,
      tls: true,
      rejectUnauthorized: false,
    },
    username: redis.username,
    password: redis.password,
  });

  return new KeyvRedis(redisClient as unknown as RedisClientConnectionType);
}

const SERVICE_PROVIDERS = [SerializerService, CacheService, CacheInvalidationService];
const SERVICE_EXPORTS = [SerializerService, CacheInvalidationService];

@Global()
@Module({})
export class SerializerModule extends ConfigurableModuleClass {
  static register(options: typeof OPTIONS_TYPE): DynamicModule {
    const parent = ConfigurableModuleClass.register(options);

    const cacheImports = options.cache
      ? [
          CacheModule.registerAsync({
            isGlobal: true,
            useFactory: async () => ({ stores: [await createRedisStore(options.cache!.redis)] }),
          }),
        ]
      : [];

    return {
      ...parent,
      global: true,
      imports: [...(parent.imports ?? []), ...cacheImports],
      providers: [...(parent.providers ?? []), ...SERVICE_PROVIDERS],
      exports: [...(parent.exports ?? []), ...SERVICE_EXPORTS],
    };
  }

  static registerAsync(options: typeof ASYNC_OPTIONS_TYPE): DynamicModule {
    const parent = ConfigurableModuleClass.registerAsync(options);

    const cacheImports = [
      CacheModule.registerAsync({
        isGlobal: true,
        imports: options.imports,
        inject: options.inject,
        useFactory: async (...args: any[]) => {
          const config = options.useFactory ? await options.useFactory(...args) : ({} as SerializerConfig);
          if (!config.cache) return {};
          return { stores: [await createRedisStore(config.cache.redis)] };
        },
      }),
    ];

    return {
      ...parent,
      global: true,
      imports: [...(parent.imports ?? []), ...cacheImports],
      providers: [...(parent.providers ?? []), ...SERVICE_PROVIDERS],
      exports: [...(parent.exports ?? []), ...SERVICE_EXPORTS],
    };
  }
}
