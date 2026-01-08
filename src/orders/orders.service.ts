import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { CartService } from '../cart/cart.service';
import { convertToUSD } from '../common/utils/currency.utils';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private cartService: CartService,
  ) {}

  async create(userId: string, createOrderDto: CreateOrderDto) {
    const cart = await this.cartService.getCart(userId);

    if (cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    // Validate stock
    for (const item of cart.items) {
      const stock = item.productVariant ? item.productVariant.stock : item.product.stock;

      if (stock < item.quantity) {
        const itemName = item.productVariant
          ? `${item.product.name} - ${item.productVariant.name}`
          : item.product.name;
        throw new BadRequestException(`Insufficient stock for ${itemName}`);
      }
    }

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Calculate totals (todo en USD)
    const subtotal = cart.subtotal; // Ya está en USD
    const tax = subtotal * 0.21; // 21% IVA
    const shipping = subtotal >= 50 ? 0 : 5.99; // Free shipping over 50 USD
    const total = subtotal + tax + shipping;

    // Create order (sin descontar stock ni limpiar carrito - se hará cuando se confirme el pago)
    const order = await this.prisma.order.create({
      data: {
        orderNumber,
        userId,
        subtotal,
        tax,
        shipping,
        total,
        shippingAddress: createOrderDto.shippingAddress,
        billingAddress: createOrderDto.billingAddress || createOrderDto.shippingAddress,
        paymentIntentId: createOrderDto.paymentIntentId,
        notes: createOrderDto.notes,
        status: 'PENDING', // Estado pendiente hasta que se confirme el pago
        paymentStatus: 'PENDING',
        items: {
          create: cart.items.map((item) => {
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
            return {
              productId: item.productId,
              productVariantId: item.productVariantId || null,
              variantName: item.productVariant?.name || null,
              quantity: item.quantity,
              price: priceInUSD,
            };
          }),
        },
      },
      include: {
        items: {
          include: {
            product: true,
            productVariant: true,
          },
        },
      },
    });

    // NO descontamos stock ni limpiamos el carrito aquí
    // Esto se hará cuando se confirme el pago exitosamente

    return order;
  }

  async findAll(userId?: string) {
    const where: any = {};
    if (userId) {
      where.userId = userId;
    }

    return this.prisma.order.findMany({
      where,
      include: {
        items: {
          include: {
            product: true,
            productVariant: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId?: string) {
    const where: any = { id };
    if (userId) {
      where.userId = userId;
    }

    const order = await this.prisma.order.findFirst({
      where,
      include: {
        items: {
          include: {
            product: true,
            productVariant: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async updateStatus(id: string, updateDto: UpdateOrderStatusDto) {
    await this.findOne(id);
    return this.prisma.order.update({
      where: { id },
      data: {
        status: updateDto.status,
        paymentStatus: updateDto.paymentStatus,
      },
      include: {
        items: {
          include: {
            product: true,
            productVariant: true,
          },
        },
      },
    });
  }

  async update(id: string, updateDto: UpdateOrderDto, userId?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
            productVariant: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Si se proporciona userId, verificar que la orden pertenece al usuario
    if (userId && order.userId !== userId) {
      throw new NotFoundException('Order not found');
    }

    // Si se está actualizando el paymentIntentId, significa que el pago fue exitoso
    // En ese caso, confirmamos la orden, descontamos stock y limpiamos el carrito
    if (updateDto.paymentIntentId && order.status === 'PENDING') {
      // Validar stock antes de confirmar
      for (const item of order.items) {
        const stock = item.productVariant ? item.productVariant.stock : item.product.stock;

        if (stock < item.quantity) {
          const itemName = item.productVariant
            ? `${item.product.name} - ${item.productVariant.name}`
            : item.product.name;
          throw new BadRequestException(`Insufficient stock for ${itemName}`);
        }
      }

      // Descontar stock
      for (const item of order.items) {
        if (item.productVariantId) {
          await this.prisma.productVariant.update({
            where: { id: item.productVariantId },
            data: {
              stock: {
                decrement: item.quantity,
              },
            },
          });
        } else {
          await this.prisma.product.update({
            where: { id: item.productId },
            data: {
              stock: {
                decrement: item.quantity,
              },
            },
          });
        }
      }

      // Limpiar carrito
      await this.cartService.clearCart(order.userId);

      // Actualizar orden con paymentIntentId y cambiar estado a PROCESSING
      return this.prisma.order.update({
        where: { id },
        data: {
          paymentIntentId: updateDto.paymentIntentId,
          status: 'PROCESSING',
          paymentStatus: 'PAID',
        },
        include: {
          items: {
            include: {
              product: true,
              productVariant: true,
            },
          },
        },
      });
    }

    // Si solo se actualiza el paymentIntentId sin cambiar el estado
    return this.prisma.order.update({
      where: { id },
      data: {
        paymentIntentId: updateDto.paymentIntentId,
      },
      include: {
        items: {
          include: {
            product: true,
            productVariant: true,
          },
        },
      },
    });
  }
}
