import { PasswordStrength, type PasswordStrengthResult } from '../types/auth';

/**
 * Calculate password strength based on various criteria
 * Returns strength level and helpful feedback
 */
export function calculatePasswordStrength(password: string): PasswordStrengthResult {
  const feedback: string[] = [];
  let score = 0;

  // Length check
  if (password.length >= 8) {
    score += 1;
  } else {
    feedback.push('Use at least 8 characters');
  }

  if (password.length >= 12) {
    score += 1;
  }

  // Uppercase check
  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Include uppercase letters');
  }

  // Lowercase check
  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Include lowercase letters');
  }

  // Number check
  if (/\d/.test(password)) {
    score += 1;
  } else {
    feedback.push('Include numbers');
  }

  // Special character check
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Include special characters (!@#$%...)');
  }

  // Determine strength based on score
  let strength: PasswordStrength;
  if (score <= 2) {
    strength = PasswordStrength.WEAK;
  } else if (score <= 4) {
    strength = PasswordStrength.FAIR;
  } else if (score === 5) {
    strength = PasswordStrength.GOOD;
  } else {
    strength = PasswordStrength.STRONG;
  }

  return {
    strength,
    score,
    feedback,
  };
}
