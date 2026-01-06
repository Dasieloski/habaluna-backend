import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export enum OfferTypeDto {
  PERCENTAGE = 'PERCENTAGE',
  FIXED = 'FIXED',
}

export class CreateOfferDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ description: 'Unique promo code' })
  @IsString()
  code: string;

  @ApiProperty({ enum: OfferTypeDto })
  @IsEnum(OfferTypeDto)
  type: OfferTypeDto;

  @ApiProperty({ description: 'Percentage (0-100) or fixed amount', example: 20 })
  @IsNumber()
  value: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  minPurchase?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimit?: number;

  @ApiProperty({ required: false, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  usageCount?: number;

  @ApiProperty()
  @IsDateString()
  startDate: string;

  @ApiProperty()
  @IsDateString()
  endDate: string;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

