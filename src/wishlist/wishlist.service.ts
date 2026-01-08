import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WishlistService {
  constructor(private prisma: PrismaService) {}

  async getWishlist(userId: string) {
    const items = await this.prisma.wishlistItem.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          include: { category: true, variants: true },
        },
      },
    });

    return { items };
  }

  async addToWishlist(userId: string, productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!product) throw new NotFoundException('Product not found');

    const existing = await this.prisma.wishlistItem.findFirst({
      where: { userId, productId },
    });
    if (existing) return existing;

    return this.prisma.wishlistItem.create({
      data: { userId, productId },
      include: {
        product: { include: { category: true, variants: true } },
      },
    });
  }

  async removeFromWishlist(userId: string, productId: string) {
    const existing = await this.prisma.wishlistItem.findFirst({
      where: { userId, productId },
      select: { id: true },
    });
    if (!existing) {
      return { success: true };
    }
    await this.prisma.wishlistItem.delete({ where: { id: existing.id } });
    return { success: true };
  }
}
