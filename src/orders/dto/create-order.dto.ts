import { IsObject, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrderDto {
  @ApiProperty()
  @IsObject()
  shippingAddress: {
    firstName: string;
    lastName: string;
    address: string;
    city: string;
    zipCode: string;
    country: string;
    phone?: string;
  };

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  billingAddress?: {
    firstName: string;
    lastName: string;
    address: string;
    city: string;
    zipCode: string;
    country: string;
    phone?: string;
  };

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  paymentIntentId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}

