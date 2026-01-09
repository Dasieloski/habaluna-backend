import { IsString, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ValidateOfferDto {
  @ApiProperty({
    example: 'DESCUENTO10',
    description: 'Código del cupón/offer a validar',
  })
  @IsString()
  code: string;

  @ApiProperty({
    example: 100.5,
    description: 'Subtotal de la compra para validar compra mínima y calcular descuento',
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  subtotal: number;
}
