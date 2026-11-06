import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { HttpLoggerInterceptor } from '../common/interceptors/http-logger.interceptor';

export function configureApp(app: INestApplication) {
  app.enableCors({
    origin: [process.env.FRONTEND_URL].filter((url): url is string => Boolean(url)),
    credentials: true,
  });
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.useGlobalInterceptors(new HttpLoggerInterceptor());
}
