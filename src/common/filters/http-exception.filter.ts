import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { WinstonLogger } from 'nest-winston';
import {
  PrismaClientKnownRequestError,
  PrismaClientValidationError,
  PrismaClientInitializationError,
  PrismaClientRustPanicError,
} from '@prisma/client/runtime/library';

/**
 * Códigos de error personalizados para diferentes tipos de fallos
 */
export enum ErrorCode {
  // Errores de validación (400)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',

  // Errores de autenticación (401)
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',

  // Errores de autorización (403)
  FORBIDDEN = 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',

  // Errores de recursos (404)
  NOT_FOUND = 'NOT_FOUND',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',

  // Errores de conflicto (409)
  CONFLICT = 'CONFLICT',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',

  // Errores de base de datos (500)
  DATABASE_ERROR = 'DATABASE_ERROR',
  DATABASE_CONNECTION_ERROR = 'DATABASE_CONNECTION_ERROR',
  DATABASE_QUERY_ERROR = 'DATABASE_QUERY_ERROR',

  // Errores internos (500)
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Interfaz para la respuesta de error normalizada
 */
interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  errorCode?: ErrorCode;
  timestamp: string;
  path: string;
  details?: any;
}

/**
 * Mapeo de códigos de error de Prisma a mensajes legibles
 */
const PRISMA_ERROR_MESSAGES: Record<
  string,
  { message: string; statusCode: number; errorCode: ErrorCode }
