import { PartialType } from '@nestjs/swagger';
import { CreateAdminReviewDto } from './create-admin-review.dto';

export class UpdateAdminReviewDto extends PartialType(CreateAdminReviewDto) {}
