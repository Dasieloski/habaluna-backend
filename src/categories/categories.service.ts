import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  private readonly UNCATEGORIZED_SLUG = 'sin-categoria';
  private readonly UNCATEGORIZED_NAME = 'Sin categoría';

  async ensureUncategorizedCategory() {
    const existing = await this.prisma.category.findUnique({
      where: { slug: this.UNCATEGORIZED_SLUG },
    });

    if (existing) return existing;

    return this.prisma.category.create({
      data: {
        name: this.UNCATEGORIZED_NAME,
        slug: this.UNCATEGORIZED_SLUG,
        description: 'Productos sin categoría (no publicables)',
        isActive: false,
        order: 9999,
      },
    });
  }

  async create(createCategoryDto: CreateCategoryDto) {
    return this.prisma.category.create({
      data: createCategoryDto,
    });
  }

  async findAll() {
    return this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });
  }

  async findAllAdmin() {
    return this.prisma.category.findMany({
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        products: {
          where: { isActive: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async findBySlug(slug: string) {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: {
        products: {
          where: { isActive: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    await this.findOne(id);
    return this.prisma.category.update({
      where: { id },
      data: updateCategoryDto,
    });
  }

  async remove(id: string, mode: 'delete_with_products' | 'move_products_to_uncategorized') {
    const category = await this.prisma.category.findUnique({
      where: { id },
      select: { id: true, slug: true },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (category.slug === this.UNCATEGORIZED_SLUG) {
      throw new BadRequestException('No se puede eliminar la categoría "Sin categoría".');
    }

    if (!mode) {
      throw new BadRequestException(
        'Falta query param "mode": use delete_with_products o move_products_to_uncategorized.',
      );
    }

    if (mode !== 'delete_with_products' && mode !== 'move_products_to_uncategorized') {
      throw new BadRequestException(
        'Modo inválido. Use delete_with_products o move_products_to_uncategorized.',
      );
    }

    if (mode === 'delete_with_products') {
      const [deletedProducts, deletedCategory] = await this.prisma.$transaction([
        this.prisma.product.deleteMany({ where: { categoryId: id } }),
        this.prisma.category.delete({ where: { id } }),
      ]);
      return {
        deletedProducts: deletedProducts.count,
        deletedCategory,
      };
    }

    // mode === 'move_products_to_uncategorized'
    const uncategorized = await this.ensureUncategorizedCategory();
    const [movedProducts, deletedCategory] = await this.prisma.$transaction([
      this.prisma.product.updateMany({
        where: { categoryId: id },
        data: { categoryId: uncategorized.id, isActive: false },
      }),
      this.prisma.category.delete({ where: { id } }),
    ]);
    return {
      movedProducts: movedProducts.count,
      movedToCategoryId: uncategorized.id,
      deletedCategory,
    };
  }

  async assignProducts(categoryId: string, productIds: string[]) {
    await this.findOne(categoryId);

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return this.prisma.category.findUnique({
        where: { id: categoryId },
        include: {
          _count: { select: { products: true } },
        },
      });
    }

    const target = await this.prisma.category.findUnique({
      where: { id: categoryId },
      select: { slug: true },
    });

    const isUncategorized = target?.slug === this.UNCATEGORIZED_SLUG;

    if (isUncategorized) {
      // Moving into "Sin categoría" => force inactive
      await this.prisma.product.updateMany({
        where: { id: { in: productIds } },
        data: { categoryId, isActive: false },
      });
    } else {
      // Moving into a normal category:
      // - products coming from "Sin categoría" become active automatically
      // - other products keep their current isActive value
      const uncategorized = await this.ensureUncategorizedCategory();

      await this.prisma.product.updateMany({
        where: { id: { in: productIds }, categoryId: uncategorized.id },
        data: { categoryId, isActive: true },
      });

      await this.prisma.product.updateMany({
        where: { id: { in: productIds }, NOT: { categoryId: uncategorized.id } },
        data: { categoryId },
      });
    }

    return this.prisma.category.findUnique({
      where: { id: categoryId },
      include: {
        _count: { select: { products: true } },
      },
    });
  }
}
