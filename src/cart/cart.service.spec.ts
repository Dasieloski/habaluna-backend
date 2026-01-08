import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CartService } from './cart.service';
import { PrismaService } from '../prisma/prisma.service';
import { createMockPrismaService } from '../common/mocks/prisma.mock';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

describe('CartService', () => {
  let service: CartService;
  let prismaService: any;

  const mockUserId = 'user-1';
  const mockProduct = {
    id: 'product-1',
    name: 'Test Product',
    slug: 'test-product',
    description: 'Test description',
    priceUSD: 10.0,
    priceMNs: null,
    stock: 10,
    isActive: true,
    isFeatured: false,
    isCombo: false,
    images: [],
    allergens: [],
    categoryId: 'category-1',
    category: {
      id: 'category-1',
      name: 'Test Category',
      slug: 'test-category',
    },
    variants: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockVariant = {
    id: 'variant-1',
    productId: 'product-1',
    name: '500 gr',
    priceUSD: 12.0,
    priceMNs: null,
    stock: 5,
    isActive: true,
    order: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCartItem = {
    id: 'cart-item-1',
    userId: mockUserId,
    productId: 'product-1',
    productVariantId: null,
    quantity: 2,
    createdAt: new Date(),
    updatedAt: new Date(),
    product: mockProduct,
    productVariant: null,
  };

  beforeEach(async () => {
    const mockPrisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
    prismaService = module.get(PrismaService);

    jest.clearAllMocks();
  });

  describe('getCart', () => {
    it('debería retornar el carrito del usuario con subtotal calculado', async () => {
      prismaService.cartItem.findMany.mockResolvedValue([mockCartItem] as any);

      const result = await service.getCart(mockUserId);

      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('subtotal');
      expect(result).toHaveProperty('total');
      expect(result.items).toHaveLength(1);
      expect(result.subtotal).toBe(20.0); // 10.0 * 2
    });

    it('debería retornar carrito vacío si no hay items', async () => {
      prismaService.cartItem.findMany.mockResolvedValue([]);

      const result = await service.getCart(mockUserId);

      expect(result.items).toHaveLength(0);
      expect(result.subtotal).toBe(0);
    });
  });

  describe('addToCart', () => {
    const addToCartDto: AddToCartDto = {
      productId: 'product-1',
      quantity: 2,
    };

    it('debería agregar un producto nuevo al carrito', async () => {
      prismaService.product.findUnique.mockResolvedValue(mockProduct as any);
      prismaService.cartItem.findFirst.mockResolvedValue(null);
      prismaService.cartItem.create.mockResolvedValue(mockCartItem as any);

      const result = await service.addToCart(mockUserId, addToCartDto);

      expect(result).toBeDefined();
      expect(prismaService.cartItem.create).toHaveBeenCalled();
    });

    it('debería actualizar la cantidad si el item ya existe', async () => {
      prismaService.product.findUnique.mockResolvedValue(mockProduct as any);
      prismaService.cartItem.findFirst.mockResolvedValue(mockCartItem as any);
      prismaService.cartItem.update.mockResolvedValue({
        ...mockCartItem,
        quantity: 4,
      } as any);

      const result = await service.addToCart(mockUserId, addToCartDto);

      expect(result.quantity).toBe(4);
      expect(prismaService.cartItem.update).toHaveBeenCalled();
    });

    it('debería lanzar NotFoundException si el producto no existe', async () => {
      prismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.addToCart(mockUserId, addToCartDto)).rejects.toThrow(NotFoundException);
    });

    it('debería lanzar BadRequestException si el producto no está activo', async () => {
      const inactiveProduct = { ...mockProduct, isActive: false };
      prismaService.product.findUnique.mockResolvedValue(inactiveProduct as any);

      await expect(service.addToCart(mockUserId, addToCartDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debería lanzar BadRequestException si no hay stock suficiente', async () => {
      const lowStockProduct = { ...mockProduct, stock: 1 };
      prismaService.product.findUnique.mockResolvedValue(lowStockProduct as any);
      prismaService.cartItem.findFirst.mockResolvedValue(null);

      await expect(service.addToCart(mockUserId, { ...addToCartDto, quantity: 5 })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('debería agregar producto con variante correctamente', async () => {
      const variantDto: AddToCartDto = {
        productId: 'product-1',
        productVariantId: 'variant-1',
        quantity: 2,
      };

      prismaService.product.findUnique.mockResolvedValue(mockProduct as any);
      prismaService.productVariant.findUnique.mockResolvedValue(mockVariant as any);
      prismaService.cartItem.findFirst.mockResolvedValue(null);
      prismaService.cartItem.create.mockResolvedValue({
        ...mockCartItem,
        productVariantId: 'variant-1',
        productVariant: mockVariant,
      } as any);

      const result = await service.addToCart(mockUserId, variantDto);

      expect(result).toBeDefined();
      expect(prismaService.productVariant.findUnique).toHaveBeenCalled();
    });

    it('debería lanzar NotFoundException si la variante no existe', async () => {
      const variantDto: AddToCartDto = {
        productId: 'product-1',
        productVariantId: 'nonexistent-variant',
        quantity: 1,
      };

      prismaService.product.findUnique.mockResolvedValue(mockProduct as any);
      prismaService.productVariant.findUnique.mockResolvedValue(null);

      await expect(service.addToCart(mockUserId, variantDto)).rejects.toThrow(NotFoundException);
    });

    it('debería lanzar BadRequestException si la variante no tiene stock suficiente', async () => {
      const variantDto: AddToCartDto = {
        productId: 'product-1',
        productVariantId: 'variant-1',
        quantity: 10,
      };

      prismaService.product.findUnique.mockResolvedValue(mockProduct as any);
      prismaService.productVariant.findUnique.mockResolvedValue(mockVariant as any);
      prismaService.cartItem.findFirst.mockResolvedValue(null);

      await expect(service.addToCart(mockUserId, variantDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateCartItem', () => {
    const updateDto: UpdateCartItemDto = {
      quantity: 3,
    };

    it('debería actualizar la cantidad del item', async () => {
      prismaService.cartItem.findFirst.mockResolvedValue(mockCartItem as any);
      prismaService.product.findUnique.mockResolvedValue(mockProduct as any);
      prismaService.cartItem.update.mockResolvedValue({
        ...mockCartItem,
        quantity: 3,
      } as any);

      const result = await service.updateCartItem(mockUserId, 'cart-item-1', updateDto);

      expect(result.quantity).toBe(3);
      expect(prismaService.cartItem.update).toHaveBeenCalled();
    });

    it('debería lanzar NotFoundException si el item no existe', async () => {
      prismaService.cartItem.findFirst.mockResolvedValue(null);

      await expect(
        service.updateCartItem(mockUserId, 'nonexistent-item', updateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('debería lanzar BadRequestException si no hay stock suficiente', async () => {
      const lowStockProduct = { ...mockProduct, stock: 2 };
      prismaService.cartItem.findFirst.mockResolvedValue(mockCartItem as any);
      prismaService.product.findUnique.mockResolvedValue(lowStockProduct as any);

      await expect(
        service.updateCartItem(mockUserId, 'cart-item-1', { quantity: 5 }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeFromCart', () => {
    it('debería eliminar el item del carrito', async () => {
      prismaService.cartItem.findFirst.mockResolvedValue(mockCartItem as any);
      prismaService.cartItem.delete.mockResolvedValue(mockCartItem as any);

      const result = await service.removeFromCart(mockUserId, 'cart-item-1');

      expect(result).toBeDefined();
      expect(prismaService.cartItem.delete).toHaveBeenCalled();
    });

    it('debería lanzar NotFoundException si el item no existe', async () => {
      prismaService.cartItem.findFirst.mockResolvedValue(null);

      await expect(service.removeFromCart(mockUserId, 'nonexistent-item')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('clearCart', () => {
    it('debería eliminar todos los items del carrito', async () => {
      prismaService.cartItem.deleteMany.mockResolvedValue({ count: 5 } as any);

      const result = await service.clearCart(mockUserId);

      expect(prismaService.cartItem.deleteMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
      });
      expect(result.count).toBe(5);
    });
  });

  describe('validateCart', () => {
    it('debería retornar validación exitosa cuando todos los items tienen stock', async () => {
      prismaService.cartItem.findMany.mockResolvedValue([mockCartItem] as any);
      prismaService.product.findUnique.mockResolvedValue(mockProduct as any);

      const result = await service.validateCart(mockUserId);

      expect(result.isValid).toBe(true);
      expect(result.hasIssues).toBe(false);
      expect(result.items).toHaveLength(1);
    });

    it('debería detectar items sin stock', async () => {
      const outOfStockProduct = { ...mockProduct, stock: 0 };
      prismaService.cartItem.findMany.mockResolvedValue([mockCartItem] as any);
      prismaService.product.findUnique.mockResolvedValue(outOfStockProduct as any);

      const result = await service.validateCart(mockUserId);

      expect(result.isValid).toBe(false);
      expect(result.hasIssues).toBe(true);
      expect(result.items[0].issue).toBe('out_of_stock');
    });

    it('debería detectar items con stock insuficiente', async () => {
      const lowStockProduct = { ...mockProduct, stock: 1 };
      const cartItemWithHighQuantity = { ...mockCartItem, quantity: 5 };
      prismaService.cartItem.findMany.mockResolvedValue([cartItemWithHighQuantity] as any);
      prismaService.product.findUnique.mockResolvedValue(lowStockProduct as any);

      const result = await service.validateCart(mockUserId);

      expect(result.isValid).toBe(false);
      expect(result.hasIssues).toBe(true);
      expect(result.items[0].issue).toBe('insufficient_stock');
    });
  });
});
