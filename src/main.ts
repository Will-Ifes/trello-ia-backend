import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import { HttpLoggerInterceptor } from './common/interceptors/http-logger.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: [process.env.FRONTEND_URL].filter(Boolean),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  app.use(cookieParser());
  app.useGlobalInterceptors(new HttpLoggerInterceptor());

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();
