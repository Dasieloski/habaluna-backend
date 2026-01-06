import { IsOptional, IsInt, Min, Max, IsString } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class PaginationDto {
  @IsOptional()
  @Transform(({ value }) => {
    const num = parseInt(value, 10);
    return isNaN(num) ? 1 : num;
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => {
    const num = parseInt(value, 10);
    return isNaN(num) ? 10 : num;
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}

