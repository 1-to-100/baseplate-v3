import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConsoleLogger, ValidationPipe } from '@nestjs/common';
import { json, NextFunction, Request, Response } from 'express';
import { AppModule } from '@/app.module';
import { DatabaseService } from '@/common/database/database.service';
import { ApiDbLoggerMiddleware } from '@/common/middlewares/api-db-logger.middleware';
import { ConfigService } from '@nestjs/config';

let app: any;

async function createApp() {
  if (!app) {
    app = await NestFactory.create(AppModule, {
      logger: new ConsoleLogger({
        logLevels: ['log', 'error', 'warn', 'debug', 'verbose'],
        prefix: 'baseplate-api',
      }),
    });

    const databaseService = app.get(DatabaseService);
    const apiDbLoggerMiddleware = new ApiDbLoggerMiddleware(databaseService);
    app.use((req: Request, res: Response, next: NextFunction) =>
      apiDbLoggerMiddleware.use(req, res, next),
    );
    app.use(json({ limit: '50mb' }));

    const configService = app.get(ConfigService);
    const frontendUrl = configService.get('FRONTEND_URL');

    app.enableCors({
      origin: [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
        "https://1to100.huboxt.com",
        "https://1to100-api.huboxt.com",
        "https://app-baseplate-v2.vercel.app",
        ...(frontendUrl ? [frontendUrl] : []),
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

    await app.init();
  }
  return app;
}

// For Vercel serverless
export const handler = async (req: any, res: any) => {
  try {
    const app = await createApp();
    const server = app.getHttpAdapter().getInstance();
    server(req, res);
  } catch (error) {
    console.error('Error in serverless handler:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// For traditional server deployment
async function bootstrap() {
  const app = await createApp();
  const configService = app.get(ConfigService);
  await app.listen(configService.get('PORT') ?? 3000);
}

// Only run bootstrap if not in serverless environment
if (process.env.NODE_ENV !== 'production' || process.env.VERCEL !== '1') {
  void bootstrap();
}
