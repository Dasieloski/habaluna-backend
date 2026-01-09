import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { CreateAdminReviewDto } from './dto/create-admin-review.dto';
import { UpdateAdminReviewDto } from './dto/update-admin-review.dto';
import { ListAdminReviewsDto } from './dto/list-admin-reviews.dto';
import { CreateUserReviewDto } from './dto/create-user-review.dto';
import { UpdateUserReviewDto } from './dto/update-user-review.dto';
import { ListReviewsDto } from './dto/list-reviews.dto';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  private async getSettings() {
    const existing = await this.prisma.reviewSettings.findFirst();
    if (existing) return existing;
    return this.prisma.reviewSettings.create({ data: { autoApproveReviews: false } });
  }

  /**
   * Verifica si un usuario ha comprado un producto
   */
  private async hasUserPurchasedProduct(userId: string, productId: string): Promise<boolean> {
    const order = await this.prisma.order.findFirst({
      where: {
        userId,
        status: { in: ['DELIVERED', 'SHIPPED', 'PROCESSING'] }, // Solo órdenes completadas o en proceso
        items: {
          some: {
            productId,
          },
        },
      },
      select: { id: true },
    });
    return !!order;
  }

  /**
   * Calcula y actualiza el rating promedio de un producto
   */
  private async updateProductRating(productId: string): Promise<void> {
    const reviews = await this.prisma.review.findMany({
      where: {
        productId,
        isApproved: true,
      },
      select: {
        rating: true,
      },
    });

    if (reviews.length === 0) {
      await this.prisma.product.update({
        where: { id: productId },
        data: {
          averageRating: null,
          reviewCount: 0,
        },
      });
      return;
    }

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;

    await this.prisma.product.update({
      where: { id: productId },
      data: {
        averageRating: new Decimal(averageRating.toFixed(2)),
        reviewCount: reviews.length,
      },
    });
  }

  async getApprovedByProduct(productId: string, dto?: ListReviewsDto) {
    const page = dto?.page ?? 1;
    const limit = dto?.limit ?? 5;
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { productId, isApproved: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.review.count({
        where: { productId, isApproved: true },
      }),
    ]);

    return {
      data: reviews,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createPublic(
    productId: string,
    dto: {
      authorName: string;
      authorEmail?: string;
      rating: number;
      title?: string;
      content: string;
    },
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!product) throw new NotFoundException('Product not found');

    const settings = await this.getSettings();

    const review = await this.prisma.review.create({
      data: {
        productId,
        authorName: dto.authorName,
        authorEmail: dto.authorEmail,
        rating: dto.rating,
        title: dto.title,
        content: dto.content,
        isApproved: settings.autoApproveReviews,
      },
    });

    // Si se aprueba automáticamente, actualizar rating
    if (settings.autoApproveReviews) {
      await this.updateProductRating(productId);
    }

    return review;
  }

  /**
   * Crea un review para un usuario autenticado (debe haber comprado el producto)
   */
  async createUserReview(userId: string, productId: string, dto: CreateUserReviewDto) {
    // Verificar que el producto existe
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!product) throw new NotFoundException('Product not found');

    // Verificar que el usuario ha comprado el producto
    const hasPurchased = await this.hasUserPurchasedProduct(userId, productId);
    if (!hasPurchased) {
      throw new ForbiddenException('Solo puedes dejar un review de productos que has comprado');
    }

    // Verificar que no existe ya un review del usuario para este producto
    const existingReview = await this.prisma.review.findFirst({
      where: {
        userId,
        productId,
      },
    });

    if (existingReview) {
      throw new BadRequestException('Ya has dejado un review para este producto. Puedes editarlo o eliminarlo.');
    }

    // Obtener datos del usuario
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    const settings = await this.getSettings();

    const review = await this.prisma.review.create({
      data: {
        productId,
        userId,
        authorName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Usuario',
        authorEmail: user?.email,
        rating: dto.rating,
        title: dto.title,
        content: dto.comment,
        isApproved: settings.autoApproveReviews,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Si se aprueba automáticamente, actualizar rating
    if (settings.autoApproveReviews) {
      await this.updateProductRating(productId);
    }

    return review;
  }

  /**
   * Actualiza un review del usuario
   */
  async updateUserReview(userId: string, reviewId: string, dto: UpdateUserReviewDto) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        product: {
          select: { id: true },
        },
      },
    });

    if (!review) throw new NotFoundException('Review not found');

    // Verificar que el review pertenece al usuario
    if (review.userId !== userId) {
      throw new ForbiddenException('No tienes permiso para editar este review');
    }

    const updatedReview = await this.prisma.review.update({
      where: { id: reviewId },
      data: {
        ...(dto.rating !== undefined && { rating: dto.rating }),
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.comment !== undefined && { content: dto.comment }),
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Actualizar rating del producto si el review está aprobado
    if (review.isApproved) {
      await this.updateProductRating(review.productId);
    }

    return updatedReview;
  }

  /**
   * Elimina un review del usuario
   */
  async deleteUserReview(userId: string, reviewId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      select: {
        id: true,
        userId: true,
        productId: true,
        isApproved: true,
      },
    });

    if (!review) throw new NotFoundException('Review not found');

    // Verificar que el review pertenece al usuario
    if (review.userId !== userId) {
      throw new ForbiddenException('No tienes permiso para eliminar este review');
    }

    await this.prisma.review.delete({
      where: { id: reviewId },
    });

    // Actualizar rating del producto si el review estaba aprobado
    if (review.isApproved) {
      await this.updateProductRating(review.productId);
    }

    return { message: 'Review eliminado correctamente' };
  }

  async adminGetSettings() {
    return this.getSettings();
  }

  async adminUpdateSettings(dto: { autoApproveReviews?: boolean }) {
    const current = await this.getSettings();
    return this.prisma.reviewSettings.update({
      where: { id: current.id },
      data: {
        ...(dto.autoApproveReviews !== undefined
          ? { autoApproveReviews: dto.autoApproveReviews }
          : {}),
      },
    });
  }

  async adminList(dto: ListAdminReviewsDto) {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (dto.productId) where.productId = dto.productId;
    if (dto.isApproved !== undefined) where.isApproved = dto.isApproved;
    if (dto.search?.trim()) {
      const q = dto.search.trim();
      where.OR = [
        { authorName: { contains: q, mode: 'insensitive' } },
        { authorEmail: { contains: q, mode: 'insensitive' } },
        { title: { contains: q, mode: 'insensitive' } },
        { content: { contains: q, mode: 'insensitive' } },
        { product: { name: { contains: q, mode: 'insensitive' } } },
        { product: { slug: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          product: { select: { id: true, name: true, slug: true } },
        },
      }),
      this.prisma.review.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async adminCreate(dto: CreateAdminReviewDto) {
    // validate product exists
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      select: { id: true },
    });
    if (!product) throw new NotFoundException('Product not found');

    return this.prisma.review.create({
      data: {
        productId: dto.productId,
        userId: dto.userId,
        authorName: dto.authorName,
        authorEmail: dto.authorEmail,
        rating: dto.rating,
        title: dto.title,
        content: dto.content,
        isApproved: dto.isApproved ?? false,
      },
      include: { product: { select: { id: true, name: true, slug: true } } },
    });
  }

  async adminUpdate(id: string, dto: UpdateAdminReviewDto) {
    const existing = await this.prisma.review.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException('Review not found');

    // If productId changes, validate it
    if ((dto as any).productId) {
      const product = await this.prisma.product.findUnique({
        where: { id: (dto as any).productId },
        select: { id: true },
      });
      if (!product) throw new NotFoundException('Product not found');
    }

    return this.prisma.review.update({
      where: { id },
      data: {
        ...(dto as any),
      },
      include: { product: { select: { id: true, name: true, slug: true } } },
    });
  }

  async adminDelete(id: string) {
    const existing = await this.prisma.review.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException('Review not found');
    return this.prisma.review.delete({ where: { id } });
  }
}
