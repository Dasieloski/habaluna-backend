import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class CreateAdminReviewDto {
  @ApiProperty()
  @IsUUID()
  productId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiProperty()
  @IsString()
  authorName: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  authorEmail?: string;

  @ApiProperty({ minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty()
  @IsString()
  content: string;

  @ApiProperty({ default: false, required: false })
  @IsOptional()
  @IsBoolean()
  isApproved?: boolean;
}

