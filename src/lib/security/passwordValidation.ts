/**
 * Password Validation Utilities
 * Comprehensive password strength checking and validation
 */

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  preventCommonPasswords: boolean;
}

export interface PasswordStrength {
  score: number; // 0-5
  strength: 'very-weak' | 'weak' | 'fair' | 'good' | 'strong' | 'very-strong';
  feedback: string[];
  isValid: boolean;
}

// Common passwords list (top 100 most common)
const COMMON_PASSWORDS = [
  '123456', 'password', '12345678', 'qwerty', '123456789', '12345', '1234', '111111',
  '1234567', 'dragon', '123123', 'baseball', 'iloveyou', 'trustno1', '1234567890',
  'sunshine', 'master', '123123123', '666666', 'photoshop', '1111111', '2000',
  'superman', 'princess', 'qwerty123', 'admin', 'passw0rd', 'welcome', 'monkey',
  'login', 'starwars', 'password1', 'hello', 'freedom', 'whatever', 'qazwsx'
];

/**
 * Default password policy
 */
export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  preventCommonPasswords: true,
};

/**
 * Validate password against policy
 */
export function validatePassword(
  password: string,
  policy: PasswordPolicy = DEFAULT_PASSWORD_POLICY
): PasswordStrength {
  const feedback: string[] = [];
  let score = 0;

  // Check minimum length
  if (password.length < policy.minLength) {
    feedback.push(`La contraseña debe tener al menos ${policy.minLength} caracteres`);
  } else {
    score++;
    if (password.length >= 12) score++;
    if (password.length >= 16) score++;
  }

  // Check uppercase
  const hasUppercase = /[A-Z]/.test(password);
  if (policy.requireUppercase && !hasUppercase) {
    feedback.push('Debe incluir al menos una letra mayúscula');
  } else if (hasUppercase) {
    score++;
  }

  // Check lowercase
  const hasLowercase = /[a-z]/.test(password);
  if (policy.requireLowercase && !hasLowercase) {
    feedback.push('Debe incluir al menos una letra minúscula');
  } else if (hasLowercase) {
    score++;
  }

  // Check numbers
  const hasNumbers = /[0-9]/.test(password);
  if (policy.requireNumbers && !hasNumbers) {
    feedback.push('Debe incluir al menos un número');
  } else if (hasNumbers) {
    score++;
  }

  // Check special characters
  const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  if (policy.requireSpecialChars && !hasSpecialChars) {
    feedback.push('Debe incluir al menos un carácter especial (!@#$%^&* etc.)');
  } else if (hasSpecialChars) {
    score++;
  }

  // Check for common passwords
  if (policy.preventCommonPasswords) {
    const lowerPassword = password.toLowerCase();
    if (COMMON_PASSWORDS.some(common => lowerPassword.includes(common))) {
      feedback.push('Esta contraseña es muy común y fácil de adivinar');
      score = Math.max(0, score - 2);
    }
  }

  // Check for sequential characters
  if (/(.)\1{2,}/.test(password)) {
    feedback.push('Evita usar caracteres repetidos consecutivos');
    score = Math.max(0, score - 1);
  }

  // Check for sequential numbers
  if (/(?:012|123|234|345|456|567|678|789|890|987|876|765|654|543|432|321|210)/.test(password)) {
    feedback.push('Evita usar secuencias numéricas');
    score = Math.max(0, score - 1);
  }

  // Determine strength level
  let strength: PasswordStrength['strength'];
  if (score <= 1) strength = 'very-weak';
  else if (score === 2) strength = 'weak';
  else if (score === 3) strength = 'fair';
  else if (score === 4) strength = 'good';
  else if (score === 5) strength = 'strong';
  else strength = 'very-strong';

  // Determine if password is valid
  const isValid = feedback.length === 0 && score >= 3;

  return {
    score,
    strength,
    feedback,
    isValid,
  };
}

/**
 * Get password strength color
 */
export function getPasswordStrengthColor(strength: PasswordStrength['strength']): string {
  switch (strength) {
    case 'very-weak':
      return 'text-red-600 bg-red-50 border-red-200';
    case 'weak':
      return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'fair':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'good':
      return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'strong':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'very-strong':
      return 'text-green-700 bg-green-100 border-green-300';
    default:
      return 'text-slate-600 bg-slate-50 border-slate-200';
  }
}

/**
 * Get password strength label
 */
export function getPasswordStrengthLabel(strength: PasswordStrength['strength']): string {
  switch (strength) {
    case 'very-weak':
      return 'Muy débil';
    case 'weak':
      return 'Débil';
    case 'fair':
      return 'Aceptable';
    case 'good':
      return 'Buena';
    case 'strong':
      return 'Fuerte';
    case 'very-strong':
      return 'Muy fuerte';
    default:
      return 'Desconocida';
  }
}

/**
 * Get password strength progress percentage
 */
export function getPasswordStrengthProgress(score: number): number {
  return Math.min(100, (score / 6) * 100);
}

/**
 * Generate a strong random password
 */
export function generateStrongPassword(length: number = 16): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  const allChars = uppercase + lowercase + numbers + special;

  let password = '';

  // Ensure at least one of each required type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];

  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle the password
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
}
