import { NestInterceptor, ExecutionContext, CallHandler, Injectable } from '@nestjs/common';
import { map } from 'rxjs/operators';
import { Request } from 'express';
import { SerializerService } from './service';
import { intersection } from 'lodash';

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
      const request = ctx.switchToHttp().getRequest<Request>();

      const scopes = this.getScopes(ctx);

      request.query.scopes = scopes;

      return next.handle().pipe(
        map(async (responsePromise) => {
          const response = await responsePromise;

          if (!scopes && !config.fields) {
            return response;
          }

          return this.serializerService.transform(response, {
            scopes,
            fields: config.fields,
          });
        }),
      );
    }

    getScopes(ctx: ExecutionContext) {
      const request = ctx.switchToHttp().getRequest<Request>();

      if (request.query.extended) {
        return config.extendedScopes || config.scopes;
      }

      if (request.query.limited) {
        return config.limitedScopes || this.serializerService.config.globalLimitedScopes || config.scopes;
      }

      if (request.query.secret) {
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
