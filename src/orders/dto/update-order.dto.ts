import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateOrderDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  paymentIntentId?: string;
}
