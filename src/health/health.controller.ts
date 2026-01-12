import { Controller, Get, HttpCode, HttpStatus, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { HealthService, HealthCheckResult } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({
    summary: 'Health check completo',
    description:
      'Verifica el estado completo del servicio incluyendo conexión a base de datos, memoria y uptime. Retorna 200 OK cuando todo está bien, 503 Service Unavailable cuando hay problemas.',
  })
  @ApiResponse({
    status: 200,
    description: 'Servicio saludable',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', example: '2024-01-15T10:30:00.000Z' },
        uptime: { type: 'number', example: 3600 },
        uptimeFormatted: { type: 'string', example: '1h 0m 0s' },
        memory: {
          type: 'object',
          properties: {
            total: { type: 'number', example: 8589934592 },
            free: { type: 'number', example: 4294967296 },
            used: { type: 'number', example: 4294967296 },
            percentage: { type: 'number', example: 50.0 },
          },
        },
        database: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'connected' },
            responseTime: { type: 'number', example: 5 },
          },
        },
        version: { type: 'string', example: '1.0.0' },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Servicio no disponible (problemas con base de datos u otros componentes)',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'error' },
        timestamp: { type: 'string', example: '2024-01-15T10:30:00.000Z' },
        uptime: { type: 'number', example: 3600 },
        uptimeFormatted: { type: 'string', example: '1h 0m 0s' },
        memory: {
          type: 'object',
          properties: {
            total: { type: 'number', example: 8589934592 },
            free: { type: 'number', example: 4294967296 },
            used: { type: 'number', example: 4294967296 },
            percentage: { type: 'number', example: 50.0 },
          },
        },
        database: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'disconnected' },
          },
        },
        version: { type: 'string', example: '1.0.0' },
      },
    },
  })
  async checkHealth(@Res() res: Response): Promise<void> {
    const health = await this.healthService.checkHealth();

    // Si hay problemas, retornar 503 con los datos del health check
    if (health.status === 'error') {
      res.status(HttpStatus.SERVICE_UNAVAILABLE).json(health);
      return;
    }

    res.status(HttpStatus.OK).json(health);
  }

  @Get('ready')
  @ApiOperation({
    summary: 'Readiness probe',
    description:
      'Verifica si el servicio está listo para recibir tráfico. Solo verifica la conexión a la base de datos. Útil para readiness probes en Kubernetes/Railway.',
  })
  @ApiResponse({
    status: 200,
    description: 'Servicio listo',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ready' },
        database: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'connected' },
            responseTime: { type: 'number', example: 5 },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Servicio no listo (base de datos no disponible)',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'not ready' },
        database: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'disconnected' },
          },
        },
      },
    },
  })
  async checkReadiness(@Res() res: Response): Promise<void> {
    const readiness = await this.healthService.checkReadiness();

    // Si no está listo, retornar 503 con los datos
    if (readiness.status === 'not ready') {
      res.status(HttpStatus.SERVICE_UNAVAILABLE).json(readiness);
      return;
    }

    res.status(HttpStatus.OK).json(readiness);
  }

  @Get('live')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Liveness probe',
    description:
      'Verifica si el servicio está vivo y corriendo. No verifica dependencias externas. Útil para liveness probes en Kubernetes/Railway.',
  })
  @ApiResponse({
    status: 200,
    description: 'Servicio vivo',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'alive' },
      },
    },
  })
  checkLiveness() {
    return this.healthService.checkLiveness();
  }
}
