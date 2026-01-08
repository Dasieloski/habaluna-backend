import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AddToWishlistDto {
  @ApiProperty()
  @IsUUID()
  productId: string;
}
