import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { json, urlencoded } from 'express';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setGlobalPrefix('api');
  app.enableCors();

  // Filet de sécurité : ajustement modéré de la limite body-parser à 1 Mo pour absorber les données SIG/cycloniques
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: true, limit: '1mb' }));

  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('API Géodécisionnel Madagascar')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();

  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));

  await app.listen(process.env.BACKEND_PORT ?? 3001);
}

bootstrap();
