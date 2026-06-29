import 'reflect-metadata';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { SerializerRequest } from './types';

global.serializerFieldConfigs = [];
global.serializerEntityPrefixes = new Map();
global.serializerPrefixEntities = new Map();

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export const SerializeEntity = (prefix: string) => (target: Function) => {
  global.serializerEntityPrefixes.set(target, prefix);
  global.serializerPrefixEntities.set(prefix, target);
};

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export const getEntityPrefix = (target?: Function | null): string | undefined => {
  let constructor = target;

  while (constructor && constructor !== Object) {
    const prefix = global.serializerEntityPrefixes.get(constructor);

    if (prefix) {
      return prefix;
    }

    constructor = Object.getPrototypeOf(constructor.prototype)?.constructor;
  }

  return undefined;
};

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export const getEntityByPrefix = (prefix: string): Function | undefined => {
  return global.serializerPrefixEntities.get(prefix);
};

export const SerializeField = (
  configs: {
    scopes: string[];
    fieldName?: string;
    fieldTransform?: (value: any, entity: any) => any | Promise<any>;
  }[],
) => {
  return (target: object, name: string) => {
    configs.forEach((config) => {
      global.serializerFieldConfigs.push({
        scopes: config.scopes,
        target: target.constructor,
        name,
        fieldName: config.fieldName,
        fieldTransform: config.fieldTransform,
      });
    });
  };
};

export const SerializeRelation = (
  configs: {
    scopes: string[];
    relationScopes: string[];
    fieldName?: string;
    fieldTransform?: (entity: any) => any | Promise<any>;
  }[],
) => {
  return (target: object, name: string) => {
    const relationTarget = Reflect.getMetadata('design:type', target, name);

    configs.forEach((config) => {
      global.serializerFieldConfigs.push({
        scopes: config.scopes,
        relationScopes: config.relationScopes,
        target: target.constructor,
        relationTarget,
        name,
        fieldName: config.fieldName,
        fieldTransform: config.fieldTransform,
      });
    });
  };
};

export const SerializerQuery = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<SerializerRequest>();

  return request.scopes;
});
