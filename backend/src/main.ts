import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConsoleLogger, ValidationPipe } from '@nestjs/common';
import { json, NextFunction, Request, Response } from 'express';
import { AppModule } from '@/app.module';
import { PrismaService } from '@/common/prisma/prisma.service';
import { ApiDbLoggerMiddleware } from '@/common/middlewares/api-db-logger.middleware';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new ConsoleLogger({
      logLevels: ['log', 'error', 'warn', 'debug', 'verbose'],
      prefix: 'stock-app-api',
    }),
  });

  const prismaService = app.get(PrismaService);
  const apiDbLoggerMiddleware = new ApiDbLoggerMiddleware(prismaService);
  app.use((req: Request, res: Response, next: NextFunction) =>
    apiDbLoggerMiddleware.use(req, res, next),
  );
  app.use(json({ limit: '50mb' }));

  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'https://dev-app-381393991104.us-central1.run.app',
      'https://baseplate.huboxt.com',
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    // allowedHeaders: 'Content-Type, Accept, Authorization',
    // exposedHeaders: 'Content-Length, X-Knowledge-Base',
    credentials: true, // Allow cookies
    // preflightContinue: false,
    // optionsSuccessStatus: 204,
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
