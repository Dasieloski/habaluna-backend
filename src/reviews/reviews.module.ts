import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { ProductReviewsController } from './product-reviews.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ReviewsController, ProductReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
