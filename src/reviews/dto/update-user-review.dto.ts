import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateUserReviewDto {
  @ApiProperty({ required: false, minimum: 1, maximum: 5, description: 'Rating del producto (1-5 estrellas)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @ApiProperty({ required: false, description: 'Título del review (opcional)' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ required: false, description: 'Comentario del review' })
  @IsOptional()
  @IsString()
  comment?: string;
}
