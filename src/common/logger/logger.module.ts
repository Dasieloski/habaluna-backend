import { Module } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const isProduction = process.env.NODE_ENV === 'production';
const logLevel = process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug');

// Asegurar que el directorio de logs existe
const logsDir = join(process.cwd(), 'logs');
if (!existsSync(logsDir)) {
  mkdirSync(logsDir, { recursive: true });
}

// Formato para desarrollo (legible)
const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, context, trace, ...meta }) => {
    let log = `${timestamp} [${context || 'Application'}] ${level}: ${message}`;

    // Agregar metadata si existe
    if (Object.keys(meta).length > 0) {
      log += ` ${JSON.stringify(meta)}`;
    }

    // Agregar stack trace si existe
    if (trace) {
      log += `\n${trace}`;
    }

    return log;
  }),
);

// Formato para producción (JSON)
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

// Configuración de rotación de archivos
const createDailyRotateFileTransport = (level: string, filename: string): DailyRotateFile => {
  return new DailyRotateFile({
    level,
    filename: join(process.cwd(), 'logs', `${filename}-%DATE%.log`),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '30d', // Mantener logs por 30 días
    format: productionFormat,
  });
};

// Transports según el entorno
const transports: winston.transport[] = [
  // Console transport (siempre activo)
  new winston.transports.Console({
    level: logLevel,
    format: isProduction ? productionFormat : developmentFormat,
  }),
];

// En producción, agregar transports de archivo
if (isProduction) {
  // Logs de error
  transports.push(createDailyRotateFileTransport('error', 'error'));

  // Logs de warn
  transports.push(createDailyRotateFileTransport('warn', 'warn'));

  // Todos los logs
  transports.push(createDailyRotateFileTransport('info', 'combined'));
} else {
  // En desarrollo, también guardar errores en archivo
  transports.push(
    new winston.transports.File({
      level: 'error',
      filename: join(process.cwd(), 'logs', 'error.log'),
      format: productionFormat,
    }),
  );
}

@Module({
  imports: [
    WinstonModule.forRoot({
      level: logLevel,
      transports,
      // Manejo de excepciones no capturadas
      exceptionHandlers: [
        new winston.transports.File({
          filename: join(process.cwd(), 'logs', 'exceptions.log'),
          format: productionFormat,
        }),
      ],
      // Manejo de rechazos de promesas no manejadas
      rejectionHandlers: [
        new winston.transports.File({
          filename: join(process.cwd(), 'logs', 'rejections.log'),
          format: productionFormat,
        }),
      ],
    }),
  ],
  exports: [WinstonModule],
})
export class LoggerModule {}
