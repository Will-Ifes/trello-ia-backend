import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable, catchError } from 'rxjs';
import { throwError } from 'rxjs';

@Injectable()
export class HttpLoggerInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const { method, path } = req;

    return next.handle().pipe(
      catchError((error: unknown) => {
        if (process.env.NODE_ENV !== 'test')
          console.error(
            `[${method}] ${path} → ${error instanceof HttpException ? error.getStatus() : 500}`,
          );
        return throwError(() => error);
      }),
    );
  }
}
