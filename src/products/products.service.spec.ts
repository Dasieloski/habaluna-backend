import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';
import { createMockPrismaService } from '../common/mocks/prisma.mock';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

describe('ProductsService', () => {
  let service: ProductsService;
  let prismaService: any;

  const mockCategory = {
    id: 'category-1',
    name: 'Test Category',
    slug: 'test-category',
    description: 'Test description',
    image: null,
    isActive: true,
    order: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockProduct = {
    id: 'product-1',
    name: 'Test Product',
    slug: 'test-product',
    description: 'Test description',
    shortDescription: null,
    priceUSD: 10.0,
    priceMNs: null,
    comparePriceUSD: null,
    comparePriceMNs: null,
    sku: 'SKU-001',
    stock: 10,
    isActive: true,
    isFeatured: false,
    isCombo: false,
    images: ['image1.jpg'],
    allergens: [],
    nutritionalInfo: null,
    weight: null,
    categoryId: 'category-1',
    category: mockCategory,
    variants: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockPrisma = createMockPrismaService();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    prismaService = module.get(PrismaService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    const createProductDto: CreateProductDto = {
      name: 'New Product',
      slug: 'new-product',
      description: 'New product description',
      categoryId: 'category-1',
      stock: 5,
      images: ['image1.jpg'],
      allergens: [],
    };

    it('debería crear un producto exitosamente', async () => {
      prismaService.category.findUnique.mockResolvedValue(mockCategory as any);
      prismaService.$transaction.mockImplementation(async (callback: any) => {
        return callback({
          product: {
            create: jest.fn().mockResolvedValue(mockProduct),
            update: jest.fn(),
            delete: jest.fn(),
          },
          comboItem: {
            createMany: jest.fn().mockResolvedValue({ count: 0 }),
          },
        });
      });

      const result = await service.create(createProductDto);

      expect(result).toBeDefined();
      expect(prismaService.$transaction).toHaveBeenCalled();
    });

    it('debería desactivar producto si está en categoría "sin-categoria"', async () => {
      const uncategorizedCategory = { ...mockCategory, slug: 'sin-categoria' };
      prismaService.category.findUnique.mockResolvedValue(uncategorizedCategory as any);
      prismaService.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          product: {
            create: jest.fn().mockResolvedValue({ ...mockProduct, isActive: false }),
          },
          comboItem: {
            createMany: jest.fn().mockResolvedValue({ count: 0 }),
          },
        };
        return callback(tx);
      });

      await service.create(createProductDto);

      expect(prismaService.$transaction).toHaveBeenCalled();
    });

    it('debería lanzar ConflictException si el slug ya existe', async () => {
      prismaService.category.findUnique.mockResolvedValue(mockCategory as any);
      prismaService.$transaction.mockImplementation(async () => {
        const error: any = new Error('Unique constraint failed');
        error.code = 'P2002';
        error.meta = { target: ['slug'] };
        throw error;
      });

      await expect(service.create(createProductDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    const pagination: PaginationDto = {
      page: 1,
      limit: 10,
    };

    it('debería retornar lista de productos con paginación', async () => {
      prismaService.product.findMany.mockResolvedValue([mockProduct] as any);
      prismaService.product.count.mockResolvedValue(1);

      const result = await service.findAll(pagination);

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('meta');
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
    });

    it('debería filtrar por categoría', async () => {
      prismaService.product.findMany.mockResolvedValue([mockProduct] as any);
      prismaService.product.count.mockResolvedValue(1);

      const result = await service.findAll(pagination, { categoryId: 'category-1' });

      expect(result.data).toHaveLength(1);
      expect(prismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            categoryId: 'category-1',
          }),
        }),
      );
    });

    it('debería filtrar por búsqueda de texto', async () => {
      prismaService.product.findMany.mockResolvedValue([mockProduct] as any);
      prismaService.product.count.mockResolvedValue(1);

      const result = await service.findAll(pagination, { search: 'test' });

      expect(result.data).toHaveLength(1);
      expect(prismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                name: expect.objectContaining({
                  contains: 'test',
                }),
              }),
            ]),
          }),
        }),
      );
    });

    it('debería filtrar por rango de precios', async () => {
      prismaService.product.findMany.mockResolvedValue([mockProduct] as any);
      prismaService.product.count.mockResolvedValue(1);

      await service.findAll(pagination, { minPrice: 5, maxPrice: 15 });

      expect(prismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                priceUSD: expect.objectContaining({
                  gte: 5,
                  lte: 15,
                }),
              }),
            ]),
          }),
        }),
      );
    });

    it('debería filtrar por stock disponible', async () => {
      prismaService.product.findMany.mockResolvedValue([mockProduct] as any);
      prismaService.product.count.mockResolvedValue(1);

      await service.findAll(pagination, { inStock: true });

      expect(prismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            stock: expect.objectContaining({
              gt: 0,
            }),
          }),
        }),
      );
    });

    it('debería ordenar por precio ascendente', async () => {
      prismaService.product.findMany.mockResolvedValue([mockProduct] as any);
      prismaService.product.count.mockResolvedValue(1);

      await service.findAll(pagination, { sortBy: 'price-asc' });

      expect(prismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { priceUSD: 'asc' },
        }),
      );
    });

    it('debería ordenar por nombre descendente', async () => {
      prismaService.product.findMany.mockResolvedValue([mockProduct] as any);
      prismaService.product.count.mockResolvedValue(1);

      await service.findAll(pagination, { sortBy: 'name-desc' });

      expect(prismaService.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { name: 'desc' },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('debería retornar un producto por ID', async () => {
      prismaService.product.findUnique.mockResolvedValue(mockProduct as any);

      const result = await service.findOne('product-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('product-1');
      expect(prismaService.product.findUnique).toHaveBeenCalledWith({
        where: { id: 'product-1' },
        include: expect.any(Object),
      });
    });

    it('debería lanzar NotFoundException si el producto no existe', async () => {
      prismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const updateProductDto: UpdateProductDto = {
      name: 'Updated Product',
      stock: 20,
    };

    it('debería actualizar un producto exitosamente', async () => {
      const updatedProduct = { ...mockProduct, ...updateProductDto, category: mockCategory };
      prismaService.product.findUnique.mockResolvedValue(mockProduct as any);
      prismaService.category.findUnique.mockResolvedValue(mockCategory as any);
      prismaService.$transaction.mockImplementation(async (callback: any) => {
        return callback({
          product: {
            update: jest.fn().mockResolvedValue(updatedProduct),
            delete: jest.fn(),
          },
          comboItem: {
            deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
          },
        });
      });

      const result = await service.update('product-1', updateProductDto);

      expect(result.name).toBe('Updated Product');
      expect(result.stock).toBe(20);
      expect(prismaService.$transaction).toHaveBeenCalled();
    });

    it('debería lanzar NotFoundException si el producto no existe', async () => {
      prismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.update('nonexistent-id', updateProductDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('debería eliminar un producto exitosamente', async () => {
      prismaService.product.findUnique.mockResolvedValue(mockProduct as any);
      prismaService.product.delete.mockResolvedValue(mockProduct as any);

      const result = await service.remove('product-1');

      expect(result).toBeDefined();
      expect(prismaService.product.delete).toHaveBeenCalled();
    });

    it('debería lanzar NotFoundException si el producto no existe', async () => {
      prismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.remove('nonexistent-id')).rejects.toThrow(NotFoundException);
    });
  });
});
