import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as os from 'os';

export interface HealthCheckResult {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  uptimeFormatted: string;
  memory: {
    total: number;
    free: number;
    used: number;
    percentage: number;
  };
  database: {
    status: 'connected' | 'disconnected';
    responseTime?: number;
  };
  version: string;
}

@Injectable()
export class HealthService {
  private readonly startTime = Date.now();
  private readonly version = process.env.npm_package_version || '1.0.0';

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Verifica el estado completo del servicio
   */
  async checkHealth(): Promise<HealthCheckResult> {
    const uptime = process.uptime();
    const memory = this.getMemoryInfo();
    const dbCheck = await this.checkDatabase();

    const isHealthy = dbCheck.status === 'connected';

    return {
      status: isHealthy ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      uptime,
      uptimeFormatted: this.formatUptime(uptime),
      memory,
      database: dbCheck,
      version: this.version,
    };
  }

  /**
   * Verifica solo la conexión a la base de datos (readiness probe)
   */
  async checkReadiness(): Promise<{ status: 'ready' | 'not ready'; database: { status: string; responseTime?: number } }> {
    const dbCheck = await this.checkDatabase();
    return {
      status: dbCheck.status === 'connected' ? 'ready' : 'not ready',
      database: dbCheck,
    };
  }

  /**
   * Verifica solo que el servicio esté corriendo (liveness probe)
   */
  checkLiveness(): { status: 'alive' } {
    return {
      status: 'alive',
    };
  }

  /**
   * Verifica la conexión a la base de datos
   */
  private async checkDatabase(): Promise<{ status: 'connected' | 'disconnected'; responseTime?: number }> {
    try {
      const startTime = Date.now();
      // Ejecutar query simple para verificar conexión
      await this.prisma.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - startTime;

      return {
        status: 'connected',
        responseTime,
      };
    } catch (error) {
      return {
        status: 'disconnected',
      };
    }
  }

  /**
   * Obtiene información de memoria del sistema
   */
  private getMemoryInfo(): {
    total: number;
    free: number;
    used: number;
    percentage: number;
  } {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const percentage = (usedMemory / totalMemory) * 100;

    return {
      total: totalMemory,
      free: freeMemory,
      used: usedMemory,
      percentage: Math.round(percentage * 100) / 100,
    };
  }

  /**
   * Formatea el tiempo de uptime en formato legible
   */
  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m ${secs}s`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  }
}
