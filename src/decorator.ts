import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { SerializerRequest } from './types';

global.serializerFieldConfigs = [];

export const SerializeField = (
  configs: {
    scopes: string[];
    fieldName?: string;
    fieldTransform?: (entity: any) => any | Promise<any>;
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
    configs.forEach((config) => {
      global.serializerFieldConfigs.push({
        scopes: config.scopes,
        relationScopes: config.relationScopes,
        target: target.constructor,
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
