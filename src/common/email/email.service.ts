import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly config: ConfigService) {}

  private createTransport() {
    const host = this.config.get<string>('SMTP_HOST');
    const port = Number(this.config.get<string>('SMTP_PORT') ?? 587);
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');
    const secure = String(this.config.get<string>('SMTP_SECURE') ?? 'false') === 'true';

    if (!host || !user || !pass) return null;

    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
  }

  async sendPasswordResetEmail(params: { to: string; resetUrl: string }) {
    const from = this.config.get<string>('EMAIL_FROM') ?? 'no-reply@habanaluna.local';
    const subject = 'Recuperación de contraseña';
    const text = `Has solicitado recuperar tu contraseña.\n\nUsa este enlace (válido por 1 hora):\n${params.resetUrl}\n\nSi no lo solicitaste, ignora este correo.`;
    const html = `
      <p>Has solicitado recuperar tu contraseña.</p>
      <p><strong>Este enlace es válido por 1 hora:</strong></p>
      <p><a href="${params.resetUrl}">Restablecer contraseña</a></p>
      <p>Si no lo solicitaste, ignora este correo.</p>
    `;

    const transport = this.createTransport();
    if (!transport) {
      // Fallback seguro para dev: no fallar el endpoint, solo loggear.
      this.logger.warn(
        `SMTP no configurado. No se envió email. resetUrl para ${params.to}: ${params.resetUrl}`,
      );
      return { sent: false };
    }

    await transport.sendMail({
      from,
      to: params.to,
      subject,
      text,
      html,
    });

    return { sent: true };
  }
}
