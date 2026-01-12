import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsStrongPassword } from '../../common/validators/is-strong-password.validator';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Token recibido por email' })
  @IsString()
  token: string;

  @ApiProperty({
    description:
      'Nueva contraseña con requisitos de seguridad: mínimo 8 caracteres, 1 mayúscula, 1 minúscula, 1 número, 1 símbolo',
    example: 'Password123!',
  })
  @IsString()
  @IsStrongPassword(
    {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSymbols: true,
    },
    {
      message:
        'La contraseña debe tener mínimo 8 caracteres e incluir al menos una mayúscula, una minúscula, un número y un símbolo',
    },
  )
  newPassword: string;
}
