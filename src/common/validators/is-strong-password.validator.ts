import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

/**
 * Interfaz para los requisitos de contraseña
 */
export interface PasswordRequirements {
  minLength?: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumbers?: boolean;
  requireSymbols?: boolean;
}

/**
 * Valida la fortaleza de una contraseña
 */
export function IsStrongPassword(
  options?: PasswordRequirements,
  validationOptions?: ValidationOptions,
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isStrongPassword',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [options || {}],
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'string') {
            return false;
          }

          const requirements: PasswordRequirements = args.constraints[0] || {};
          const {
            minLength = 8,
            requireUppercase = true,
            requireLowercase = true,
            requireNumbers = true,
            requireSymbols = true,
          } = requirements;

          // Verificar longitud mínima
          if (value.length < minLength) {
            return false;
          }

          // Verificar mayúsculas
          if (requireUppercase && !/[A-Z]/.test(value)) {
            return false;
          }

          // Verificar minúsculas
          if (requireLowercase && !/[a-z]/.test(value)) {
            return false;
          }

          // Verificar números
          if (requireNumbers && !/\d/.test(value)) {
            return false;
          }

          // Verificar símbolos
          if (requireSymbols && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value)) {
            return false;
          }

          return true;
        },
        defaultMessage(args: ValidationArguments) {
          const requirements: PasswordRequirements = args.constraints[0] || {};
          const {
            minLength = 8,
            requireUppercase = true,
            requireLowercase = true,
            requireNumbers = true,
            requireSymbols = true,
          } = requirements;

          const missing: string[] = [];
          const value = args.value as string;

          if (typeof value !== 'string' || value.length < minLength) {
            return `La contraseña debe tener al menos ${minLength} caracteres`;
          }

          if (requireUppercase && !/[A-Z]/.test(value)) {
            missing.push('una mayúscula');
          }

          if (requireLowercase && !/[a-z]/.test(value)) {
            missing.push('una minúscula');
          }

          if (requireNumbers && !/\d/.test(value)) {
            missing.push('un número');
          }

          if (requireSymbols && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value)) {
            missing.push('un símbolo');
          }

          if (missing.length > 0) {
            const missingList = missing.join(', ');
            return `La contraseña debe incluir ${missingList}`;
          }

          return 'La contraseña no cumple con los requisitos de seguridad';
        },
      },
    });
  };
}
