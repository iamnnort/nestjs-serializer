import { NestInterceptor, ExecutionContext, CallHandler, Injectable } from '@nestjs/common';
import { map } from 'rxjs/operators';
import { Request } from 'express';
import { SerializerService } from './service';
import { pick } from 'lodash';

export const SerializerInterceptor = (config: { scopes?: string[]; extendedScopes?: string[]; fields?: string[] }) => {
  @Injectable()
  class SerializerInterceptor implements NestInterceptor {
    constructor(public serializerService: SerializerService) {}

    intercept(ctx: ExecutionContext, next: CallHandler<Promise<any>>) {
      const scopes = this.getScopes(ctx);

      return next.handle().pipe(
        map(async (responsePromise) => {
          const response = await responsePromise;

          if (config.fields) {
            return pick(response, config.fields);
          }

          if (scopes) {
            return this.serializerService.transform(response, scopes);
          }

          return response;
        }),
      );
    }

    getScopes(ctx: ExecutionContext) {
      const request = ctx.switchToHttp().getRequest<Request>();

      if (request.query.extended) {
        return config.extendedScopes || config.scopes;
      }

      return config.scopes;
    }
  }

  return SerializerInterceptor;
};

@Injectable()
export class SerializerIdInterceptor extends SerializerInterceptor({ fields: ['id'] }) {}
