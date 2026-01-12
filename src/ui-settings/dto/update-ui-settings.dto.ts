import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';

export class BenefitItemDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateUiSettingsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  headerAnnouncement?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  headerHighlights?: string[];

  @ApiPropertyOptional({ type: [BenefitItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BenefitItemDto)
  benefits?: BenefitItemDto[];

  @ApiPropertyOptional({ type: [String], description: 'IDs de categorías a mostrar en el menú principal (ordenadas)' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  headerNavCategories?: string[];
}
