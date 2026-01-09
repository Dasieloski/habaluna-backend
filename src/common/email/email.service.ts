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

  async sendWelcomeEmail(params: { to: string; firstName?: string }) {
    const from = this.config.get<string>('EMAIL_FROM') ?? 'no-reply@habanaluna.local';
    const subject = '¡Bienvenido a Habanaluna!';
    const name = params.firstName || 'Usuario';
    const text = `¡Hola ${name}!\n\nGracias por registrarte en Habanaluna. Estamos emocionados de tenerte con nosotros.\n\nExplora nuestros productos premium y disfruta de una experiencia de compra única.\n\n¡Bienvenido!`;
    const html = this.getEmailTemplate({
      title: '¡Bienvenido a Habanaluna!',
      greeting: `¡Hola ${name}!`,
      content: `
        <p>Gracias por registrarte en Habanaluna. Estamos emocionados de tenerte con nosotros.</p>
        <p>Explora nuestros productos premium y disfruta de una experiencia de compra única.</p>
      `,
      buttonText: 'Explorar Productos',
      buttonUrl: this.getFrontendUrl(),
    });

    return this.sendEmail({ from, to: params.to, subject, text, html });
  }

  async sendOrderConfirmationEmail(params: {
    to: string;
    orderNumber: string;
    total: number;
    firstName?: string;
  }) {
    const from = this.config.get<string>('EMAIL_FROM') ?? 'no-reply@habanaluna.local';
    const subject = `Confirmación de Pedido #${params.orderNumber}`;
    const name = params.firstName || 'Cliente';
    const text = `¡Hola ${name}!\n\nTu pedido #${params.orderNumber} ha sido confirmado.\n\nTotal: $${params.total.toFixed(2)}\n\nTe notificaremos cuando tu pedido sea enviado.`;
    const html = this.getEmailTemplate({
      title: 'Pedido Confirmado',
      greeting: `¡Hola ${name}!`,
      content: `
        <p>Tu pedido <strong>#${params.orderNumber}</strong> ha sido confirmado exitosamente.</p>
        <p><strong>Total:</strong> $${params.total.toFixed(2)}</p>
        <p>Te notificaremos cuando tu pedido sea enviado. Puedes ver el estado de tu pedido en tu cuenta.</p>
      `,
      buttonText: 'Ver Mi Pedido',
      buttonUrl: `${this.getFrontendUrl()}/orders`,
    });

    return this.sendEmail({ from, to: params.to, subject, text, html });
  }

  async sendOrderStatusUpdateEmail(params: {
    to: string;
    orderNumber: string;
    status: string;
    firstName?: string;
  }) {
    const from = this.config.get<string>('EMAIL_FROM') ?? 'no-reply@habanaluna.local';
    const statusMessages: Record<string, string> = {
      PROCESSING: 'está siendo procesado',
      SHIPPED: 'ha sido enviado',
      DELIVERED: 'ha sido entregado',
      CANCELLED: 'ha sido cancelado',
    };
    const statusMessage = statusMessages[params.status] || 'ha sido actualizado';
    const subject = `Actualización de Pedido #${params.orderNumber}`;
    const name = params.firstName || 'Cliente';
    const text = `¡Hola ${name}!\n\nTu pedido #${params.orderNumber} ${statusMessage}.\n\nPuedes ver más detalles en tu cuenta.`;
    const html = this.getEmailTemplate({
      title: 'Actualización de Pedido',
      greeting: `¡Hola ${name}!`,
      content: `
        <p>Tu pedido <strong>#${params.orderNumber}</strong> ${statusMessage}.</p>
        <p>Puedes ver más detalles y seguir el estado de tu pedido en tu cuenta.</p>
      `,
      buttonText: 'Ver Mi Pedido',
      buttonUrl: `${this.getFrontendUrl()}/orders`,
    });

    return this.sendEmail({ from, to: params.to, subject, text, html });
  }

  async sendLowStockAlert(params: {
    to: string;
    products: Array<{ name: string; stock: number; category: string; sku: string }>;
    threshold: number;
    totalProducts: number;
  }) {
    const from = this.config.get<string>('EMAIL_FROM') ?? 'no-reply@habanaluna.local';
    const subject = `⚠️ Alerta de Stock Bajo - ${params.totalProducts} productos`;
    const productsList = params.products
      .map((p) => `• ${p.name} (${p.category}) - Stock: ${p.stock} unidades - SKU: ${p.sku}`)
      .join('\n');
    const text = `Alerta de Stock Bajo\n\nSe encontraron ${params.totalProducts} productos con stock por debajo del umbral de ${params.threshold} unidades:\n\n${productsList}\n\nPor favor, revisa el inventario y reabastece estos productos.`;
    const html = this.getEmailTemplate({
      title: '⚠️ Alerta de Stock Bajo',
      greeting: 'Hola,',
      content: `
        <p>Se encontraron <strong>${params.totalProducts} productos</strong> con stock por debajo del umbral de <strong>${params.threshold} unidades</strong>.</p>
        <div style="background-color: #fff3cd; padding: 15px; border-radius: 4px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <h3 style="margin-top: 0; color: #856404;">Productos con Stock Bajo:</h3>
          <ul style="margin: 0; padding-left: 20px;">
            ${params.products.map((p) => `<li><strong>${p.name}</strong> (${p.category})<br>Stock: ${p.stock} unidades | SKU: ${p.sku}</li>`).join('')}
          </ul>
        </div>
        <p>Por favor, revisa el inventario y reabastece estos productos lo antes posible.</p>
      `,
      buttonText: 'Ver Inventario',
      buttonUrl: `${this.getFrontendUrl()}/admin/products?lowStock=true`,
    });

    return this.sendEmail({ from, to: params.to, subject, text, html });
  }

  private async sendEmail(params: {
    from: string;
    to: string;
    subject: string;
    text: string;
    html: string;
  }) {
    const transport = this.createTransport();
    if (!transport) {
      this.logger.warn(`SMTP no configurado. No se envió email a ${params.to}`);
      return { sent: false };
    }

    try {
      await transport.sendMail(params);
      return { sent: true };
    } catch (error) {
      this.logger.error(`Error enviando email a ${params.to}`, error instanceof Error ? error.stack : String(error));
      return { sent: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  private getFrontendUrl(): string {
    return this.config.get<string>('FRONTEND_URL') || 'http://localhost:3000';
  }

  private getEmailTemplate(params: {
    title: string;
    greeting: string;
    content: string;
    buttonText?: string;
    buttonUrl?: string;
  }): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${params.title}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
            <h1 style="color: #2c3e50; margin-top: 0;">${params.title}</h1>
            <p style="font-size: 16px;">${params.greeting}</p>
            <div style="background-color: white; padding: 20px; border-radius: 4px; margin: 20px 0;">
              ${params.content}
            </div>
            ${params.buttonText && params.buttonUrl ? `
              <div style="text-align: center; margin: 30px 0;">
                <a href="${params.buttonUrl}" style="background-color: #2c3e50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
                  ${params.buttonText}
                </a>
              </div>
            ` : ''}
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            <p style="font-size: 12px; color: #666; text-align: center;">
              © ${new Date().getFullYear()} Habanaluna. Todos los derechos reservados.
            </p>
          </div>
        </body>
      </html>
    `;
  }
}
