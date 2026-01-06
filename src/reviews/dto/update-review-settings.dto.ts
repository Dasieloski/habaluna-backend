import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateReviewSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoApproveReviews?: boolean;
}

