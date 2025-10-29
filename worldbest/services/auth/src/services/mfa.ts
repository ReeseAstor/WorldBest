import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import { prisma } from '@worldbest/database';
import { redisService } from './redis';
import { smsService } from './sms';
import { emailService } from './email';
import { logger } from '../utils/logger';
import { config } from '../config';
import crypto from 'crypto';

export interface TOTPSetupResult {
  secret: string;
  qrCodeUrl: string;
  manualEntryKey: string;
  backupCodes: string[];
}

export interface MFAVerificationResult {
  success: boolean;
  type: 'totp' | 'sms' | 'email' | 'backup';
  remainingBackupCodes?: number;
}

export class MFAService {
  /**
   * Generate TOTP secret and QR code for user
   */
  async setupTOTP(userId: string, userEmail: string, displayName: string): Promise<TOTPSetupResult> {
    try {
      // Generate secret
      const secret = speakeasy.generateSecret({
        name: `${config.mfa.issuer} (${userEmail})`,
        issuer: config.mfa.issuer,
        length: 32,
      });

      // Generate QR code
      const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url!);

      // Generate backup codes
      const backupCodes = this.generateBackupCodes();

      // Store in database (not enabled yet)
      await prisma.user.update({
        where: { id: userId },
        data: {
          twoFactorSecret: secret.base32,
          backupCodes: backupCodes.map(code => this.hashBackupCode(code)),
        },
      });

      logger.info('TOTP setup initiated', { userId, email: userEmail });

      return {
        secret: secret.base32!,
        qrCodeUrl,
        manualEntryKey: secret.base32!,
        backupCodes,
      };
    } catch (error) {
      logger.error('TOTP setup error:', error);
      throw new Error('Failed to setup TOTP');
    }
  }

  /**
   * Verify TOTP token and enable 2FA
   */
  async verifyAndEnableTOTP(userId: string, token: string): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { twoFactorSecret: true, twoFactorEnabled: true },
      });

      if (!user || !user.twoFactorSecret) {
        throw new Error('TOTP not set up');
      }

      if (user.twoFactorEnabled) {
        throw new Error('2FA already enabled');
      }

      // Verify token
      const isValid = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token,
        window: config.mfa.totp.window,
      });

      if (!isValid) {
        return false;
      }

      // Enable 2FA
      await prisma.user.update({
        where: { id: userId },
        data: { 
          twoFactorEnabled: true,
          twoFactorEnabledAt: new Date(),
        },
      });

      logger.info('TOTP enabled for user', { userId });
      return true;
    } catch (error) {
      logger.error('TOTP verification error:', error);
      throw error;
    }
  }

  /**
   * Verify TOTP token for login
   */
  async verifyTOTP(userId: string, token: string): Promise<MFAVerificationResult> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { twoFactorSecret: true, twoFactorEnabled: true },
      });

      if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
        throw new Error('2FA not enabled');
      }

      const isValid = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token,
        window: config.mfa.totp.window,
      });

      return {
        success: isValid,
        type: 'totp',
      };
    } catch (error) {
      logger.error('TOTP verification error:', error);
      return { success: false, type: 'totp' };
    }
  }

  /**
   * Disable TOTP 2FA
   */
  async disableTOTP(userId: string, password: string): Promise<boolean> {
    try {
      // Verify password first (implement password verification)
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { passwordHash: true },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Verify password (you'll need to import passwordService)
      // const isValidPassword = await passwordService.verifyPassword(password, user.passwordHash);
      // if (!isValidPassword) {
      //   throw new Error('Invalid password');
      // }

      // Disable 2FA
      await prisma.user.update({
        where: { id: userId },
        data: {
          twoFactorEnabled: false,
          twoFactorSecret: null,
          backupCodes: [],
          twoFactorEnabledAt: null,
        },
      });

      logger.info('TOTP disabled for user', { userId });
      return true;
    } catch (error) {
      logger.error('TOTP disable error:', error);
      throw error;
    }
  }

  /**
   * Send SMS verification code
   */
  async sendSMSCode(userId: string, phoneNumber: string): Promise<void> {
    try {
      // Generate 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store in Redis with 5-minute expiry
      const key = `sms_code:${userId}`;
      await redisService.set(key, code, 300); // 5 minutes

      // Send SMS
      await smsService.sendVerificationCode(phoneNumber, code);

      logger.info('SMS verification code sent', { userId, phoneNumber: this.maskPhoneNumber(phoneNumber) });
    } catch (error) {
      logger.error('SMS code send error:', error);
      throw new Error('Failed to send SMS code');
    }
  }

  /**
   * Verify SMS code
   */
  async verifySMSCode(userId: string, code: string): Promise<MFAVerificationResult> {
    try {
      const key = `sms_code:${userId}`;
      const storedCode = await redisService.get(key);

      if (!storedCode || storedCode !== code) {
        return { success: false, type: 'sms' };
      }

      // Delete used code
      await redisService.del(key);

      return { success: true, type: 'sms' };
    } catch (error) {
      logger.error('SMS code verification error:', error);
      return { success: false, type: 'sms' };
    }
  }

  /**
   * Send email verification code
   */
  async sendEmailCode(userId: string, email: string): Promise<void> {
    try {
      // Generate 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store in Redis with 10-minute expiry
      const key = `email_code:${userId}`;
      await redisService.set(key, code, 600); // 10 minutes

      // Send email
      await emailService.sendMFACode(email, code);

      logger.info('Email verification code sent', { userId, email });
    } catch (error) {
      logger.error('Email code send error:', error);
      throw new Error('Failed to send email code');
    }
  }

  /**
   * Verify email code
   */
  async verifyEmailCode(userId: string, code: string): Promise<MFAVerificationResult> {
    try {
      const key = `email_code:${userId}`;
      const storedCode = await redisService.get(key);

      if (!storedCode || storedCode !== code) {
        return { success: false, type: 'email' };
      }

      // Delete used code
      await redisService.del(key);

      return { success: true, type: 'email' };
    } catch (error) {
      logger.error('Email code verification error:', error);
      return { success: false, type: 'email' };
    }
  }

  /**
   * Verify backup code
   */
  async verifyBackupCode(userId: string, code: string): Promise<MFAVerificationResult> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { backupCodes: true },
      });

      if (!user || !user.backupCodes) {
        return { success: false, type: 'backup' };
      }

      const hashedCode = this.hashBackupCode(code);
      const codeIndex = user.backupCodes.indexOf(hashedCode);

      if (codeIndex === -1) {
        return { success: false, type: 'backup' };
      }

      // Remove used backup code
      const updatedCodes = user.backupCodes.filter((_, index) => index !== codeIndex);
      
      await prisma.user.update({
        where: { id: userId },
        data: { backupCodes: updatedCodes },
      });

      logger.info('Backup code used', { userId, remainingCodes: updatedCodes.length });

      return {
        success: true,
        type: 'backup',
        remainingBackupCodes: updatedCodes.length,
      };
    } catch (error) {
      logger.error('Backup code verification error:', error);
      return { success: false, type: 'backup' };
    }
  }

  /**
   * Generate new backup codes
   */
  async generateNewBackupCodes(userId: string): Promise<string[]> {
    try {
      const backupCodes = this.generateBackupCodes();
      
      await prisma.user.update({
        where: { id: userId },
        data: {
          backupCodes: backupCodes.map(code => this.hashBackupCode(code)),
        },
      });

      logger.info('New backup codes generated', { userId });
      return backupCodes;
    } catch (error) {
      logger.error('Backup code generation error:', error);
      throw new Error('Failed to generate backup codes');
    }
  }

  /**
   * Get MFA status for user
   */
  async getMFAStatus(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          twoFactorEnabled: true,
          twoFactorEnabledAt: true,
          backupCodes: true,
          phoneNumber: true,
          emailVerified: true,
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      return {
        totpEnabled: user.twoFactorEnabled,
        totpEnabledAt: user.twoFactorEnabledAt,
        backupCodesCount: user.backupCodes?.length || 0,
        smsAvailable: !!user.phoneNumber,
        emailAvailable: user.emailVerified,
      };
    } catch (error) {
      logger.error('Get MFA status error:', error);
      throw error;
    }
  }

  /**
   * Generate backup codes
   */
  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < config.mfa.backupCodes.count; i++) {
      // Generate 8-character alphanumeric code
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }

  /**
   * Hash backup code for storage
   */
  private hashBackupCode(code: string): string {
    return crypto.createHash('sha256').update(code + config.mfa.backupCodes.salt).digest('hex');
  }

  /**
   * Mask phone number for logging
   */
  private maskPhoneNumber(phoneNumber: string): string {
    return phoneNumber.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
  }
}

export const mfaService = new MFAService();