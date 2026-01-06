import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { convertToUSD } from '../common/utils/currency.utils';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  async getCart(userId: string) {
    const cartItems = await this.prisma.cartItem.findMany({
      where: { userId },
      include: {
        product: {
          include: { category: true },
        },
        productVariant: true,
      },
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
    const product = await this.prisma.product.findUnique({
      where: { id: addToCartDto.productId },
      include: { variants: true },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Si hay variante, verificar que existe y tiene stock
    let variant = null;
    if (addToCartDto.productVariantId) {
      variant = await this.prisma.productVariant.findUnique({
        where: { id: addToCartDto.productVariantId },
      });

      if (!variant || variant.productId !== product.id) {
        throw new NotFoundException('Product variant not found');
      }

      if (!variant.isActive) {
        throw new Error('Product variant is not available');
      }

      if (variant.stock < addToCartDto.quantity) {
        throw new Error('Insufficient stock for this variant');
      }
    } else {
      // Si no hay variante, verificar stock del producto
      if (product.stock < addToCartDto.quantity) {
        throw new Error('Insufficient stock');
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

    if (existingItem) {
      return this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: existingItem.quantity + addToCartDto.quantity,
        },
        include: {
          product: {
            include: { category: true },
          },
          productVariant: true,
        },
      });
    }

    return this.prisma.cartItem.create({
      data: {
        userId,
        productId: addToCartDto.productId,
        productVariantId: addToCartDto.productVariantId || null,
        quantity: addToCartDto.quantity,
      },
      include: {
        product: {
          include: { category: true },
        },
        productVariant: true,
      },
    });
  }

  async updateCartItem(userId: string, itemId: string, updateDto: UpdateCartItemDto) {
    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, userId },
      include: { product: true, productVariant: true },
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    // Verificar stock según si tiene variante o no
    const stock = item.productVariant 
      ? item.productVariant.stock 
      : item.product.stock;

    if (stock < updateDto.quantity) {
      throw new Error('Insufficient stock');
    }

    return this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity: updateDto.quantity },
      include: {
        product: {
          include: { category: true },
        },
        productVariant: true,
      },
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
}

