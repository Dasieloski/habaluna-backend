import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreatePublicReviewDto {
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
}

