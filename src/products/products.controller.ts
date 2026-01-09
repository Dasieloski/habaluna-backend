import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { SearchProductsDto } from './dto/search-products.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { SearchService } from '../search/search.service';
import { Request } from 'express';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly searchService: SearchService,
  ) {}

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all products (Admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'isFeatured', required: false })
  @ApiQuery({ name: 'isCombo', required: false })
  @ApiQuery({ name: 'isActive', required: false })
  async adminFindAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
    @Query('isFeatured') isFeatured?: string,
    @Query('isCombo') isCombo?: string,
    @Query('isActive') isActive?: string,
  ) {
    const pagination: PaginationDto = {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
    };

    const filters: any = {};
    if (categoryId) filters.categoryId = categoryId;
    if (search) filters.search = search;
    if (isFeatured !== undefined && isFeatured !== '') {
      filters.isFeatured = isFeatured === 'true';
    }
    if (isCombo !== undefined && isCombo !== '') {
      filters.isCombo = isCombo === 'true';
    }
    if (isActive !== undefined && isActive !== '') {
      filters.isActive = isActive === 'true';
    }

    return this.productsService.findAll(pagination, filters);
  }

  @Get()
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300) // Cache por 5 minutos
  @ApiOperation({ summary: 'Get all products with advanced filtering and sorting' })
  async findAll(@Query() searchDto: SearchProductsDto, @Request() req?: Request) {
    const pagination: PaginationDto = {
      page: searchDto.page || 1,
      limit: searchDto.limit || 10,
    };

    const filters: any = {
      isActive: true, // Solo productos activos para usuarios públicos
    };

    if (searchDto.categoryId) filters.categoryId = searchDto.categoryId;
    if (searchDto.search) filters.search = searchDto.search;
    if (searchDto.minPrice !== undefined) filters.minPrice = searchDto.minPrice;
    if (searchDto.maxPrice !== undefined) filters.maxPrice = searchDto.maxPrice;
    if (searchDto.inStock !== undefined) filters.inStock = searchDto.inStock;
    if (searchDto.isFeatured !== undefined) filters.isFeatured = searchDto.isFeatured;
    if (searchDto.sortBy) filters.sortBy = searchDto.sortBy;

    const result = await this.productsService.findAll(pagination, filters);

    // Guardar búsqueda en historial si hay término de búsqueda
    if (searchDto.search && searchDto.search.trim().length >= 2) {
      const userId = (req as any)?.user?.id;
      this.searchService.saveSearch(
        searchDto.search,
        result.meta?.total || 0,
        userId,
      ).catch(() => {
        // Ignorar errores al guardar historial
      });
    }

    return result;
  }

  @Get('best-sellers')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(600) // Cache por 10 minutos (best sellers cambian menos frecuentemente)
  @ApiOperation({ summary: 'Get best seller products' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async bestSellers(@Query('limit') limit?: string) {
    const n = limit ? parseInt(limit, 10) : 8;
    return this.productsService.getBestSellers(n);
  }

  @Get('admin/low-stock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get products with low stock (Admin only)' })
  @ApiQuery({ name: 'threshold', required: false, type: Number, description: 'Stock threshold (default: 10)' })
  async getLowStockProducts(@Query('threshold') threshold?: string) {
    const thresholdNum = threshold ? parseInt(threshold, 10) : 10;
    return this.productsService.getLowStockProducts(thresholdNum);
  }

  @Get(':id/related')
  @ApiOperation({ summary: 'Get related products' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of related products (default: 4)' })
  async getRelatedProducts(@Param('id') id: string, @Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 4;
    return this.productsService.getRelatedProducts(id, limitNum);
  }

  @Get('slug/:slug')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(600) // Cache por 10 minutos
  @ApiOperation({ summary: 'Get product by slug' })
  async findBySlug(@Param('slug') slug: string) {
    return this.productsService.findBySlug(slug);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by id' })
  async findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create product (Admin only)' })
  async create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update product (Admin only)' })
  async update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(id, updateProductDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete product (Admin only)' })
  async remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
