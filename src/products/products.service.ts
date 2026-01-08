import { ConflictException, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(private prisma: PrismaService) {}

  async create(createProductDto: CreateProductDto) {
    try {
      this.logger.log('Creando producto', 'ProductsService', {
        name: createProductDto.name,
        slug: createProductDto.slug,
        categoryId: createProductDto.categoryId,
        imagesCount: createProductDto.images?.length || 0,
        allergensCount: createProductDto.allergens?.length || 0,
        isCombo: (createProductDto as any).isCombo ?? false,
      });

      const { comboItems, ...rest } = createProductDto as any;

      // Preparar datos asegurando que los arrays estén presentes
      const productData: any = {
        name: rest.name,
        slug: rest.slug,
        description: rest.description,
        categoryId: rest.categoryId,
        stock: rest.stock ?? 0,
        isActive: rest.isActive ?? true,
        isFeatured: rest.isFeatured ?? false,
        isCombo: rest.isCombo ?? false,
        allergens: Array.isArray(rest.allergens) ? rest.allergens : [],
        images: Array.isArray(rest.images) ? rest.images : [],
      };

      // Enforce rule: products in "Sin categoría" can never be active
      const category = await this.prisma.category.findUnique({
        where: { id: createProductDto.categoryId },
        select: { slug: true },
      });
      if (category?.slug === 'sin-categoria') {
        productData.isActive = false;
      }

      // Campos opcionales
      if (rest.shortDescription) {
        productData.shortDescription = rest.shortDescription;
      }
      if (rest.sku) {
        productData.sku = rest.sku;
      }
      if (rest.priceUSD !== undefined && rest.priceUSD !== null) {
        productData.priceUSD = rest.priceUSD;
      }
      if (rest.priceMNs !== undefined && rest.priceMNs !== null) {
        productData.priceMNs = rest.priceMNs;
      }
      if (rest.comparePriceUSD !== undefined && rest.comparePriceUSD !== null) {
        productData.comparePriceUSD = rest.comparePriceUSD;
      }
      if (rest.comparePriceMNs !== undefined && rest.comparePriceMNs !== null) {
        productData.comparePriceMNs = rest.comparePriceMNs;
      }
      if (rest.weight !== undefined && rest.weight !== null) {
        productData.weight = rest.weight;
      }
      if (rest.nutritionalInfo) {
        productData.nutritionalInfo = rest.nutritionalInfo;
      }

      this.logger.debug('Datos preparados para Prisma', 'ProductsService', {
        name: productData.name,
        slug: productData.slug,
        categoryId: productData.categoryId,
        stock: productData.stock,
        isActive: productData.isActive,
        isCombo: productData.isCombo,
      });

      const product = await this.prisma.$transaction(async (tx) => {
        const created = await tx.product.create({
          data: productData,
          include: { category: true },
        });

        if (productData.isCombo) {
          const items = Array.isArray(comboItems) ? comboItems : [];
          const normalized = items
            .filter((i: any) => i?.productId && i.productId !== created.id)
            .map((i: any) => ({
              comboId: created.id,
              productId: i.productId,
              quantity: i.quantity ? Number(i.quantity) : 1,
            }));

          if (normalized.length > 0) {
            await tx.comboItem.createMany({ data: normalized, skipDuplicates: true });
          }
        }

        return created;
      });

      this.logger.log(`Producto creado exitosamente: ${product.id}`, 'ProductsService', {
        productId: product.id,
        name: product.name,
        slug: product.slug,
      });
      return product;
    } catch (error: any) {
      // Slug duplicado
      if (
        error?.code === 'P2002' &&
        Array.isArray(error?.meta?.target) &&
        error.meta.target.includes('slug')
      ) {
        this.logger.warn('Intento de crear producto con slug duplicado', 'ProductsService', {
          slug: createProductDto.slug,
          code: error.code,
        });
        throw new ConflictException('El slug ya existe. Por favor usa otro slug.');
      }
      this.logger.error(
        'Error al crear producto',
        error.stack || String(error),
        'ProductsService',
        {
          message: error.message,
          code: error.code,
          meta: error.meta,
          cause: error.cause,
          slug: createProductDto.slug,
        },
      );
      throw error;
    }
  }

  async findAll(pagination: PaginationDto, filters?: any) {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters?.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters?.isFeatured !== undefined) {
      where.isFeatured = filters.isFeatured;
    }

    if (filters?.isCombo !== undefined) {
      where.isCombo = filters.isCombo;
    }

    // Filtro de stock disponible
    if (filters?.inStock === true) {
      where.stock = {
        gt: 0,
      };
    }

    // Filtro de rango de precios
    const priceFilters: any[] = [];
    if (filters?.minPrice !== undefined || filters?.maxPrice !== undefined) {
      // Para productos sin variantes
      const productPriceFilter: any = {};
      if (filters?.minPrice !== undefined) {
        productPriceFilter.gte = filters.minPrice;
      }
      if (filters?.maxPrice !== undefined) {
        productPriceFilter.lte = filters.maxPrice;
      }
      if (Object.keys(productPriceFilter).length > 0) {
        priceFilters.push({
          priceUSD: productPriceFilter,
        });
      }

      // Para productos con variantes, necesitamos verificar las variantes
      // Esto es más complejo y requeriría un subquery
      // Por ahora, filtramos por precio del producto base
    }

    // Búsqueda por texto
    if (filters?.search) {
      const searchConditions = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];

      if (where.OR) {
        // Si ya hay condiciones OR (de precio), combinarlas
        where.AND = [{ OR: where.OR }, { OR: searchConditions }];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
    }

    // Si hay filtros de precio, agregarlos
    if (priceFilters.length > 0) {
      if (where.OR || where.AND) {
        // Ya hay condiciones complejas, usar AND
        if (!where.AND) {
          where.AND = [];
        }
        where.AND.push({ OR: priceFilters });
      } else {
        where.OR = priceFilters;
      }
    }

    // Ordenamiento
    let orderBy: any = { createdAt: 'desc' }; // Default
    if (filters?.sortBy) {
      switch (filters.sortBy) {
        case 'price-asc':
          orderBy = { priceUSD: 'asc' };
          break;
        case 'price-desc':
          orderBy = { priceUSD: 'desc' };
          break;
        case 'name-asc':
          orderBy = { name: 'asc' };
          break;
        case 'name-desc':
          orderBy = { name: 'desc' };
          break;
        case 'created-desc':
          orderBy = { createdAt: 'desc' };
          break;
        default:
          orderBy = { createdAt: 'desc' };
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        include: {
          category: true,
          variants: {
            where: { isActive: true },
            orderBy: { order: 'asc' },
          },
        },
        orderBy,
      }),
      this.prisma.product.count({ where }),
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

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        variants: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
        },
        comboItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                images: true,
                priceUSD: true,
                priceMNs: true,
                comparePriceUSD: true,
                comparePriceMNs: true,
                isActive: true,
                isCombo: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async findBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
        variants: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
        },
        comboItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                images: true,
                priceUSD: true,
                priceMNs: true,
                comparePriceUSD: true,
                comparePriceMNs: true,
                isActive: true,
                isCombo: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async getBestSellers(limit = 8) {
    const take = Number.isFinite(limit) ? Math.max(1, Math.min(50, Number(limit))) : 8;

    // Rank por cantidad total vendida (solo órdenes pagadas)
    const ranked = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: {
          paymentStatus: 'PAID',
        },
      },
      _sum: {
        quantity: true,
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take,
    });

    const ids = ranked.map((r) => r.productId);
    // Fallback: si no hay ventas todavía, devolver productos en oferta
    if (ids.length === 0) {
      const candidates = await this.prisma.product.findMany({
        where: { isActive: true },
        include: {
          category: true,
          variants: {
            where: { isActive: true },
            orderBy: { order: 'asc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: Math.max(50, take * 5), // buscar suficientes para filtrar
      });

      const isOnSale = (p: any) => {
        const price = p.priceUSD ? Number(p.priceUSD) : 0;
        const compare =
          p.comparePriceUSD !== null && p.comparePriceUSD !== undefined
            ? Number(p.comparePriceUSD)
            : null;
        if (compare !== null && compare > price) return true;
        // variantes
        const vars = Array.isArray(p.variants) ? p.variants : [];
        return vars.some((v: any) => {
          const vPrice = v.priceUSD ? Number(v.priceUSD) : 0;
          const vCompare =
            v.comparePriceUSD !== null && v.comparePriceUSD !== undefined
              ? Number(v.comparePriceUSD)
              : null;
          return vCompare !== null && vCompare > vPrice;
        });
      };

      return candidates.filter(isOnSale).slice(0, take);
    }

    const products = await this.prisma.product.findMany({
      where: {
        id: { in: ids },
        isActive: true,
      },
      include: {
        category: true,
        variants: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    const byId = new Map(products.map((p) => [p.id, p]));
    return ids.map((id) => byId.get(id)).filter(Boolean);
  }

  async update(id: string, updateProductDto: UpdateProductDto) {
    const existing = await this.findOne(id);
    // Enforce rule: products in "Sin categoría" can never be active
    const nextCategoryId = updateProductDto.categoryId ?? existing.categoryId;
    let categorySlug: string | null = existing.category?.slug ?? null;
    if (updateProductDto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: nextCategoryId },
        select: { slug: true },
      });
      categorySlug = category?.slug ?? null;
    }

    const { comboItems, ...rest } = updateProductDto as any;
    const data: any = {
      ...rest,
    };
    const existingIsUncategorized = existing.category?.slug === 'sin-categoria';
    const nextIsUncategorized = categorySlug === 'sin-categoria';

    if (nextIsUncategorized) {
      data.isActive = false;
    } else if (existingIsUncategorized && !nextIsUncategorized) {
      // Moving out of "Sin categoría" => auto-activate (unless explicitly set false)
      if (updateProductDto.isActive === undefined) {
        data.isActive = true;
      }
    }

    const nextIsCombo = data.isCombo !== undefined ? !!data.isCombo : !!(existing as any).isCombo;

    try {
      return await this.prisma.$transaction(async (tx) => {
        const updated = await tx.product.update({
          where: { id },
          data,
          include: { category: true },
        });

        // Si se desactiva combo, borrar items
        if (!nextIsCombo) {
          await tx.comboItem.deleteMany({ where: { comboId: id } });
          return updated;
        }

        // Si es combo y se envía comboItems, reemplazar exactamente
        if (comboItems !== undefined) {
          await tx.comboItem.deleteMany({ where: { comboId: id } });
          const items = Array.isArray(comboItems) ? comboItems : [];
          const normalized = items
            .filter((i: any) => i?.productId && i.productId !== id)
            .map((i: any) => ({
              comboId: id,
              productId: i.productId,
              quantity: i.quantity ? Number(i.quantity) : 1,
            }));
          if (normalized.length > 0) {
            await tx.comboItem.createMany({ data: normalized, skipDuplicates: true });
          }
        }

        return updated;
      });
    } catch (error: any) {
      if (
        error?.code === 'P2002' &&
        Array.isArray(error?.meta?.target) &&
        error.meta.target.includes('slug')
      ) {
        throw new ConflictException('El slug ya existe. Por favor usa otro slug.');
      }
      throw error;
    }
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.product.delete({
      where: { id },
    });
  }
}
