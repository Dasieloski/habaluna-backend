import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsStrongPassword } from '../validators/is-strong-password.validator';

/**
 * DTO para validación de contraseñas con requisitos de seguridad estrictos
 */
export class PasswordValidationDto {
  @ApiProperty({
    description: 'Contraseña con requisitos de seguridad: mínimo 8 caracteres, 1 mayúscula, 1 minúscula, 1 número, 1 símbolo',
    example: 'Password123!',
    minLength: 8,
  })
  @IsString()
  @MinLength(8, {
    message: 'La contraseña debe tener al menos 8 caracteres',
  })
  @IsStrongPassword(
    {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSymbols: true,
    },
    {
      message: 'La contraseña debe tener mínimo 8 caracteres e incluir al menos una mayúscula, una minúscula, un número y un símbolo',
    },
  )
  password: string;
}
