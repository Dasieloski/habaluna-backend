import { IsEmail, IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsStrongPassword } from '../../common/validators/is-strong-password.validator';
import { SanitizeEmail, SanitizeString } from '../../common/transformers/sanitize.transformer';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @SanitizeEmail()
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'Password123!',
    description: 'Contraseña con requisitos de seguridad: mínimo 8 caracteres, 1 mayúscula, 1 minúscula, 1 número, 1 símbolo',
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
      message: 'La contraseña debe tener mínimo 8 caracteres e incluir al menos una mayúscula, una minúscula, un número y un símbolo',
    },
  )
  password: string;

  @ApiProperty({ example: 'John', required: false })
  @IsOptional()
  @SanitizeString()
  @IsString()
  firstName?: string;

  @ApiProperty({ example: 'Doe', required: false })
  @IsOptional()
  @SanitizeString()
  @IsString()
  lastName?: string;
}
