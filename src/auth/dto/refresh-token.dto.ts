import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({
    required: false,
    description: 'Opcional: si no se envía, se toma desde cookie HttpOnly.',
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
