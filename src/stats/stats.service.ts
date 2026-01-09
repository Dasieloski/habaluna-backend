import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StatsService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats() {
    const threshold = 10; // Umbral de stock bajo
    const [totalUsers, totalProducts, totalOrders, totalRevenue, recentOrders, lowStockProducts, lowStockCount] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.product.count({ where: { isActive: true } }),
        this.prisma.order.count(),
        this.prisma.order.aggregate({
          _sum: { total: true },
          where: { paymentStatus: 'PAID' },
        }),
        this.prisma.order.findMany({
          take: 10,
          orderBy: { createdAt: 'desc' },
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
        }),
        this.prisma.product.findMany({
          where: {
            stock: { lte: threshold },
            isActive: true,
          },
          take: 10,
          orderBy: { stock: 'asc' },
          include: {
            category: {
              select: {
                name: true,
              },
            },
          },
        }),
        this.prisma.product.count({
          where: {
            stock: { lte: threshold },
            isActive: true,
          },
        }),
      ]);

    // Sales by month (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const salesByMonth = await this.prisma.order.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: { gte: sixMonthsAgo },
        paymentStatus: 'PAID',
      },
      _sum: { total: true },
    });

    // Calcular estadísticas adicionales de inventario
    const totalStockValue = await this.prisma.product.aggregate({
      _sum: { stock: true },
      where: { isActive: true },
    });

    const outOfStockProducts = await this.prisma.product.count({
      where: {
        stock: 0,
        isActive: true,
      },
    });

    return {
      overview: {
        totalUsers,
        totalProducts,
        totalOrders,
        totalRevenue: totalRevenue._sum.total || 0,
      },
      inventory: {
        lowStockCount,
        lowStockThreshold: threshold,
        outOfStockCount: outOfStockProducts,
        totalStockUnits: totalStockValue._sum.stock || 0,
      },
      recentOrders,
      lowStockProducts: lowStockProducts.map((p) => ({
        id: p.id,
        name: p.name,
        stock: p.stock,
        category: p.category.name,
        sku: p.sku || 'N/A',
      })),
      salesByMonth: salesByMonth.map((sale) => ({
        month: sale.createdAt.toISOString().substring(0, 7),
        revenue: sale._sum.total || 0,
      })),
    };
  }
}
