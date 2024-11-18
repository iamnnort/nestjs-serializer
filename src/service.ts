import { flattenDeep, isArray, isFunction, isNil, isPlainObject, merge, pick, set, uniq } from 'lodash';
import { Inject, Injectable } from '@nestjs/common';
import { MODULE_OPTIONS_TOKEN } from './module-definition';
import type { SerializerConfig, SerializerFieldConfig } from './types';

@Injectable()
export class SerializerService {
  globalEntityNames: string[];

  constructor(
    @Inject(MODULE_OPTIONS_TOKEN)
    public config: SerializerConfig,
  ) {
    this.globalEntityNames = config.globalEntityNames || [];
  }

  async transform(response: any, config: { scopes?: string[]; fields?: string[] }) {
    if (!response) {
      return response;
    }

    if (!config.scopes && !config.fields) {
      return response;
    }

    if (!isNil(response.pagination) && !isNil(response.data)) {
      const transformedData = await Promise.all(
        response.data.map((entity) => {
          return this.transformEntity(entity, config);
        }),
      );

      response.data = transformedData;

      return response;
    }

    if (isArray(response)) {
      const transformedEntities = await Promise.all(
        response.map((entity) => {
          return this.transformEntity(entity, config);
        }),
      );

      return transformedEntities;
    }

    const transformedEntity = await this.transformEntity(response, config);

    return transformedEntity;
  }

  async transformRelationEntity(fieldValue: any, fieldConfig: SerializerFieldConfig) {
    const fieldTransform = isFunction(fieldConfig.fieldTransform) ? fieldConfig.fieldTransform : (_) => _;

    if (isArray(fieldValue)) {
      return fieldTransform(
        await Promise.all(
          fieldValue.map(async (relationEntity) => {
            return this.transformEntity(relationEntity, {
              scopes: fieldConfig.relationScopes,
            });
          }),
        ),
      );
    }

    return fieldTransform(
      await this.transformEntity(fieldValue, {
        scopes: fieldConfig.relationScopes,
      }),
    );
  }

  async transformEntity(entity: any, config: { scopes?: string[]; fields?: string[] }) {
    if (!entity) {
      return entity;
    }

    if (!config.scopes && !config.fields) {
      return entity;
    }

    if (config.fields) {
      return pick(entity, config.fields);
    }

    const serializerFieldConfigs = global.serializerFieldConfigs.filter((fieldConfig) => {
      const isTarget = fieldConfig.target === entity.constructor;

      if (!isTarget) {
        const isGlobalTarget = this.globalEntityNames.includes(fieldConfig.target.name);

        if (!isGlobalTarget) {
          return false;
        }
      }

      const isScope = fieldConfig.scopes.some((scope) => {
        if (!config.scopes) {
          return false;
        }

        return config.scopes.includes(scope);
      });

      return isScope;
    });

    let transformedEntity = {} as any;

    await Promise.all(
      serializerFieldConfigs.map(async (fieldConfig) => {
        const fieldName = fieldConfig.fieldName || fieldConfig.name;
        let fieldValue = await entity[fieldConfig.name];

        if (!isNil(fieldConfig.relationScopes)) {
          fieldValue = await this.transformRelationEntity(fieldValue, fieldConfig);
        } else {
          if (isFunction(fieldConfig.fieldTransform)) {
            fieldValue = await fieldConfig.fieldTransform(fieldValue);
          }
        }

        transformedEntity = merge(set({ ...transformedEntity }, fieldName, fieldValue), transformedEntity);
      }),
    );

    if (isPlainObject(entity.relatedScope)) {
      const transformedRelatedScope = {};

      await Promise.all(
        Object.keys(entity.relatedScope).map(async (relaitedEntityKey) => {
          const relaitedEntity = entity.relatedScope[relaitedEntityKey];

          transformedRelatedScope[relaitedEntityKey] = await this.transformEntity(relaitedEntity, {
            scopes: config.scopes,
          });
        }),
      );

      transformedEntity.relatedScope = transformedRelatedScope;
    }

    return transformedEntity;
  }

  getRelations(scopes: string[], relationMap: Record<string, string[]>) {
    return uniq(
      flattenDeep<string>(
        scopes.map((scope) => {
          return relationMap[scope] || [];
        }),
      ),
    );
  }

  makeRelations(relationField: string, relationRelations: string[]) {
    const relations = [
      relationField,
      ...relationRelations.map((relation) => {
        return [relationField, relation].join('.');
      }),
    ];

    return relations;
  }
}
