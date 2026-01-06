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
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

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
  @ApiOperation({ summary: 'Get all products' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'isFeatured', required: false })
  @ApiQuery({ name: 'isCombo', required: false })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('categoryId') categoryId?: string,
    @Query('search') search?: string,
    @Query('isFeatured') isFeatured?: string,
    @Query('isCombo') isCombo?: string,
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
    // Solo filtrar por isActive si no se está buscando productos destacados específicamente
    // o si se quiere mostrar todos los productos activos
    filters.isActive = true;

    return this.productsService.findAll(pagination, filters);
  }

  @Get('best-sellers')
  @ApiOperation({ summary: 'Get best seller products' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async bestSellers(@Query('limit') limit?: string) {
    const n = limit ? parseInt(limit, 10) : 8;
    return this.productsService.getBestSellers(n);
  }

  @Get('slug/:slug')
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

