import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreatePublicReviewDto } from './dto/create-public-review.dto';
import { CreateUserReviewDto } from './dto/create-user-review.dto';
import { ListReviewsDto } from './dto/list-reviews.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('reviews')
@Controller('products/:productId/reviews')
export class ProductReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  @ApiOperation({ summary: 'Get approved reviews for a product (with pagination)' })
  async listApproved(@Param('productId') productId: string, @Query() dto: ListReviewsDto) {
    return this.reviewsService.getApprovedByProduct(productId, dto);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a review for a product (user must have purchased it)' })
  async create(
    @Param('productId') productId: string,
    @Body() dto: CreateUserReviewDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.reviewsService.createUserReview(user.id, productId, dto);
  }

  @Post('public')
  @ApiOperation({
    summary: 'Create a public review for a product (pending approval, no auth required)',
  })
  async createPublic(@Param('productId') productId: string, @Body() dto: CreatePublicReviewDto) {
    return this.reviewsService.createPublic(productId, dto);
  }
}
