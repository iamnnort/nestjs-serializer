import { flattenDeep, isArray, isFunction, isNil, isPlainObject, merge, set, uniq } from 'lodash';
import { Inject, Injectable } from '@nestjs/common';
import { MODULE_OPTIONS_TOKEN } from './module-definition';
import type { SerializerConfig } from './types';

@Injectable()
export class SerializerService {
  globalEntityNames: string[];

  constructor(
    @Inject(MODULE_OPTIONS_TOKEN)
    public config: SerializerConfig,
  ) {
    this.globalEntityNames = config.globalEntityNames || [];
  }

  async transform(response: any, scopes?: string[]) {
    if (!scopes) {
      return response;
    }

    if (!isNil(response.pagination) && !isNil(response.data)) {
      const transformedData = await Promise.all(
        response.data.map((entity) => {
          return this.transformEntity(entity, scopes);
        }),
      );

      response.data = transformedData;

      return response;
    }

    if (isArray(response)) {
      const transformedEntities = await Promise.all(
        response.map((entity) => {
          return this.transformEntity(entity, scopes);
        }),
      );

      return transformedEntities;
    }

    const transformedEntity = await this.transformEntity(response, scopes);

    return transformedEntity;
  }

  async transformEntity(entity: any, scopes: string[] = []) {
    console.log('1', entity);
    if (!entity) {
      return entity;
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
        return scopes.includes(scope);
      });

      return isScope;
    });

    console.log('2', serializerFieldConfigs);

    let transformedEntity = {} as any;

    await Promise.all(
      serializerFieldConfigs.map(async (fieldConfig) => {
        const fieldName = fieldConfig.fieldName || fieldConfig.name;
        let fieldValue = await entity[fieldConfig.name];

        if (!isNil(fieldConfig.relationScopes)) {
          if (isArray(fieldValue)) {
            fieldValue = await Promise.all(
              fieldValue.map(async (relationEntity) => {
                let relationEntityFieldValue = await this.transformEntity(relationEntity, fieldConfig.relationScopes);

                if (isFunction(fieldConfig.fieldTransform)) {
                  relationEntityFieldValue = await fieldConfig.fieldTransform(relationEntityFieldValue);
                }

                return relationEntityFieldValue;
              }),
            );
          } else {
            fieldValue = await this.transformEntity(fieldValue, fieldConfig.relationScopes);

            if (isFunction(fieldConfig.fieldTransform)) {
              fieldValue = await fieldConfig.fieldTransform(fieldValue);
            }
          }
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

          transformedRelatedScope[relaitedEntityKey] = await this.transformEntity(relaitedEntity, scopes);
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
