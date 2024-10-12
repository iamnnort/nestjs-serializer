import { NestInterceptor, ExecutionContext, CallHandler, Injectable } from '@nestjs/common';
import { map } from 'rxjs/operators';
import { Request } from 'express';
import { SerializerService } from './service';

export const SerializerInterceptor = (scopes: string[], extendedScopes?: string[]) => {
  @Injectable()
  class SerializerInterceptor implements NestInterceptor {
    constructor(public serializerService: SerializerService) {}

    intercept(ctx: ExecutionContext, next: CallHandler<Promise<any>>) {
      const actualScopes = this.getScopes(ctx);

      return next.handle().pipe(
        map(async (responsePromise) => {
          if (!actualScopes) {
            return responsePromise;
          }

          const response = await responsePromise;

          return this.serializerService.transform(response, actualScopes);
        }),
      );
    }

    getScopes(ctx: ExecutionContext) {
      const request = ctx.switchToHttp().getRequest<Request>();

      if (request.query.extended) {
        return extendedScopes || scopes;
      }

      return scopes;
    }
  }

  return SerializerInterceptor;
};
