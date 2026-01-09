import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SanitizeEmail } from '../../common/transformers/sanitize.transformer';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @SanitizeEmail()
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(6)
  password: string;
}
