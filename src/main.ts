import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';

async function bootstrap() {
  const config = new ConfigService();
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'verbose', 'log'],
  });

  app.set('trust proxy', 1);
  app.use(helmet());
  app.enableCors();

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );

  if (
    config.get<boolean>('USE_COMPRESSION') === true ||
    config.get('USE_COMPRESSION') === 'true'
  ) {
    app.use(compression());
  }

  await app.listen(+config.get('PORT'));
}
bootstrap();
