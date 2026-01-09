import { ApiProperty } from '@nestjs/swagger';

export class LowStockAlertDto {
  @ApiProperty({ description: 'ID del producto' })
  id: string;

  @ApiProperty({ description: 'Nombre del producto' })
  name: string;

  @ApiProperty({ description: 'Stock actual' })
  stock: number;

  @ApiProperty({ description: 'Stock mínimo configurado (opcional)' })
  minStock?: number;

  @ApiProperty({ description: 'Tiene variantes' })
  hasVariants: boolean;

  @ApiProperty({ description: 'Variantes con stock bajo (si aplica)' })
  lowStockVariants?: Array<{
    id: string;
    name: string;
    stock: number;
  }>;
}
