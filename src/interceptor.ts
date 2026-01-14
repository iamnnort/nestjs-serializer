import { NestInterceptor, ExecutionContext, CallHandler, Injectable } from '@nestjs/common';
import { map } from 'rxjs/operators';
import { Request } from 'express';
import { SerializerService } from './service';
import { intersection } from 'lodash';
import { SerializerRequest } from './types';

export const SerializerInterceptor = (config: {
  scopes?: string[];
  extendedScopes?: string[];
  limitedScopes?: string[];
  secretScopes?: string[];
  allowedScopes?: string[];
  fields?: string[];
}) => {
  @Injectable()
  class SerializerInterceptor implements NestInterceptor {
    constructor(public serializerService: SerializerService) {}

    intercept(ctx: ExecutionContext, next: CallHandler<Promise<any>>) {
      const request = ctx.switchToHttp().getRequest<SerializerRequest>();

      request.scopes = this.getScopes(ctx);

      return next.handle().pipe(
        map(async (responsePromise) => {
          const response = await responsePromise;

          if (!request.scopes && !config.fields) {
            return response;
          }

          return this.serializerService.transform(response, {
            scopes: request.scopes,
            fields: config.fields,
          });
        }),
      );
    }

    getScopes(ctx: ExecutionContext) {
      const request = ctx.switchToHttp().getRequest<Request>();

      if (request.query.extended === 'true') {
        return config.extendedScopes || config.scopes;
      }

      if (request.query.limited === 'true') {
        return config.limitedScopes || this.serializerService.config.globalLimitedScopes || config.scopes;
      }

      if (request.query.secret === 'true') {
        return config.secretScopes || this.serializerService.config.globalSecretScopes || config.scopes;
      }

      if (request.query.scopes && config.allowedScopes) {
        return intersection(request.query.scopes as string[], config.allowedScopes);
      }

      return config.scopes;
    }
  }

  return SerializerInterceptor;
};

@Injectable()
export class SerializerIdInterceptor extends SerializerInterceptor({ fields: ['id'] }) {}
