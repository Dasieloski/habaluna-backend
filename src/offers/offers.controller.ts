import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { OffersService } from './offers.service';
import { CreateOfferDto } from './dto/create-offer.dto';
import { UpdateOfferDto } from './dto/update-offer.dto';
import { ListOffersDto } from './dto/list-offers.dto';
import { ValidateOfferDto } from './dto/validate-offer.dto';

@ApiTags('offers')
@Controller('offers')
export class OffersController {
  constructor(private readonly offersService: OffersService) {}

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get offers (Admin only)' })
  async findAllAdmin(@Query() query: ListOffersDto) {
    return this.offersService.findAllAdmin(query);
  }

  @Get('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get offer by id (Admin only)' })
  async findOneAdmin(@Param('id') id: string) {
    return this.offersService.findOneAdmin(id);
  }

  @Post('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create offer (Admin only)' })
  async create(@Body() dto: CreateOfferDto) {
    return this.offersService.create(dto);
  }

  @Patch('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update offer (Admin only)' })
  async update(@Param('id') id: string, @Body() dto: UpdateOfferDto) {
    return this.offersService.update(id, dto);
  }

  @Delete('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete offer (Admin only)' })
  async remove(@Param('id') id: string) {
    return this.offersService.remove(id);
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate and calculate discount for an offer code' })
  @ApiResponse({ status: 200, description: 'Offer validation result' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async validateOffer(@Body() dto: ValidateOfferDto) {
    return this.offersService.validateOffer(dto.code, dto.subtotal);
  }
}
