import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../common/email/email.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ProductsSchedulerService {
  private readonly logger = new Logger(ProductsSchedulerService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

  /**
   * Verificar stock bajo y enviar notificaciones por email
   * Se ejecuta diariamente a las 9:00 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async checkLowStockAndNotify() {
    this.logger.log('Iniciando verificación de stock bajo...');

    try {
      const threshold = Number(this.configService.get<string>('LOW_STOCK_THRESHOLD') || 10);
      const adminEmail = this.configService.get<string>('ADMIN_EMAIL');

      if (!adminEmail) {
        this.logger.warn('ADMIN_EMAIL no configurado. No se enviarán notificaciones de stock bajo.');
        return;
      }

      // Obtener productos con stock bajo
      const lowStockProducts = await this.prisma.product.findMany({
        where: {
          isActive: true,
          stock: {
            lte: threshold,
          },
        },
        include: {
          category: {
            select: {
              name: true,
            },
          },
          variants: {
            where: {
              stock: {
                lte: threshold,
              },
            },
          },
        },
        orderBy: {
          stock: 'asc',
        },
      });

      if (lowStockProducts.length === 0) {
        this.logger.log('No hay productos con stock bajo.');
        return;
      }

      // Preparar lista de productos para el email
      const productsList = lowStockProducts.map((product) => {
        const variantsList = product.variants.length > 0
          ? product.variants.map((v) => `  - ${v.name || 'Variante'}: ${v.stock} unidades`).join('\n')
          : '';

        return `• ${product.name} (${product.category.name})
  Stock: ${product.stock} unidades
  ${variantsList ? `Variantes con stock bajo:\n${variantsList}` : ''}`;
      }).join('\n\n');

      // Enviar email de notificación
      await this.emailService.sendLowStockAlert({
        to: adminEmail,
        products: lowStockProducts.map((p) => ({
          name: p.name,
          stock: p.stock,
          category: p.category.name,
          sku: p.sku || 'N/A',
        })),
        threshold,
        totalProducts: lowStockProducts.length,
      });

      this.logger.log(`Notificación de stock bajo enviada para ${lowStockProducts.length} productos.`);
    } catch (error) {
      this.logger.error('Error al verificar stock bajo:', error instanceof Error ? error.stack : String(error));
    }
  }
}
