import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as ExcelJS from 'exceljs';
import * as PDFDocument from 'pdfkit';
import { Response } from 'express';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Exportar reporte de órdenes a Excel
   */
  async exportOrdersToExcel(startDate?: Date, endDate?: Date): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Órdenes');

    // Definir columnas
    worksheet.columns = [
      { header: 'Número de Orden', key: 'orderNumber', width: 20 },
      { header: 'Fecha', key: 'createdAt', width: 15 },
      { header: 'Cliente', key: 'customer', width: 30 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Estado', key: 'status', width: 15 },
      { header: 'Estado de Pago', key: 'paymentStatus', width: 15 },
      { header: 'Subtotal', key: 'subtotal', width: 15 },
      { header: 'IVA', key: 'tax', width: 15 },
      { header: 'Envío', key: 'shipping', width: 15 },
      { header: 'Total', key: 'total', width: 15 },
    ];

    // Estilo del encabezado
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

    // Obtener órdenes
    const where: any = {};
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const orders = await this.prisma.order.findMany({
      where,
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Agregar datos
    orders.forEach((order) => {
      const customerName = order.user.firstName && order.user.lastName
        ? `${order.user.firstName} ${order.user.lastName}`
        : 'N/A';

      worksheet.addRow({
        orderNumber: order.orderNumber,
        createdAt: order.createdAt.toLocaleDateString('es-ES'),
        customer: customerName,
        email: order.user.email,
        status: order.status,
        paymentStatus: order.paymentStatus,
        subtotal: Number(order.subtotal).toFixed(2),
        tax: Number(order.tax).toFixed(2),
        shipping: Number(order.shipping).toFixed(2),
        total: Number(order.total).toFixed(2),
      });
    });

    // Generar buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * Exportar reporte de productos a Excel
   */
  async exportProductsToExcel(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Productos');

    // Definir columnas
    worksheet.columns = [
      { header: 'Nombre', key: 'name', width: 30 },
      { header: 'SKU', key: 'sku', width: 15 },
      { header: 'Categoría', key: 'category', width: 20 },
      { header: 'Precio USD', key: 'priceUSD', width: 15 },
      { header: 'Stock', key: 'stock', width: 10 },
      { header: 'Estado', key: 'isActive', width: 10 },
      { header: 'Destacado', key: 'isFeatured', width: 10 },
      { header: 'Fecha Creación', key: 'createdAt', width: 15 },
    ];

    // Estilo del encabezado
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    worksheet.getRow(1).font = { color: { argb: 'FFFFFFFF' }, bold: true };

    // Obtener productos
    const products = await this.prisma.product.findMany({
      include: {
        category: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Agregar datos
    products.forEach((product) => {
      worksheet.addRow({
        name: product.name,
        sku: product.sku || 'N/A',
        category: product.category.name,
        priceUSD: product.priceUSD ? Number(product.priceUSD).toFixed(2) : 'N/A',
        stock: product.stock,
        isActive: product.isActive ? 'Activo' : 'Inactivo',
        isFeatured: product.isFeatured ? 'Sí' : 'No',
        createdAt: product.createdAt.toLocaleDateString('es-ES'),
      });
    });

    // Generar buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * Exportar reporte de ventas a PDF
   */
  async exportSalesToPDF(startDate?: Date, endDate?: Date): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        resolve(pdfBuffer);
      });
      doc.on('error', reject);

      // Título
      doc.fontSize(20).text('Reporte de Ventas', { align: 'center' });
      doc.moveDown();

      // Fechas
      if (startDate || endDate) {
        doc.fontSize(12);
        if (startDate) {
          doc.text(`Desde: ${startDate.toLocaleDateString('es-ES')}`);
        }
        if (endDate) {
          doc.text(`Hasta: ${endDate.toLocaleDateString('es-ES')}`);
        }
        doc.moveDown();
      }

      // Obtener datos
      const where: any = {
        paymentStatus: 'PAID',
      };
      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt.gte = startDate;
        if (endDate) where.createdAt.lte = endDate;
      }

      this.prisma.order
        .findMany({
          where,
          include: {
            user: {
              select: {
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        })
        .then((orders) => {
          // Resumen
          const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total), 0);
          const totalOrders = orders.length;

          doc.fontSize(14).text('Resumen', { underline: true });
          doc.moveDown(0.5);
          doc.fontSize(12);
          doc.text(`Total de órdenes: ${totalOrders}`);
          doc.text(`Ingresos totales: $${totalRevenue.toFixed(2)}`);
          doc.moveDown();

          // Detalle de órdenes
          doc.fontSize(14).text('Detalle de Órdenes', { underline: true });
          doc.moveDown(0.5);
          doc.fontSize(10);

          orders.forEach((order, index) => {
            if (index > 0 && index % 20 === 0) {
              doc.addPage();
            }

            const customerName = order.user.firstName && order.user.lastName
              ? `${order.user.firstName} ${order.user.lastName}`
              : 'N/A';

            doc.text(`${order.orderNumber} - ${customerName} - $${Number(order.total).toFixed(2)}`);
            doc.text(`   Fecha: ${order.createdAt.toLocaleDateString('es-ES')} - Estado: ${order.status}`);
            doc.moveDown(0.3);
          });

          doc.end();
        })
        .catch(reject);
    });
  }
}
