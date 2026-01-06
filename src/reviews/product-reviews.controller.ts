import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { CreatePublicReviewDto } from './dto/create-public-review.dto';

@ApiTags('reviews')
@Controller('products/:productId/reviews')
export class ProductReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  @ApiOperation({ summary: 'Get approved reviews for a product' })
  async listApproved(@Param('productId') productId: string) {
    return this.reviewsService.getApprovedByProduct(productId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a review for a product (pending approval)' })
  async create(@Param('productId') productId: string, @Body() dto: CreatePublicReviewDto) {
    return this.reviewsService.createPublic(productId, dto);
  }
}

