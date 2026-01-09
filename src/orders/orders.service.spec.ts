import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { CartService } from '../cart/cart.service';
import { createMockPrismaService } from '../common/mocks/prisma.mock';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto, OrderStatus, PaymentStatus } from './dto/update-order-status.dto';

describe('OrdersService', () => {
  let service: OrdersService;
  let prismaService: any;
  let cartService: jest.Mocked<CartService>;

  const mockUserId = 'user-1';
  const mockProduct = {
    id: 'product-1',
    name: 'Test Product',
    priceUSD: 10.0,
    priceMNs: null,
    stock: 10,
  };

  const mockCartItem = {
    id: 'cart-item-1',
    userId: mockUserId,
    productId: 'product-1',
    productVariantId: null,
    quantity: 2,
    product: mockProduct,
    productVariant: null,
  };

  const mockCart = {
    items: [mockCartItem],
    subtotal: 20.0,
    total: 20.0,
  };

  const mockOrder = {
    id: 'order-1',
    orderNumber: 'ORD-1234567890-ABC',
    userId: mockUserId,
    status: 'PENDING',
    paymentStatus: 'PENDING',
    subtotal: 20.0,
    tax: 4.2,
    shipping: 5.99,
    total: 30.19,
    shippingAddress: {
      firstName: 'Test',
      lastName: 'User',
      address: '123 Test St',
      city: 'Test City',
      zipCode: '12345',
      country: 'España',
    },
    billingAddress: {
      firstName: 'Test',
      lastName: 'User',
      address: '123 Test St',
      city: 'Test City',
      zipCode: '12345',
      country: 'España',
    },
    paymentIntentId: null,
    notes: null,
    items: [
      {
        id: 'order-item-1',
        orderId: 'order-1',
        productId: 'product-1',
        productVariantId: null,
        variantName: null,
        quantity: 2,
        price: 10.0,
        product: mockProduct,
        productVariant: null,
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: CartService,
          useValue: {
            getCart: jest.fn(),
            clearCart: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    prismaService = module.get(PrismaService);
    cartService = module.get(CartService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    const createOrderDto: CreateOrderDto = {
      shippingAddress: {
        firstName: 'Test',
        lastName: 'User',
        address: '123 Test St',
        city: 'Test City',
        zipCode: '12345',
        country: 'España',
      },
      billingAddress: {
        firstName: 'Test',
        lastName: 'User',
        address: '123 Test St',
        city: 'Test City',
        zipCode: '12345',
        country: 'España',
      },
    };

    it('debería crear una orden exitosamente', async () => {
      cartService.getCart.mockResolvedValue(mockCart as any);
      prismaService.order.create.mockResolvedValue(mockOrder as any);

      const result = await service.create(mockUserId, createOrderDto);

      expect(result).toBeDefined();
      expect(result.orderNumber).toContain('ORD-');
      expect(result.status).toBe('PENDING');
      expect(result.paymentStatus).toBe('PENDING');
      expect(prismaService.order.create).toHaveBeenCalled();
    });

    it('debería lanzar BadRequestException si el carrito está vacío', async () => {
      cartService.getCart.mockResolvedValue({ items: [], subtotal: 0, total: 0 } as any);

      await expect(service.create(mockUserId, createOrderDto)).rejects.toThrow(BadRequestException);
    });

    it('debería lanzar BadRequestException si no hay stock suficiente', async () => {
      const outOfStockItem = {
        ...mockCartItem,
        product: { ...mockProduct, stock: 1 },
        quantity: 5,
      };
      const cartWithLowStock = {
        items: [outOfStockItem],
        subtotal: 50.0,
        total: 50.0,
      };

      cartService.getCart.mockResolvedValue(cartWithLowStock as any);

      await expect(service.create(mockUserId, createOrderDto)).rejects.toThrow(BadRequestException);
    });

    it('debería calcular correctamente tax y shipping', async () => {
      cartService.getCart.mockResolvedValue(mockCart as any);
      prismaService.order.create.mockResolvedValue(mockOrder as any);

      await service.create(mockUserId, createOrderDto);

      expect(prismaService.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subtotal: 20.0,
            tax: 4.2, // 20 * 0.21
            shipping: 5.99, // Menos de 50 USD
            total: expect.closeTo(30.19, 2), // 20 + 4.2 + 5.99 (usar closeTo para evitar problemas de precisión)
          }),
        }),
      );
    });

    it('debería ofrecer envío gratis si el subtotal es >= 50', async () => {
      const largeCart = {
        items: [{ ...mockCartItem, quantity: 5 }],
        subtotal: 50.0,
        total: 50.0,
      };

      cartService.getCart.mockResolvedValue(largeCart as any);
      prismaService.order.create.mockResolvedValue({
        ...mockOrder,
        subtotal: 50.0,
        shipping: 0,
      } as any);

      await service.create(mockUserId, createOrderDto);

      expect(prismaService.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            shipping: 0,
          }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('debería retornar todas las órdenes si no se especifica userId', async () => {
      prismaService.order.findMany.mockResolvedValue([mockOrder] as any);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(prismaService.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        }),
      );
    });

    it('debería filtrar por userId si se especifica', async () => {
      prismaService.order.findMany.mockResolvedValue([mockOrder] as any);

      const result = await service.findAll(mockUserId);

      expect(result).toHaveLength(1);
      expect(prismaService.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: mockUserId },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('debería retornar una orden por ID', async () => {
      prismaService.order.findFirst.mockResolvedValue(mockOrder as any);

      const result = await service.findOne('order-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('order-1');
    });

    it('debería lanzar NotFoundException si la orden no existe', async () => {
      prismaService.order.findFirst.mockResolvedValue(null);

      await expect(service.findOne('nonexistent-id')).rejects.toThrow(NotFoundException);
    });

    it('debería filtrar por userId si se especifica', async () => {
      prismaService.order.findFirst.mockResolvedValue(mockOrder as any);

      await service.findOne('order-1', mockUserId);

      expect(prismaService.order.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order-1', userId: mockUserId },
        }),
      );
    });
  });

  describe('updateStatus', () => {
    const updateDto: UpdateOrderStatusDto = {
      status: OrderStatus.PROCESSING,
      paymentStatus: PaymentStatus.PAID,
    };

    it('debería actualizar el estado de la orden', async () => {
      prismaService.order.findFirst.mockResolvedValue(mockOrder as any);
      prismaService.order.update.mockResolvedValue({
        ...mockOrder,
        ...updateDto,
      } as any);

      const result = await service.updateStatus('order-1', updateDto);

      expect(result.status).toBe('PROCESSING');
      expect(result.paymentStatus).toBe('PAID');
      expect(prismaService.order.update).toHaveBeenCalled();
    });

    it('debería lanzar NotFoundException si la orden no existe', async () => {
      prismaService.order.findFirst.mockResolvedValue(null);

      await expect(service.updateStatus('nonexistent-id', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const updateDto = {
      paymentIntentId: 'pi_test_123',
    };

    it('debería actualizar una orden', async () => {
      prismaService.order.findUnique.mockResolvedValue(mockOrder as any);
      prismaService.order.update.mockResolvedValue({
        ...mockOrder,
        ...updateDto,
      } as any);

      const result = await service.update('order-1', updateDto);

      expect(result.paymentIntentId).toBe('pi_test_123');
      expect(prismaService.order.update).toHaveBeenCalled();
    });

    it('debería lanzar NotFoundException si la orden no existe', async () => {
      prismaService.order.findUnique.mockResolvedValue(null);

      await expect(service.update('nonexistent-id', updateDto)).rejects.toThrow(NotFoundException);
    });
  });
});
