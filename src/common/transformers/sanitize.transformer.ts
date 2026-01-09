import { Transform } from 'class-transformer';

/**
 * Sanitiza strings eliminando HTML tags y caracteres peligrosos
 * Previene XSS y inyección de código
 */
export function SanitizeString() {
  return Transform(({ value }) => {
    if (typeof value === 'string') {
      // Eliminar tags HTML
      let sanitized = value.replace(/<[^>]*>/g, '');
      // Eliminar caracteres de control y scripts
      sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
      // Eliminar javascript: y data: URLs
      sanitized = sanitized.replace(/javascript:/gi, '');
      sanitized = sanitized.replace(/data:/gi, '');
      // Trim espacios extra
      sanitized = sanitized.trim();
      return sanitized;
    }
    return value;
  });
}

/**
 * Sanitiza emails eliminando caracteres peligrosos
 */
export function SanitizeEmail() {
  return Transform(({ value }) => {
    if (typeof value === 'string') {
      // Solo permitir caracteres válidos para email
      return value.toLowerCase().trim().replace(/[^a-z0-9@._-]/gi, '');
    }
    return value;
  });
}
