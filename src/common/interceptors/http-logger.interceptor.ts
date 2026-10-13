import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, catchError } from 'rxjs';
import { throwError } from 'rxjs';

@Injectable()
export class HttpLoggerInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, url, body } = req;

    return next.handle().pipe(
      catchError((error) => {
        console.error(`[${method}] ${url} → ${error?.status || 500} | ${error?.message}`, body);
        return throwError(() => error);
      }),
    );
  }
}
