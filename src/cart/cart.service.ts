import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { convertToUSD } from '../common/utils/currency.utils';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  async getCart(userId: string) {
    const cartItems = await this.prisma.cartItem
      .findMany({
        where: { userId },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              description: true,
              shortDescription: true,
              priceUSD: true,
              priceMNs: true,
              comparePriceUSD: true,
              comparePriceMNs: true,
              sku: true,
              stock: true,
              isActive: true,
              isFeatured: true,
              isCombo: true,
              images: true,
              allergens: true,
              nutritionalInfo: true,
              weight: true,
              categoryId: true,
              createdAt: true,
              updatedAt: true,
              category: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
          productVariant: true,
        },
      })
      .catch(async (error) => {
        // Si falla por campos que no existen, intentar sin ellos
        if (
          error.message?.includes('does not exist') ||
          error.message?.includes('no existe') ||
          error.message?.includes('column')
        ) {
          return this.prisma.cartItem.findMany({
            where: { userId },
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  description: true,
                  shortDescription: true,
                  priceUSD: true,
                  priceMNs: true,
                  comparePriceUSD: true,
                  comparePriceMNs: true,
                  sku: true,
                  stock: true,
                  isActive: true,
                  isFeatured: true,
                  isCombo: true,
                  images: true,
                  allergens: true,
                  nutritionalInfo: true,
                  weight: true,
                  categoryId: true,
                  createdAt: true,
                  updatedAt: true,
                  category: {
                    select: {
                      id: true,
                      name: true,
                      slug: true,
                    },
                  },
                },
              },
              productVariant: true,
            },
          });
        }
        throw error;
      });

    const subtotal = cartItems.reduce((sum, item) => {
      // Usar precio de la variante si existe, sino el precio del producto
      let priceInUSD = 0;
      if (item.productVariant) {
        // Priorizar precio USD, si no existe convertir desde MNs
        if (item.productVariant.priceUSD) {
          priceInUSD = Number(item.productVariant.priceUSD);
        } else if (item.productVariant.priceMNs) {
          priceInUSD = convertToUSD(Number(item.productVariant.priceMNs), 'MNs');
        }
      } else {
        // Priorizar precio USD, si no existe convertir desde MNs
        if (item.product.priceUSD) {
          priceInUSD = Number(item.product.priceUSD);
        } else if (item.product.priceMNs) {
          priceInUSD = convertToUSD(Number(item.product.priceMNs), 'MNs');
        }
      }
      return sum + priceInUSD * item.quantity;
    }, 0);

    return {
      items: cartItems,
      subtotal,
      total: subtotal, // Tax and shipping calculated at checkout
    };
  }

  async addToCart(userId: string, addToCartDto: AddToCartDto) {
    const product = await this.prisma.product
      .findUnique({
        where: { id: addToCartDto.productId },
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          shortDescription: true,
          priceUSD: true,
          priceMNs: true,
          comparePriceUSD: true,
          comparePriceMNs: true,
          sku: true,
          stock: true,
          isActive: true,
          isFeatured: true,
          isCombo: true,
          images: true,
          allergens: true,
          nutritionalInfo: true,
          weight: true,
          categoryId: true,
          createdAt: true,
          updatedAt: true,
          variants: {
            where: { isActive: true },
            orderBy: { order: 'asc' },
          },
        },
      })
      .catch(async (error) => {
        // Si falla por campos que no existen, intentar sin ellos
        if (
          error.message?.includes('does not exist') ||
          error.message?.includes('no existe') ||
          error.message?.includes('column')
        ) {
          return this.prisma.product.findUnique({
            where: { id: addToCartDto.productId },
            select: {
              id: true,
              name: true,
              slug: true,
              description: true,
              shortDescription: true,
              priceUSD: true,
              priceMNs: true,
              comparePriceUSD: true,
              comparePriceMNs: true,
              sku: true,
              stock: true,
              isActive: true,
              isFeatured: true,
              isCombo: true,
              images: true,
              allergens: true,
              nutritionalInfo: true,
              weight: true,
              categoryId: true,
              createdAt: true,
              updatedAt: true,
              variants: {
                where: { isActive: true },
                orderBy: { order: 'asc' },
              },
            },
          });
        }
        throw error;
      });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    if (!product.isActive) {
      throw new BadRequestException('El producto no está disponible');
    }

    // Si hay variante, verificar que existe y tiene stock
    let variant = null;
    if (addToCartDto.productVariantId) {
      variant = await this.prisma.productVariant.findUnique({
        where: { id: addToCartDto.productVariantId },
      });

      if (!variant || variant.productId !== product.id) {
        throw new NotFoundException('Variante del producto no encontrada');
      }

      if (!variant.isActive) {
        throw new BadRequestException('La variante del producto no está disponible');
      }
    }

    // Buscar item existente con la misma combinación de producto y variante
    const existingItem = await this.prisma.cartItem.findFirst({
      where: {
        userId,
        productId: addToCartDto.productId,
        productVariantId: addToCartDto.productVariantId || null,
      },
    });

    // Calcular cantidad total que se intentará agregar
    const totalQuantity = existingItem
      ? existingItem.quantity + addToCartDto.quantity
      : addToCartDto.quantity;

    // Verificar stock disponible
    const availableStock = variant ? variant.stock : product.stock;

    if (availableStock < totalQuantity) {
      const productName = product.name;
      const variantName = variant ? ` (${variant.name})` : '';
      const availableText =
        availableStock === 0
          ? 'no disponible'
          : `solo ${availableStock} disponible${availableStock > 1 ? 's' : ''}`;

      throw new BadRequestException(
        `Stock insuficiente para "${productName}${variantName}". ${availableText}.`,
      );
    }

    const productSelect = {
      id: true,
      name: true,
      slug: true,
      description: true,
      shortDescription: true,
      priceUSD: true,
      priceMNs: true,
      comparePriceUSD: true,
      comparePriceMNs: true,
      sku: true,
      stock: true,
      isActive: true,
      isFeatured: true,
      isCombo: true,
      images: true,
      allergens: true,
      nutritionalInfo: true,
      weight: true,
      categoryId: true,
      createdAt: true,
      updatedAt: true,
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    };

    if (existingItem) {
      return this.prisma.cartItem
        .update({
          where: { id: existingItem.id },
          data: {
            quantity: totalQuantity,
          },
          include: {
            product: {
              select: productSelect,
            },
            productVariant: true,
          },
        })
        .catch(async (error) => {
          if (
            error.message?.includes('does not exist') ||
            error.message?.includes('no existe') ||
            error.message?.includes('column')
          ) {
            return this.prisma.cartItem.update({
              where: { id: existingItem.id },
              data: {
                quantity: totalQuantity,
              },
              include: {
                product: {
                  select: productSelect,
                },
                productVariant: true,
              },
            });
          }
          throw error;
        });
    }

    return this.prisma.cartItem
      .create({
        data: {
          userId,
          productId: addToCartDto.productId,
          productVariantId: addToCartDto.productVariantId || null,
          quantity: addToCartDto.quantity,
        },
        include: {
          product: {
            select: productSelect,
          },
          productVariant: true,
        },
      })
      .catch(async (error) => {
        if (
          error.message?.includes('does not exist') ||
          error.message?.includes('no existe') ||
          error.message?.includes('column')
        ) {
          return this.prisma.cartItem.create({
            data: {
              userId,
              productId: addToCartDto.productId,
              productVariantId: addToCartDto.productVariantId || null,
              quantity: addToCartDto.quantity,
            },
            include: {
              product: {
                select: productSelect,
              },
              productVariant: true,
            },
          });
        }
        throw error;
      });
  }

  async updateCartItem(userId: string, itemId: string, updateDto: UpdateCartItemDto) {
    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, userId },
      include: { product: true, productVariant: true },
    });

    if (!item) {
      throw new NotFoundException('Item del carrito no encontrado');
    }

    // Obtener stock actualizado de la base de datos
    let availableStock: number;
    let productName: string;
    let variantName: string | null = null;

    if (item.productVariant) {
      const variant = await this.prisma.productVariant.findUnique({
        where: { id: item.productVariant.id },
      });

      if (!variant || !variant.isActive) {
        throw new BadRequestException('La variante del producto ya no está disponible');
      }

      availableStock = variant.stock;
      productName = item.product.name;
      variantName = variant.name;
    } else {
      const product = await this.prisma.product.findUnique({
        where: { id: item.product.id },
      });

      if (!product || !product.isActive) {
        throw new BadRequestException('El producto ya no está disponible');
      }

      availableStock = product.stock;
      productName = product.name;
    }

    if (availableStock < updateDto.quantity) {
      const availableText =
        availableStock === 0
          ? 'no disponible'
          : `solo ${availableStock} disponible${availableStock > 1 ? 's' : ''}`;
      const variantText = variantName ? ` (${variantName})` : '';

      throw new BadRequestException(
        `Stock insuficiente para "${productName}${variantText}". ${availableText}.`,
      );
    }

    const productSelect = {
      id: true,
      name: true,
      slug: true,
      description: true,
      shortDescription: true,
      priceUSD: true,
      priceMNs: true,
      comparePriceUSD: true,
      comparePriceMNs: true,
      sku: true,
      stock: true,
      isActive: true,
      isFeatured: true,
      isCombo: true,
      images: true,
      allergens: true,
      nutritionalInfo: true,
      weight: true,
      categoryId: true,
      createdAt: true,
      updatedAt: true,
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    };

    return this.prisma.cartItem
      .update({
        where: { id: itemId },
        data: { quantity: updateDto.quantity },
        include: {
          product: {
            select: productSelect,
          },
          productVariant: true,
        },
      })
      .catch(async (error) => {
        if (
          error.message?.includes('does not exist') ||
          error.message?.includes('no existe') ||
          error.message?.includes('column')
        ) {
          return this.prisma.cartItem.update({
            where: { id: itemId },
            data: { quantity: updateDto.quantity },
            include: {
              product: {
                select: productSelect,
              },
              productVariant: true,
            },
          });
        }
        throw error;
      });
  }

  async removeFromCart(userId: string, itemId: string) {
    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, userId },
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    return this.prisma.cartItem.delete({
      where: { id: itemId },
    });
  }

  async clearCart(userId: string) {
    return this.prisma.cartItem.deleteMany({
      where: { userId },
    });
  }

  /**
   * Valida el stock de todos los items del carrito
   * Retorna información sobre items con problemas de stock
   */
  async validateCart(userId: string) {
    const productSelect = {
      id: true,
      name: true,
      slug: true,
      description: true,
      shortDescription: true,
      priceUSD: true,
      priceMNs: true,
      comparePriceUSD: true,
      comparePriceMNs: true,
      sku: true,
      stock: true,
      isActive: true,
      isFeatured: true,
      isCombo: true,
      images: true,
      allergens: true,
      nutritionalInfo: true,
      weight: true,
      categoryId: true,
      createdAt: true,
      updatedAt: true,
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    };

    const cartItems = await this.prisma.cartItem
      .findMany({
        where: { userId },
        include: {
          product: {
            select: productSelect,
          },
          productVariant: true,
        },
      })
      .catch(async (error) => {
        if (
          error.message?.includes('does not exist') ||
          error.message?.includes('no existe') ||
          error.message?.includes('column')
        ) {
          return this.prisma.cartItem.findMany({
            where: { userId },
            include: {
              product: {
                select: productSelect,
              },
              productVariant: true,
            },
          });
        }
        throw error;
      });

    const validationResults: Array<{
      itemId: string;
      productId: string;
      productName: string;
      variantId?: string;
      variantName?: string;
      requestedQuantity: number;
      availableStock: number;
      isAvailable: boolean;
      isActive: boolean;
      issue: 'out_of_stock' | 'insufficient_stock' | 'unavailable' | null;
    }> = [];

    for (const item of cartItems) {
      let availableStock: number;
      let isActive: boolean;
      let issue: 'out_of_stock' | 'insufficient_stock' | 'unavailable' | null = null;

      if (item.productVariant) {
        // Obtener datos actualizados de la variante
        const variant = await this.prisma.productVariant.findUnique({
          where: { id: item.productVariant.id },
        });

        if (!variant) {
          issue = 'unavailable';
          isActive = false;
          availableStock = 0;
        } else {
          isActive = variant.isActive && item.product.isActive;
          availableStock = variant.stock;

          if (!isActive) {
            issue = 'unavailable';
          } else if (availableStock === 0) {
            issue = 'out_of_stock';
          } else if (availableStock < item.quantity) {
            issue = 'insufficient_stock';
          }
        }
      } else {
        // Obtener datos actualizados del producto
        const product = await this.prisma.product.findUnique({
          where: { id: item.product.id },
        });

        if (!product) {
          issue = 'unavailable';
          isActive = false;
          availableStock = 0;
        } else {
          isActive = product.isActive;
          availableStock = product.stock;

          if (!isActive) {
            issue = 'unavailable';
          } else if (availableStock === 0) {
            issue = 'out_of_stock';
          } else if (availableStock < item.quantity) {
            issue = 'insufficient_stock';
          }
        }
      }

      validationResults.push({
        itemId: item.id,
        productId: item.product.id,
        productName: item.product.name,
        variantId: item.productVariant?.id,
        variantName: item.productVariant?.name,
        requestedQuantity: item.quantity,
        availableStock,
        isAvailable: issue === null,
        isActive,
        issue,
      });
    }

    const hasIssues = validationResults.some((result) => result.issue !== null);
    const isValid = !hasIssues;

    return {
      isValid,
      hasIssues,
      items: validationResults,
      summary: {
        total: validationResults.length,
        valid: validationResults.filter((r) => r.isAvailable).length,
        outOfStock: validationResults.filter((r) => r.issue === 'out_of_stock').length,
        insufficientStock: validationResults.filter((r) => r.issue === 'insufficient_stock').length,
        unavailable: validationResults.filter((r) => r.issue === 'unavailable').length,
      },
    };
  }
}
