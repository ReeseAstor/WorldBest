import bcrypt from 'bcryptjs';
import { config } from '../config';
import { logger } from '../utils/logger';

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

class PasswordService {
  private readonly saltRounds = 12;

  /**
   * Hash a password
   */
  async hashPassword(password: string): Promise<string> {
    try {
      const salt = await bcrypt.genSalt(this.saltRounds);
      const hash = await bcrypt.hash(password, salt);
      return hash;
    } catch (error) {
      logger.error('Failed to hash password:', error);
      throw new Error('Password hashing failed');
    }
  }

  /**
   * Verify a password against its hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      logger.error('Failed to verify password:', error);
      return false;
    }
  }

  /**
   * Validate password against policy
   */
  validatePassword(password: string): PasswordValidationResult {
    const errors: string[] = [];
    
    // Check minimum length
    if (password.length < config.password.minLength) {
      errors.push(`Password must be at least ${config.password.minLength} characters long`);
    }

    // Check for uppercase letters
    if (config.password.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    // Check for lowercase letters
    if (config.password.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    // Check for numbers
    if (config.password.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    // Check for special characters
    if (config.password.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    // Check for common patterns
    if (this.isCommonPassword(password)) {
      errors.push('Password is too common, please choose a stronger password');
    }

    // Check for sequential characters
    if (this.hasSequentialCharacters(password)) {
      errors.push('Password should not contain sequential characters');
    }

    // Check for repeated characters
    if (this.hasRepeatedCharacters(password)) {
      errors.push('Password should not contain too many repeated characters');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Generate a secure random password
   */
  generateSecurePassword(length: number = 16): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    let charset = lowercase;
    let password = '';

    // Ensure at least one character from each required category
    if (config.password.requireUppercase) {
      charset += uppercase;
      password += uppercase[Math.floor(Math.random() * uppercase.length)];
    }

    if (config.password.requireNumbers) {
      charset += numbers;
      password += numbers[Math.floor(Math.random() * numbers.length)];
    }

    if (config.password.requireSpecialChars) {
      charset += symbols;
      password += symbols[Math.floor(Math.random() * symbols.length)];
    }

    // Fill the rest of the password
    for (let i = password.length; i < length; i++) {
      password += charset[Math.floor(Math.random() * charset.length)];
    }

    // Shuffle the password to avoid predictable patterns
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Check if password is commonly used
   */
  private isCommonPassword(password: string): boolean {
    const commonPasswords = [
      'password', '123456', '123456789', 'qwerty', 'abc123', 'password123',
      'admin', 'letmein', 'welcome', 'monkey', '1234567890', 'dragon',
      'master', 'shadow', 'superman', 'michael', 'football', 'baseball',
      'liverpool', 'jordan', 'harley', 'robert', 'matthew', 'daniel',
      'andrew', 'joshua', 'anthony', 'william', 'david', 'richard',
    ];

    const lowerPassword = password.toLowerCase();
    return commonPasswords.some(common => lowerPassword.includes(common));
  }

  /**
   * Check for sequential characters (abc, 123, etc.)
   */
  private hasSequentialCharacters(password: string): boolean {
    const sequences = [
      'abcdefghijklmnopqrstuvwxyz',
      '0123456789',
      'qwertyuiop',
      'asdfghjkl',
      'zxcvbnm',
    ];

    for (const sequence of sequences) {
      for (let i = 0; i <= sequence.length - 3; i++) {
        const subseq = sequence.substring(i, i + 3);
        if (password.toLowerCase().includes(subseq)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check for repeated characters
   */
  private hasRepeatedCharacters(password: string): boolean {
    // Check for more than 2 consecutive identical characters
    const repeatedPattern = /(.)\1{2,}/;
    return repeatedPattern.test(password);
  }

  /**
   * Calculate password strength score (0-100)
   */
  calculatePasswordStrength(password: string): number {
    let score = 0;
    
    // Length bonus
    score += Math.min(password.length * 4, 40);
    
    // Character variety bonus
    if (/[a-z]/.test(password)) score += 5;
    if (/[A-Z]/.test(password)) score += 5;
    if (/\d/.test(password)) score += 5;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 10;
    
    // Uniqueness bonus
    const uniqueChars = new Set(password.split('')).size;
    score += (uniqueChars / password.length) * 20;
    
    // Penalties
    if (this.isCommonPassword(password)) score -= 30;
    if (this.hasSequentialCharacters(password)) score -= 20;
    if (this.hasRepeatedCharacters(password)) score -= 15;
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get password strength label
   */
  getPasswordStrengthLabel(score: number): string {
    if (score >= 80) return 'Very Strong';
    if (score >= 60) return 'Strong';
    if (score >= 40) return 'Medium';
    if (score >= 20) return 'Weak';
    return 'Very Weak';
  }

  /**
   * Check if password needs to be changed based on age
   */
  isPasswordExpired(passwordChangedAt: Date): boolean {
    const now = new Date();
    const passwordAge = now.getTime() - passwordChangedAt.getTime();
    return passwordAge > config.password.maxAge;
  }

  /**
   * Generate a password reset token
   */
  generateResetToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 32; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }
}

export const passwordService = new PasswordService();