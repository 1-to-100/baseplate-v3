const { NestFactory } = require('@nestjs/core');
const { SwaggerModule, DocumentBuilder } = require('@nestjs/swagger');
const { ConsoleLogger, ValidationPipe } = require('@nestjs/common');
const { json } = require('express');

// Import the compiled app module
const { AppModule } = require('./dist/main');

let app;

async function createApp() {
  if (!app) {
    app = await NestFactory.create(AppModule, {
      logger: new ConsoleLogger({
        logLevels: ['log', 'error', 'warn', 'debug', 'verbose'],
        prefix: 'baseplate-api',
      }),
    });

    // Add middleware
    app.use(json({ limit: '50mb' }));

    const frontendUrl = configService.get<string>('FRONTEND_URL');

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

    // Setup Swagger
    const config = new DocumentBuilder()
      .setTitle('Baseplate API')
      .setDescription('The Baseplate API description')
      .setVersion('0.1.0')
      .addTag('baseplate')
      .build();
    const documentFactory = () => SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, documentFactory);

    // Global validation pipe
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

module.exports = async (req, res) => {
  try {
    const app = await createApp();
    const server = app.getHttpAdapter().getInstance();
    server(req, res);
  } catch (error) {
    console.error('Error in Vercel handler:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
