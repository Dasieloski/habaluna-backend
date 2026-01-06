import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

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
      let hostname = urlObj.hostname.replace(/^www\./, ''); // Remover www
      return hostname;
    } catch {
      return url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
    }
  };
  
  app.enableCors({
    origin: (origin, callback) => {
      // Permitir requests sin origin (mobile apps, Postman, curl, etc.)
      if (!origin) {
        console.log('✅ CORS: Request sin origin permitido');
        return callback(null, true);
      }
      
      // En desarrollo, permitir cualquier origen localhost
      if (process.env.NODE_ENV !== 'production') {
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
          console.log(`✅ CORS: Origen localhost permitido: ${origin}`);
          return callback(null, true);
        }
      }
      
      // Normalizar URLs (sin trailing slash y sin protocolo para comparación)
      const normalizedOrigin = origin.replace(/\/$/, '').toLowerCase();
      const normalizedFrontendUrl = frontendUrl.replace(/\/$/, '').toLowerCase();
      
      // Verificar coincidencia exacta
      if (normalizedOrigin === normalizedFrontendUrl) {
        console.log(`✅ CORS: Origen permitido (exacto): ${origin}`);
        return callback(null, true);
      }
      
      // Verificar si es el mismo dominio (con/sin www)
      const originDomain = getBaseDomain(normalizedOrigin);
      const frontendDomain = getBaseDomain(normalizedFrontendUrl);
      
      if (originDomain === frontendDomain) {
        console.log(`✅ CORS: Origen permitido (mismo dominio): ${origin} (${originDomain})`);
        return callback(null, true);
      }
      
      // Permitir dominios de Railway (para desarrollo/testing)
      if (normalizedOrigin.includes('.railway.app')) {
        console.log(`✅ CORS: Origen permitido (Railway): ${origin}`);
        return callback(null, true);
      }
      
      // Log para debugging
      console.log(`⚠️ CORS: Origen bloqueado: ${origin}`);
      console.log(`   Origen normalizado: ${normalizedOrigin}`);
      console.log(`   Dominio origen: ${originDomain}`);
      console.log(`   Frontend esperado: ${normalizedFrontendUrl}`);
      console.log(`   Dominio frontend: ${frontendDomain}`);
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
    exposedHeaders: ['Authorization'],
    maxAge: 86400, // 24 horas
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // Global prefix
  app.setGlobalPrefix('api');

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
  console.log(`🚀 Server running on http://localhost:${port}`);
  console.log(`📚 Swagger docs available at http://localhost:${port}/api/docs`);
}

bootstrap();
