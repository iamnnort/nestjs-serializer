import { flattenDeep, get, isArray, isFunction, isNil, isPlainObject, merge, set, pick, uniq } from 'lodash';
import { Inject, Injectable } from '@nestjs/common';
import { MODULE_OPTIONS_TOKEN } from './module-definition';
import type { SerializerConfig, SerializerFieldConfig } from './types';
import { CacheService } from './cache-service';
import { getEntityByPrefix, getEntityPrefix } from './decorator';

type TransformConfig = { scopes?: string[]; fields?: string[]; cache?: boolean | number };

type ResolveCtx = { cache: TransformConfig['cache'] };

type CacheReference = { __ref: number | string; __prefix: string };

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
type EntityClass = Function;

@Injectable()
export class SerializerService {
  constructor(
    @Inject(MODULE_OPTIONS_TOKEN) public config: SerializerConfig,
    private readonly cacheService: CacheService,
  ) {}

  async transform(response: any, config: TransformConfig) {
    if (!response) {
      return response;
    }

    if (!config.scopes && !config.fields) {
      return response;
    }

    if (!isNil(response.pagination) && !isNil(response.data)) {
      response.data = await this.transformMany(response.data, config);

      return response;
    }

    if (isArray(response)) {
      return this.transformMany(response, config);
    }

    return this.transformEntity(response, config);
  }

  private transformMany(entities: any[], config: TransformConfig) {
    return Promise.all(entities.map((entity) => this.transformEntity(entity, config)));
  }

  async transformEntity(entity: any, config: TransformConfig): Promise<any> {
    if (!entity) {
      return entity;
    }

    if (!config.scopes && !config.fields) {
      return entity;
    }

    if (config.fields) {
      return pick(entity, config.fields);
    }

    return this.resolveEntity(entity, config.scopes, { cache: config.cache });
  }

  private async resolveEntity(entity: any, scopes: string[] | undefined, ctx: ResolveCtx): Promise<any> {
    if (isNil(entity) || isNil(scopes)) {
      return entity;
    }

    const entityClass = entity.constructor;
    const fieldConfigs = this.getFieldConfigs(entityClass, scopes);
    const prefix = getEntityPrefix(entityClass);
    const cacheable = !!ctx.cache && !!prefix && !isNil(entity.id);

    if (cacheable) {
      const cached = await this.cacheService.get(entity.id, prefix!);

      if (!isNil(cached)) {
        return this.hydrate(cached, entityClass, scopes, () => entity, ctx);
      }
    }

    const full: Record<string, any> = {};
    const blob: Record<string, any> = {};

    await Promise.all(
      fieldConfigs.map(async (fieldConfig) => {
        const fieldName = this.fieldNameOf(fieldConfig);

        if (!isNil(fieldConfig.relationScopes)) {
          const { full: relationFull, blob: relationBlob } = await this.resolveRelation(entity, fieldConfig, ctx);
          const transformed = await this.getFieldTransform(fieldConfig)(relationFull, entity);

          this.assign(full, fieldName, transformed);
          this.assign(blob, fieldName, fieldConfig.fieldTransform ? transformed : relationBlob);

          return;
        }

        let fieldValue = await entity[fieldConfig.name];

        if (isFunction(fieldConfig.fieldTransform)) {
          fieldValue = await fieldConfig.fieldTransform(fieldValue, entity);
        }

        this.assign(full, fieldName, fieldValue);
        this.assign(blob, fieldName, fieldValue);
      }),
    );

    this.nullifyRemappedRoots(full, fieldConfigs);

    if (isPlainObject(entity.relatedScope)) {
      const relatedScopeFull: Record<string, any> = {};
      const relatedScopeBlob: Record<string, any> = {};

      await Promise.all(
        Object.keys(entity.relatedScope).map(async (key) => {
          const { full: childFull, reference } = await this.cacheChild(entity.relatedScope[key], scopes, ctx);

          relatedScopeFull[key] = childFull;
          relatedScopeBlob[key] = reference;
        }),
      );

      full.relatedScope = relatedScopeFull;
      blob.relatedScope = relatedScopeBlob;
    }

    if (cacheable) {
      await this.cacheService.set(entity.id, prefix!, blob, this.getCacheTtl(ctx.cache));
    }

    return full;
  }

