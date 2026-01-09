import { BadRequestException, Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { EmailService } from '../common/email/email.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
    private config: ConfigService,
    private email: EmailService,
  ) {}

  private hashResetToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private getFrontendBaseUrl(): string {
    // Reusar FRONTEND_URL si existe (ya se usa para CORS); fallback razonable.
    const url = (this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000').trim();
    return url.replace(/\/$/, '');
  }

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user?.isActive === false) {
      return null;
    }
    if (user && (await bcrypt.compare(password, user.password))) {
      const { password: _, ...result } = user;
      return result;
    }
    return null;
  }

  async login(loginDto: LoginDto) {
    try {
      const user = await this.validateUser(loginDto.email, loginDto.password);
      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const tokens = await this.generateTokens(user.id, user.email, user.role);
      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        ...tokens,
      };
    } catch (error) {
      this.logger.error(
        'Error en login',
        error instanceof Error ? error.stack : String(error),
        'AuthService',
        {
          email: loginDto.email,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new Error(`Login failed: ${error.message}`);
    }
  }

  async register(registerDto: RegisterDto) {
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const user = await this.usersService.create({
      ...registerDto,
      password: hashedPassword,
    });

    // Enviar email de bienvenida (no bloquea el registro si falla)
    try {
      await this.email.sendWelcomeEmail({
        to: user.email,
        firstName: user.firstName || undefined,
      });
    } catch (error) {
      this.logger.warn('Error enviando email de bienvenida', error instanceof Error ? error.stack : String(error));
      // No fallar el registro si el email falla
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);
    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      ...tokens,
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });

      const tokenRecord = await this.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: true },
      });

      if (
        !tokenRecord ||
        tokenRecord.expiresAt < new Date() ||
        tokenRecord.user?.isActive === false
      ) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const tokens = await this.generateTokens(payload.sub, payload.email, payload.role);

      return tokens;
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async generateTokens(userId: string, email: string, role: string) {
    try {
      // Verificar que las variables de entorno estén configuradas
      const jwtSecret = this.config.get('JWT_SECRET');
      const jwtRefreshSecret = this.config.get('JWT_REFRESH_SECRET');

      if (!jwtSecret) {
        this.logger.error('JWT_SECRET no está configurado', undefined, 'AuthService');
        throw new Error('JWT_SECRET is not configured');
      }

      if (!jwtRefreshSecret) {
        this.logger.error('JWT_REFRESH_SECRET no está configurado', undefined, 'AuthService');
        throw new Error('JWT_REFRESH_SECRET is not configured');
      }

      const payload = { sub: userId, email, role };

      const accessToken = this.jwtService.sign(payload);
      const refreshToken = this.jwtService.sign(payload, {
        secret: jwtRefreshSecret,
        expiresIn: this.config.get('JWT_REFRESH_EXPIRATION') || '7d',
      });

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Intentar crear el refresh token en la base de datos
      try {
        await this.prisma.refreshToken.create({
          data: {
            token: refreshToken,
            userId,
            expiresAt,
          },
        });
      } catch (dbError: any) {
        this.logger.error(
          'Error al crear refreshToken en la base de datos',
          dbError.stack || String(dbError),
          'AuthService',
          {
            code: dbError.code,
            message: dbError.message,
            meta: dbError.meta,
            userId,
          },
        );

        // Errores comunes de Prisma
        if (dbError.code === 'P2001') {
          throw new Error(
            'Database table refresh_tokens does not exist. Please run: npx prisma migrate deploy',
          );
        }
        if (dbError.code === 'P2002') {
          throw new Error('Refresh token already exists (duplicate). This should not happen.');
        }
        if (dbError.code === 'P1001') {
          throw new Error('Cannot reach database server. Check DATABASE_URL configuration.');
        }
        if (dbError.message?.includes('table') || dbError.message?.includes('does not exist')) {
          throw new Error(
            'Database table refresh_tokens does not exist. Please run: npx prisma migrate deploy',
          );
        }
        throw dbError;
      }

      return {
        accessToken,
        refreshToken,
      };
    } catch (error) {
      this.logger.error(
        'Error al generar tokens',
        error instanceof Error ? error.stack : String(error),
        'AuthService',
        {
          userId,
          email,
        },
      );
      throw error;
    }
  }

  async logout(refreshToken: string) {
    await this.prisma.refreshToken.deleteMany({
      where: { token: refreshToken },
    });
    return { message: 'Logged out successfully' };
  }

  /**
   * Flujo: el usuario ingresa su email. Si existe una cuenta, generamos token (1h) y enviamos email.
   * Nota: para evitar enumeración de usuarios, la respuesta es siempre genérica.
   */
  async forgotPassword(email: string) {
    const normalizedEmail = (email || '').trim().toLowerCase();
    const user = await this.usersService.findByEmail(normalizedEmail);

    if (user?.isActive) {
      const rawToken = randomBytes(32).toString('hex');
      const tokenHash = this.hashResetToken(rawToken);

      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

      // Invalidar tokens previos no usados (opcional pero recomendable)
      await this.prisma.passwordResetToken.updateMany({
        where: { userId: user.id, used: false },
        data: { used: true },
      });

      await this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          token: tokenHash,
          expiresAt,
          used: false,
        },
      });

      const resetUrl = `${this.getFrontendBaseUrl()}/auth/reset-password/${rawToken}`;
      await this.email.sendPasswordResetEmail({ to: user.email, resetUrl });
    }

    return {
      message:
        'Si el correo está registrado, enviaremos un enlace de recuperación válido por 1 hora.',
    };
  }

  async resetPassword(token: string, newPassword: string) {
    const rawToken = (token || '').trim();
    if (!rawToken) {
      throw new BadRequestException('Token requerido');
    }

    const tokenHash = this.hashResetToken(rawToken);
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { token: tokenHash },
      include: { user: true },
    });

    if (
      !record ||
      record.used ||
      record.expiresAt < new Date() ||
      record.user?.isActive === false
    ) {
      throw new BadRequestException('Token inválido o expirado');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { password: hashedPassword },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { used: true },
      }),
      // Opcional: invalidar sesiones existentes
      this.prisma.refreshToken.deleteMany({
        where: { userId: record.userId },
      }),
    ]);

    return { message: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.' };
  }
}