> = {
  P2000: {
    message: 'El valor proporcionado es demasiado largo para el campo',
    statusCode: HttpStatus.BAD_REQUEST,
    errorCode: ErrorCode.VALIDATION_ERROR,
  },
  P2001: {
    message: 'El registro no existe en la base de datos',
    statusCode: HttpStatus.NOT_FOUND,
    errorCode: ErrorCode.NOT_FOUND,
  },
  P2002: {
    message: 'Ya existe un registro con estos datos únicos',
    statusCode: HttpStatus.CONFLICT,
    errorCode: ErrorCode.DUPLICATE_ENTRY,
  },
  P2003: {
    message: 'Error de relación: el registro relacionado no existe',
    statusCode: HttpStatus.BAD_REQUEST,
    errorCode: ErrorCode.VALIDATION_ERROR,
  },
  P2004: {
    message: 'Restricción de base de datos violada',
    statusCode: HttpStatus.BAD_REQUEST,
    errorCode: ErrorCode.VALIDATION_ERROR,
  },
  P2005: {
    message: 'El valor proporcionado no es válido para el tipo de campo',
    statusCode: HttpStatus.BAD_REQUEST,
    errorCode: ErrorCode.INVALID_INPUT,
  },
  P2006: {
    message: 'El valor proporcionado no es válido para el campo',
    statusCode: HttpStatus.BAD_REQUEST,
    errorCode: ErrorCode.INVALID_INPUT,
  },
  P2007: {
    message: 'Error de validación de datos',
    statusCode: HttpStatus.BAD_REQUEST,
    errorCode: ErrorCode.VALIDATION_ERROR,
  },
  P2008: {
    message: 'Error al consultar la base de datos',
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    errorCode: ErrorCode.DATABASE_QUERY_ERROR,
  },
  P2009: {
    message: 'Error al validar la consulta',
    statusCode: HttpStatus.BAD_REQUEST,
    errorCode: ErrorCode.VALIDATION_ERROR,
  },
  P2010: {
    message: 'Error en el valor bruto de la consulta',
    statusCode: HttpStatus.BAD_REQUEST,
    errorCode: ErrorCode.VALIDATION_ERROR,
  },
  P2011: {
    message: 'Restricción de valor nulo violada',
    statusCode: HttpStatus.BAD_REQUEST,
    errorCode: ErrorCode.VALIDATION_ERROR,
  },
  P2012: {
    message: 'Error al buscar el registro',
    statusCode: HttpStatus.NOT_FOUND,
    errorCode: ErrorCode.NOT_FOUND,
  },
  P2013: {
    message: 'Falta un argumento requerido',
    statusCode: HttpStatus.BAD_REQUEST,
    errorCode: ErrorCode.VALIDATION_ERROR,
  },
  P2014: {
    message: 'Error de relación: el cambio viola una restricción',
    statusCode: HttpStatus.BAD_REQUEST,
    errorCode: ErrorCode.VALIDATION_ERROR,
  },
  P2015: {
    message: 'El registro relacionado no existe',
    statusCode: HttpStatus.NOT_FOUND,
    errorCode: ErrorCode.NOT_FOUND,
  },
  P2016: {
    message: 'Error de interpretación de consulta',
    statusCode: HttpStatus.BAD_REQUEST,
    errorCode: ErrorCode.VALIDATION_ERROR,
  },
  P2017: {
    message: 'Los registros relacionados no existen',
    statusCode: HttpStatus.NOT_FOUND,
    errorCode: ErrorCode.NOT_FOUND,
  },
  P2018: {
    message: 'Error al leer los datos requeridos',
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    errorCode: ErrorCode.DATABASE_QUERY_ERROR,
  },
  P2019: {
    message: 'Error de entrada: valor inválido',
    statusCode: HttpStatus.BAD_REQUEST,
    errorCode: ErrorCode.INVALID_INPUT,
  },
  P2020: {
    message: 'Valor fuera de rango para el tipo',
    statusCode: HttpStatus.BAD_REQUEST,
    errorCode: ErrorCode.INVALID_INPUT,
  },
  P2021: {
    message: 'La tabla no existe en la base de datos',
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    errorCode: ErrorCode.DATABASE_ERROR,
  },
  P2022: {
    message: 'La columna no existe en la base de datos',
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    errorCode: ErrorCode.DATABASE_ERROR,
  },
  P2023: {
    message: 'Inconsistencia en los datos solicitados',
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    errorCode: ErrorCode.DATABASE_ERROR,
  },
  P2024: {
    message: 'Timeout al conectar con la base de datos',
    statusCode: HttpStatus.REQUEST_TIMEOUT,
    errorCode: ErrorCode.DATABASE_CONNECTION_ERROR,
  },
  P2025: {
    message: 'El registro no existe',
    statusCode: HttpStatus.NOT_FOUND,
    errorCode: ErrorCode.NOT_FOUND,
  },
  P2026: {
    message: 'Caracteres no soportados en la consulta',
    statusCode: HttpStatus.BAD_REQUEST,
    errorCode: ErrorCode.VALIDATION_ERROR,
  },
  P2027: {
    message: 'Múltiples errores ocurrieron durante la consulta',
    statusCode: HttpStatus.BAD_REQUEST,
    errorCode: ErrorCode.VALIDATION_ERROR,
  },
  P2030: {
    message: 'Error al buscar información de índice',
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    errorCode: ErrorCode.DATABASE_ERROR,
  },
  P2031: {
    message: 'Error al buscar información de tabla',
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    errorCode: ErrorCode.DATABASE_ERROR,
  },
  P2033: {
    message: 'Error al buscar información de base de datos',
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    errorCode: ErrorCode.DATABASE_ERROR,
  },
  P2034: {
    message: 'Transacción fallida',
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    errorCode: ErrorCode.DATABASE_ERROR,
  },
  P1001: {
    message: 'No se puede conectar con el servidor de base de datos',
    statusCode: HttpStatus.SERVICE_UNAVAILABLE,
    errorCode: ErrorCode.DATABASE_CONNECTION_ERROR,
  },
  P1008: {
    message: 'Las operaciones en la base de datos fueron rechazadas',
    statusCode: HttpStatus.SERVICE_UNAVAILABLE,
    errorCode: ErrorCode.DATABASE_CONNECTION_ERROR,
  },
  P1013: {
    message: 'La cadena de conexión de la base de datos es inválida',
    statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    errorCode: ErrorCode.DATABASE_CONNECTION_ERROR,
  },
  P1017: {
    message: 'El servidor de base de datos cerró la conexión',
    statusCode: HttpStatus.SERVICE_UNAVAILABLE,
    errorCode: ErrorCode.DATABASE_CONNECTION_ERROR,
  },
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger: WinstonLogger;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    winstonLogger: WinstonLogger,
  ) {
    this.logger = winstonLogger;
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const path = request.url;

    let errorResponse: ErrorResponse;

    // Manejo de excepciones de Prisma
    if (exception instanceof PrismaClientKnownRequestError) {
      errorResponse = this.handlePrismaKnownError(exception, path);
    } else if (exception instanceof PrismaClientValidationError) {
      errorResponse = this.handlePrismaValidationError(exception, path);
    } else if (
      exception instanceof PrismaClientInitializationError ||
      exception instanceof PrismaClientRustPanicError
    ) {
      errorResponse = this.handlePrismaInitializationError(exception, path);
    }
    // Manejo de excepciones HTTP de NestJS
    else if (exception instanceof HttpException) {
      errorResponse = this.handleHttpException(exception, path);
    }
    // Manejo de errores genéricos
    else {
      errorResponse = this.handleUnknownError(exception, path);
    }

    // Logging estructurado
    this.logError(exception, errorResponse, request);

    // Enviar respuesta
    response.status(errorResponse.statusCode).json(errorResponse);
  }

  /**
   * Maneja errores conocidos de Prisma (PrismaClientKnownRequestError)
   */
  private handlePrismaKnownError(
    exception: PrismaClientKnownRequestError,
    path: string,
  ): ErrorResponse {
    const errorInfo = PRISMA_ERROR_MESSAGES[exception.code] || {
      message: 'Error en la base de datos',
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      errorCode: ErrorCode.DATABASE_ERROR,
    };

    // Mensaje personalizado para errores de duplicado
    let message = errorInfo.message;
    if (exception.code === 'P2002') {
      const target = (exception.meta?.target as string[]) || [];
      const field = target.length > 0 ? target[0] : 'campo único';
      message = `Ya existe un registro con este ${field}`;
    }

    return {
      statusCode: errorInfo.statusCode,
      message,
      error: HttpStatus[errorInfo.statusCode] || 'Error',
      errorCode: errorInfo.errorCode,
      timestamp: new Date().toISOString(),
      path,
      details:
        process.env.NODE_ENV !== 'production'
          ? {
              prismaCode: exception.code,
              meta: exception.meta,
            }
          : undefined,
    };
  }

  /**
   * Maneja errores de validación de Prisma
   */
  private handlePrismaValidationError(
    exception: PrismaClientValidationError,
    path: string,
  ): ErrorResponse {
    // Extraer mensaje más legible del error de Prisma
    const message =
      exception.message
        .split('\n')
        .find((line) => line.includes('Argument') || line.includes('Unknown')) ||
      'Error de validación en los datos proporcionados';

    return {
      statusCode: HttpStatus.BAD_REQUEST,
      message: message.replace(/^\d+\s+/, '').trim(),
      error: 'Bad Request',
      errorCode: ErrorCode.VALIDATION_ERROR,
      timestamp: new Date().toISOString(),
      path,
      details:
        process.env.NODE_ENV !== 'production'
          ? {
              originalMessage: exception.message,
            }
          : undefined,
    };
  }

  /**
   * Maneja errores de inicialización de Prisma
   */
  private handlePrismaInitializationError(
    exception: PrismaClientInitializationError | PrismaClientRustPanicError,
    path: string,
  ): ErrorResponse {
    return {
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      message: 'Error de conexión con la base de datos. Por favor, intente más tarde.',
      error: 'Service Unavailable',
      errorCode: ErrorCode.DATABASE_CONNECTION_ERROR,
      timestamp: new Date().toISOString(),
      path,
      details:
        process.env.NODE_ENV !== 'production'
          ? {
              errorType: exception.constructor.name,
            }
          : undefined,
    };
  }

  /**
   * Maneja excepciones HTTP de NestJS
   */
  private handleHttpException(exception: HttpException, path: string): ErrorResponse {
    const statusCode = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    let message: string | string[];
    let errorCode: ErrorCode | undefined;

    // Determinar código de error basado en el status code
    switch (statusCode) {
      case HttpStatus.BAD_REQUEST:
        errorCode = ErrorCode.VALIDATION_ERROR;
        break;
      case HttpStatus.UNAUTHORIZED:
        errorCode = ErrorCode.UNAUTHORIZED;
        break;
      case HttpStatus.FORBIDDEN:
        errorCode = ErrorCode.FORBIDDEN;
        break;
      case HttpStatus.NOT_FOUND:
        errorCode = ErrorCode.NOT_FOUND;
        break;
      case HttpStatus.CONFLICT:
        errorCode = ErrorCode.CONFLICT;
        break;
      default:
        errorCode = undefined;
    }

    // Extraer mensaje de la respuesta
    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const responseObj = exceptionResponse as any;
      message = responseObj.message || exception.message;

      // Si hay un array de mensajes de validación, usarlo
      if (Array.isArray(responseObj.message)) {
        message = responseObj.message;
      }
    } else {
      message = exception.message;
    }

    return {
      statusCode,
      message,
      error: HttpStatus[statusCode] || 'Error',
      errorCode,
      timestamp: new Date().toISOString(),
      path,
    };
  }

  /**
   * Maneja errores desconocidos
   */
  private handleUnknownError(exception: unknown, path: string): ErrorResponse {
    const isProduction = process.env.NODE_ENV === 'production';
    const error = exception as Error;

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: isProduction
        ? 'Ha ocurrido un error interno del servidor'
        : error.message || 'Error desconocido',
      error: 'Internal Server Error',
      errorCode: ErrorCode.INTERNAL_SERVER_ERROR,
      timestamp: new Date().toISOString(),
      path,
      details: isProduction
        ? undefined
        : {
            errorType: error.constructor?.name || 'Unknown',
            stack: error.stack,
          },
    };
  }

  /**
   * Logging estructurado de errores
   */
  private logError(exception: unknown, errorResponse: ErrorResponse, request: Request): void {
    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] || 'Unknown';
    const userId = (request as any).user?.id || 'anonymous';

    const logMeta = {
      statusCode: errorResponse.statusCode,
      errorCode: errorResponse.errorCode,
      method,
      url,
      ip,
      userAgent,
      userId,
      timestamp: errorResponse.timestamp,
      path: errorResponse.path,
      message: errorResponse.message,
    };

    // Log según el nivel de severidad
    if (errorResponse.statusCode >= 500) {
      const stack = exception instanceof Error ? exception.stack : String(exception);
      this.logger.error(
        `[${errorResponse.errorCode || 'UNKNOWN'}] ${errorResponse.message} - ${JSON.stringify(logMeta)}`,
        stack,
        'HttpExceptionFilter',
      );
    } else if (errorResponse.statusCode >= 400) {
      this.logger.warn(
        `[${errorResponse.errorCode || 'UNKNOWN'}] ${errorResponse.message} - ${JSON.stringify(logMeta)}`,
        'HttpExceptionFilter',
      );
    } else {
      this.logger.debug(
        `[${errorResponse.errorCode || 'UNKNOWN'}] ${errorResponse.message} - ${JSON.stringify(logMeta)}`,
        'HttpExceptionFilter',
      );
    }
  }
}
