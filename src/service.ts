import { flattenDeep, isArray, isFunction, isNil, isPlainObject, merge, pick, set, uniq } from 'lodash';
import { Inject, Injectable } from '@nestjs/common';
import { MODULE_OPTIONS_TOKEN } from './module-definition';
import type { SerializerConfig, SerializerFieldConfig } from './types';

@Injectable()
export class SerializerService {
  constructor(@Inject(MODULE_OPTIONS_TOKEN) public config: SerializerConfig) {}

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

  async transformRelationEntity(fieldValue: any, fieldConfig: SerializerFieldConfig, entity: any) {
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
        entity,
      );
    }

    return fieldTransform(
      await this.transformEntity(fieldValue, {
        scopes: fieldConfig.relationScopes,
      }),
      entity,
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
        const isGlobalTarget = (this.config.globalEntityNames || []).includes(fieldConfig.target.name);

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
          fieldValue = await this.transformRelationEntity(fieldValue, fieldConfig, entity);
        } else {
          if (isFunction(fieldConfig.fieldTransform)) {
            fieldValue = await fieldConfig.fieldTransform(fieldValue, entity);
          }
        }

        transformedEntity = merge(set({ ...transformedEntity }, fieldName, fieldValue), transformedEntity);
      }),
    );

    // calculate number of remapped fields per root field
    const fieldCountMap = serializerFieldConfigs.reduce<{ [key: string]: number }>((fieldCountMap, fieldConfig) => {
      const fieldName = fieldConfig.fieldName || fieldConfig.name;

      if (!fieldName.includes('.')) {
        return fieldCountMap;
      }

      const rootFieldName = fieldName.split('.')[0];

      return {
        ...fieldCountMap,
        [rootFieldName]: isNil(fieldCountMap[rootFieldName]) ? 1 : fieldCountMap[rootFieldName] + 1,
      };
    }, {});

    // remove root fields which have only remapped fields
    Object.entries(transformedEntity).forEach(([rootFieldName, rootFieldValue]) => {
      if (!isPlainObject(rootFieldValue)) {
        return;
      }

      const rootFieldCount = fieldCountMap[rootFieldName];
      const rootFieldChildrenCount = Object.keys(rootFieldValue as any).length;

      if (!rootFieldCount) {
        return;
      }

      if (rootFieldCount < rootFieldChildrenCount) {
        return;
      }

      transformedEntity[rootFieldName] = null;
    });

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
