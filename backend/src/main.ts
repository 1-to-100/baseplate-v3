import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConsoleLogger, ValidationPipe } from '@nestjs/common';
import { json, NextFunction, Request, Response } from 'express';
import { AppModule } from '@/app.module';
import { DatabaseService } from '@/common/database/database.service';
import { ApiDbLoggerMiddleware } from '@/common/middlewares/api-db-logger.middleware';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new ConsoleLogger({
      logLevels: ['log', 'error', 'warn', 'debug', 'verbose'],
      prefix: 'stock-app-api',
    }),
  });

  const databaseService = app.get(DatabaseService);
  const apiDbLoggerMiddleware = new ApiDbLoggerMiddleware(databaseService);
  app.use((req: Request, res: Response, next: NextFunction) =>
    apiDbLoggerMiddleware.use(req, res, next),
  );
  app.use(json({ limit: '50mb' }));

  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      "https://1to100.huboxt.com",
      "https://1to100-api.huboxt.com",
      "https://app-baseplate-v2.vercel.app",
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Accept, Authorization, X-Requested-With',
    exposedHeaders: 'Content-Length, X-Knowledge-Base',
    credentials: true, // Allow cookies
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });
  
  const config = new DocumentBuilder()
    .setTitle('Baseplate API')
    .setDescription('The Baseplate API description')
    .setVersion('0.1.0')
    .addTag('baseplate')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, documentFactory);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  const configService = app.get(ConfigService);
  await app.listen(configService.get<number>('PORT') ?? 3000);
}

void bootstrap();