  private async resolveRelation(entity: any, fieldConfig: SerializerFieldConfig, ctx: ResolveCtx) {
    const relationId = entity[`${fieldConfig.name}Id`];
    const relationPrefix = getEntityPrefix(fieldConfig.relationTarget);

    if (ctx.cache && !isNil(relationId) && relationPrefix) {
      const cached = await this.cacheService.get(relationId, relationPrefix);
      const relationClass = getEntityByPrefix(relationPrefix);

      if (!isNil(cached) && relationClass) {
        const full = await this.hydrate(
          cached,
          relationClass,
          fieldConfig.relationScopes,
          () => entity[fieldConfig.name],
          ctx,
        );

        return { full, blob: this.makeRef(relationId, relationPrefix) };
      }
    }

    const relation = await entity[fieldConfig.name];

    if (isArray(relation)) {
      const children = await Promise.all(
        relation.map((child) => this.cacheChild(child, fieldConfig.relationScopes, ctx)),
      );

      return { full: children.map((child) => child.full), blob: children.map((child) => child.reference) };
    }

    const child = await this.cacheChild(relation, fieldConfig.relationScopes, ctx);

    return { full: child.full, blob: child.reference };
  }

  private async cacheChild(child: any, scopes: string[] | undefined, ctx: ResolveCtx) {
    if (isNil(child)) {
      return { full: child, reference: child };
    }

    const full = await this.resolveEntity(child, scopes, ctx);
    const prefix = getEntityPrefix(child.constructor);

    if (ctx.cache && prefix && !isNil(child.id)) {
      return { full, reference: this.makeRef(child.id, prefix) };
    }

    return { full, reference: full };
  }

  private async hydrate(
    blob: any,
    entityClass: EntityClass,
    scopes: string[] | undefined,
    getEntity: () => any,
    ctx: ResolveCtx,
  ): Promise<any> {
    if (!isPlainObject(blob) || isNil(scopes)) {
      return blob;
    }

    const fieldConfigs = this.getFieldConfigs(entityClass, scopes);
    const result: Record<string, any> = {};

    await Promise.all(
      fieldConfigs.map(async (fieldConfig) => {
        const fieldName = this.fieldNameOf(fieldConfig);
        const blobValue = get(blob, fieldName);

        if (isNil(fieldConfig.relationScopes)) {
          this.assign(result, fieldName, blobValue);

          return;
        }

        const getRelationSource = async () => {
          const entity = await getEntity();

          return isNil(entity) ? undefined : entity[fieldConfig.name];
        };

        const relationValue = this.has(blob, fieldName)
          ? await this.hydrateRelation(blobValue, fieldConfig.relationScopes, getRelationSource, ctx)
          : await this.rebuildRelation(getRelationSource, fieldConfig.relationScopes, ctx);

        this.assign(result, fieldName, relationValue);
      }),
    );

    this.nullifyRemappedRoots(result, fieldConfigs);

    if (isPlainObject(blob.relatedScope)) {
      const relatedScope: Record<string, any> = {};

      await Promise.all(
        Object.keys(blob.relatedScope).map(async (key) => {
          const getRelatedSource = async () => {
            const entity = await getEntity();

            return isNil(entity) || isNil(entity.relatedScope) ? undefined : entity.relatedScope[key];
          };

          relatedScope[key] = await this.hydrateRelation(blob.relatedScope[key], scopes, getRelatedSource, ctx);
        }),
      );

      result.relatedScope = relatedScope;
    }

    return result;
  }

