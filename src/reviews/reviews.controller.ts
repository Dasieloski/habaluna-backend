import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ReviewsService } from './reviews.service';
import { ListAdminReviewsDto } from './dto/list-admin-reviews.dto';
import { CreateAdminReviewDto } from './dto/create-admin-review.dto';
import { UpdateAdminReviewDto } from './dto/update-admin-review.dto';
import { UpdateReviewSettingsDto } from './dto/update-review-settings.dto';
import { UpdateUserReviewDto } from './dto/update-user-review.dto';

@ApiTags('reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  // Admin
  @Get('admin/settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get review settings (Admin only)' })
  async adminGetSettings() {
    return this.reviewsService.adminGetSettings();
  }

  @Patch('admin/settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update review settings (Admin only)' })
  async adminUpdateSettings(@Body() dto: UpdateReviewSettingsDto) {
    return this.reviewsService.adminUpdateSettings(dto);
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List reviews (Admin only)' })
  async adminList(@Query() dto: ListAdminReviewsDto) {
    return this.reviewsService.adminList(dto);
  }

  @Post('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create review (Admin only)' })
  async adminCreate(@Body() dto: CreateAdminReviewDto) {
    return this.reviewsService.adminCreate(dto);
  }

  @Patch('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update review (Admin only)' })
  async adminUpdate(@Param('id') id: string, @Body() dto: UpdateAdminReviewDto) {
    return this.reviewsService.adminUpdate(id, dto);
  }

  @Delete('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete review (Admin only)' })
  async adminDelete(@Param('id') id: string) {
    return this.reviewsService.adminDelete(id);
  }

  // User endpoints
  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update own review' })
  async updateOwnReview(
    @Param('id') id: string,
    @Body() dto: UpdateUserReviewDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.reviewsService.updateUserReview(user.id, id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete own review' })
  async deleteOwnReview(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.reviewsService.deleteUserReview(user.id, id);
  }
}
