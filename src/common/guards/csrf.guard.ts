import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * Guard CSRF para proteger endpoints mutables (POST, PUT, PATCH, DELETE)
 * 
 * Funciona con cookies SameSite y tokens CSRF
 * El token se genera en GET requests y se valida en requests mutables
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  private readonly csrfSecret: string;
  private readonly cookieName = 'XSRF-TOKEN';
  private readonly headerName = 'X-XSRF-TOKEN';

  constructor(private configService: ConfigService) {
    // Usar JWT_SECRET como base para CSRF, o generar uno específico
    this.csrfSecret = this.configService.get<string>('CSRF_SECRET') || 
                      this.configService.get<string>('JWT_SECRET') || 
                      'default-csrf-secret-change-in-production';
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const method = request.method;
    const path = request.path;

    // Verificar si CSRF está habilitado (por defecto deshabilitado para APIs REST)
    const csrfEnabled = this.configService.get<string>('ENABLE_CSRF') === 'true';
    
    if (!csrfEnabled) {
      return true; // CSRF deshabilitado, permitir todas las requests
    }

    // Excluir endpoints públicos (health checks, docs, etc.)
    const publicPaths = ['/api/health', '/api/docs', '/api/docs-json'];
    if (publicPaths.some(publicPath => path.startsWith(publicPath))) {
      return true;
    }

    // Solo proteger métodos mutables
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      // Para GET requests, generar y enviar token CSRF
      if (method === 'GET') {
        this.generateAndSetToken(request, response);
      }
      return true;
    }

    // Validar token CSRF en métodos mutables
    const tokenFromHeader = request.headers[this.headerName.toLowerCase()] as string;
    const tokenFromCookie = request.cookies?.[this.cookieName];

    if (!tokenFromHeader || !tokenFromCookie) {
      throw new ForbiddenException('CSRF token missing');
    }

    if (tokenFromHeader !== tokenFromCookie) {
      throw new ForbiddenException('Invalid CSRF token');
    }

    // Verificar que el token es válido
    if (!this.validateToken(tokenFromHeader)) {
      throw new ForbiddenException('Invalid CSRF token format');
    }

    return true;
  }

  private generateAndSetToken(request: Request, response: Response): void {
    const token = this.generateToken();
    
    // Establecer cookie con SameSite=Strict para protección CSRF
    response.cookie(this.cookieName, token, {
      httpOnly: false, // Debe ser false para que JavaScript pueda leerlo
      secure: process.env.NODE_ENV === 'production', // Solo HTTPS en producción
      sameSite: 'strict', // Protección CSRF
      maxAge: 24 * 60 * 60 * 1000, // 24 horas
      path: '/',
    });

    // También enviar en header para fácil acceso
    response.setHeader(this.headerName, token);
  }

  private generateToken(): string {
    // Generar token aleatorio seguro
    return crypto.randomBytes(32).toString('hex');
  }

  private validateToken(token: string): boolean {
    // Validar formato del token (64 caracteres hex)
    return /^[a-f0-9]{64}$/i.test(token);
  }
}