  private async hydrateRelation(
    blobValue: any,
    scopes: string[] | undefined,
    getSource: () => any,
    ctx: ResolveCtx,
  ): Promise<any> {
    if (isNil(blobValue)) {
      return blobValue;
    }

    if (isArray(blobValue)) {
      return Promise.all(
        blobValue.map((item, index) =>
          this.hydrateRelation(
            item,
            scopes,
            async () => {
              const array = await getSource();

              return isArray(array) ? array[index] : undefined;
            },
            ctx,
          ),
        ),
      );
    }

    if (this.isReference(blobValue)) {
      const childBlob = await this.cacheService.get(blobValue.__ref, blobValue.__prefix);
      const childClass = getEntityByPrefix(blobValue.__prefix);

      if (!isNil(childBlob) && childClass) {
        return this.hydrate(childBlob, childClass, scopes, getSource, ctx);
      }

      return this.rebuildRelation(getSource, scopes, ctx);
    }

    return blobValue;
  }

  private async rebuildRelation(getSource: () => any, scopes: string[] | undefined, ctx: ResolveCtx) {
    const source = await getSource();

    if (isNil(source)) {
      return source;
    }

    if (isArray(source)) {
      return Promise.all(source.map((item) => this.resolveEntity(item, scopes, ctx)));
    }

    return this.resolveEntity(source, scopes, ctx);
  }

  private isReference(value: any): value is CacheReference {
    return isPlainObject(value) && Object.prototype.hasOwnProperty.call(value, '__ref');
  }

  private makeRef(ref: number | string, prefix: string): CacheReference {
    return { __ref: ref, __prefix: prefix };
  }

  private fieldNameOf(fieldConfig: SerializerFieldConfig): string {
    return fieldConfig.fieldName || fieldConfig.name;
  }

  private has(target: Record<string, any>, fieldName: string) {
    return get(target, fieldName) !== undefined;
  }

  private assign(target: Record<string, any>, fieldName: string, value: any) {
    merge(target, set({}, fieldName, value));
  }

  private getFieldConfigs(entityClass: EntityClass, scopes?: string[]): SerializerFieldConfig[] {
    return global.serializerFieldConfigs.filter((fieldConfig) => {
      if (!this.isInstanceOf(entityClass, fieldConfig.target)) {
        return false;
      }

      return !!scopes && fieldConfig.scopes.some((scope) => scopes.includes(scope));
    });
  }

  private isInstanceOf(entityClass: EntityClass, target: EntityClass) {
    let current: EntityClass | null = entityClass;

    while (current) {
      if (current === target) {
        return true;
      }

      current = Object.getPrototypeOf(current);
    }

    return false;
  }

  private nullifyRemappedRoots(entity: Record<string, any>, fieldConfigs: SerializerFieldConfig[]) {
    const remappedChildCount = fieldConfigs.reduce<Record<string, number>>((accumulator, fieldConfig) => {
      const fieldName = this.fieldNameOf(fieldConfig);

      if (!fieldName.includes('.')) {
        return accumulator;
      }

      const root = fieldName.split('.')[0];
      accumulator[root] = (accumulator[root] || 0) + 1;

      return accumulator;
    }, {});

    Object.entries(entity).forEach(([root, value]) => {
      if (!isPlainObject(value)) {
        return;
      }

      const count = remappedChildCount[root];

      if (count && count >= Object.keys(value as object).length) {
        entity[root] = null;
      }
    });
  }

  private getFieldTransform(fieldConfig: SerializerFieldConfig) {
    return isFunction(fieldConfig.fieldTransform) ? fieldConfig.fieldTransform : (value: any) => value;
  }

  private getCacheTtl(cache: TransformConfig['cache']): number | undefined {
    return typeof cache === 'number' ? cache : undefined;
  }

  getRelations(scopes: string[], relationMap: Record<string, string[]>) {
    return uniq(flattenDeep<string>(scopes.map((scope) => relationMap[scope] || [])));
  }

  makeRelations(relationField: string, relationRelations: string[]) {
    return [relationField, ...relationRelations.map((relation) => [relationField, relation].join('.'))];
  }
}
