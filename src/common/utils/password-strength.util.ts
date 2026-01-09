/**
 * Calcula el score de fortaleza de una contraseña (0-4)
 * @param password - La contraseña a evaluar
 * @returns Score de 0 a 4, donde 4 es la más fuerte
 */
export function validatePasswordStrength(password: string): {
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  // Verificar longitud mínima
  if (password.length >= 8) {
    score += 1;
  } else {
    feedback.push('Debe tener al menos 8 caracteres');
  }

  // Verificar mayúsculas
  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Falta una letra mayúscula');
  }

  // Verificar minúsculas
  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Falta una letra minúscula');
  }

  // Verificar números
  if (/\d/.test(password)) {
    score += 1;
  } else {
    feedback.push('Falta un número');
  }

  // Verificar símbolos
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Falta un símbolo especial');
  }

  // Bonus por longitud adicional
  if (password.length >= 12) {
    score = Math.min(score + 1, 5); // Máximo 5 puntos
  }

  return {
    score: Math.min(score, 4), // Normalizar a máximo 4
    feedback: feedback.length > 0 ? feedback : [],
  };
}

/**
 * Obtiene una descripción del nivel de fortaleza
 */
export function getPasswordStrengthLabel(score: number): {
  label: string;
  color: string;
} {
  if (score === 0) {
    return { label: 'Muy débil', color: 'red' };
  }
  if (score === 1) {
    return { label: 'Débil', color: 'orange' };
  }
  if (score === 2) {
    return { label: 'Media', color: 'yellow' };
  }
  if (score === 3) {
    return { label: 'Fuerte', color: 'green' };
  }
  return { label: 'Muy fuerte', color: 'emerald' };
}
