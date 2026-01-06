import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAdminReviewDto } from './dto/create-admin-review.dto';
import { UpdateAdminReviewDto } from './dto/update-admin-review.dto';
import { ListAdminReviewsDto } from './dto/list-admin-reviews.dto';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  private async getSettings() {
    const existing = await this.prisma.reviewSettings.findFirst();
    if (existing) return existing;
    return this.prisma.reviewSettings.create({ data: { autoApproveReviews: false } });
  }

  async getApprovedByProduct(productId: string) {
    return this.prisma.review.findMany({
      where: { productId, isApproved: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createPublic(productId: string, dto: { authorName: string; authorEmail?: string; rating: number; title?: string; content: string }) {
    const product = await this.prisma.product.findUnique({ where: { id: productId }, select: { id: true } });
    if (!product) throw new NotFoundException('Product not found');

    const settings = await this.getSettings();

    return this.prisma.review.create({
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
  }

  async adminGetSettings() {
    return this.getSettings();
  }

  async adminUpdateSettings(dto: { autoApproveReviews?: boolean }) {
    const current = await this.getSettings();
    return this.prisma.reviewSettings.update({
      where: { id: current.id },
      data: {
        ...(dto.autoApproveReviews !== undefined ? { autoApproveReviews: dto.autoApproveReviews } : {}),
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
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId }, select: { id: true } });
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
      const product = await this.prisma.product.findUnique({ where: { id: (dto as any).productId }, select: { id: true } });
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

