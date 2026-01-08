import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  // Usar Winston como logger global
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  const logger = new Logger('Bootstrap');

  // Servir archivos estáticos
  const uploadsPath = join(process.cwd(), 'uploads');
  app.useStaticAssets(uploadsPath, {
    prefix: '/uploads',
  });

  // CORS - Configuración flexible para producción
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  // Función para normalizar dominio (extraer dominio base sin www)
  const getBaseDomain = (url: string): string => {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.replace(/^www\./, ''); // Remover www
      return hostname;
    } catch {
      return url
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .replace(/\/$/, '');
    }
  };

  app.enableCors({
    origin: (origin, callback) => {
      // Permitir requests sin origin (mobile apps, Postman, curl, etc.)
      if (!origin) {
        logger.debug('CORS: Request sin origin permitido', 'CORS');
        return callback(null, true);
      }

      // En desarrollo, permitir cualquier origen localhost
      if (process.env.NODE_ENV !== 'production') {
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
          logger.debug(`CORS: Origen localhost permitido: ${origin}`, 'CORS');
          return callback(null, true);
        }
      }

      // Normalizar URLs (sin trailing slash y sin protocolo para comparación)
      const normalizedOrigin = origin.replace(/\/$/, '').toLowerCase();
      const normalizedFrontendUrl = frontendUrl.replace(/\/$/, '').toLowerCase();

      // Verificar coincidencia exacta
      if (normalizedOrigin === normalizedFrontendUrl) {
        logger.debug(`CORS: Origen permitido (exacto): ${origin}`, 'CORS');
        return callback(null, true);
      }

      // Verificar si es el mismo dominio (con/sin www)
      const originDomain = getBaseDomain(normalizedOrigin);
      const frontendDomain = getBaseDomain(normalizedFrontendUrl);

      if (originDomain === frontendDomain) {
        logger.debug(`CORS: Origen permitido (mismo dominio): ${origin} (${originDomain})`, 'CORS');
        return callback(null, true);
      }

      // Permitir dominios de Railway (para desarrollo/testing)
      if (normalizedOrigin.includes('.railway.app')) {
        logger.debug(`CORS: Origen permitido (Railway): ${origin}`, 'CORS');
        return callback(null, true);
      }

      // Log para debugging
      logger.warn(`CORS: Origen bloqueado: ${origin}`, 'CORS', {
        normalizedOrigin,
        originDomain,
        normalizedFrontendUrl,
        frontendDomain,
      });
      callback(new Error('No permitido por CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'Access-Control-Request-Method',
      'Access-Control-Request-Headers',
    ],
    // Importante: permitir que el cliente lea los headers de rate limiting
    exposedHeaders: [
      'Authorization',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
      'Retry-After',
    ],
    maxAge: 86400, // 24 horas
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // Con proxies (Railway / reverse proxy), Express debe confiar en X-Forwarded-For
  if (process.env.TRUST_PROXY === 'true' || process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  // Global prefix
  app.setGlobalPrefix('api');

  // Global Exception Filter - Debe ir antes de otros middlewares
  // Usar el contenedor de DI para que el filtro pueda inyectar dependencias
  const httpExceptionFilter = app.get(HttpExceptionFilter);
  app.useGlobalFilters(httpExceptionFilter);

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false, // Permitir campos adicionales para multipart/form-data
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Habanaluna API')
    .setDescription('API para ecommerce premium de productos de alimentación')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);
  logger.log(`🚀 Server running on http://localhost:${port}`, 'Bootstrap');
  logger.log(`📚 Swagger docs available at http://localhost:${port}/api/docs`, 'Bootstrap');
}

bootstrap();
