import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { UpdateProductVariantDto } from './dto/update-product-variant.dto';

@Injectable()
export class ProductVariantsService {
  constructor(private prisma: PrismaService) {}

  async create(createProductVariantDto: CreateProductVariantDto) {
    // Verificar que el producto existe
    const product = await this.prisma.product.findUnique({
      where: { id: createProductVariantDto.productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.prisma.productVariant.create({
      data: createProductVariantDto,
      include: { product: true },
    });
  }

  async findAll(productId?: string) {
    const where: any = {};
    if (productId) {
      where.productId = productId;
    }

    return this.prisma.productVariant.findMany({
      where,
      include: { product: true },
      orderBy: { order: 'asc' },
    });
  }

  async findOne(id: string) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id },
      include: { product: true },
    });

    if (!variant) {
      throw new NotFoundException('Product variant not found');
    }

    return variant;
  }

  async update(id: string, updateProductVariantDto: UpdateProductVariantDto) {
    await this.findOne(id);
    return this.prisma.productVariant.update({
      where: { id },
      data: updateProductVariantDto,
      include: { product: true },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.productVariant.delete({
      where: { id },
    });
  }
}

