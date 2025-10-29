import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { mfaService } from '../services/mfa';
import { passwordService } from '../services/password';
import { logger, logSecurity } from '../utils/logger';
import { prisma } from '@worldbest/database';

export class MFAController {
  /**
   * Setup TOTP for user
   */
  async setupTOTP(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const userId = req.user!.id;
      const userEmail = req.user!.email;
      const { displayName } = req.body;

      // Check if 2FA is already enabled
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { twoFactorEnabled: true, displayName: true },
      });

      if (user?.twoFactorEnabled) {
        return res.status(409).json({
          error: 'Two-factor authentication already enabled',
          message: 'You must disable 2FA before setting up a new authenticator.',
        });
      }

      const result = await mfaService.setupTOTP(
        userId, 
        userEmail, 
        displayName || user?.displayName || 'User'
      );

      logSecurity('TOTP setup initiated', { userId, email: userEmail, ip: req.ip });

      res.json({
        message: 'TOTP setup initiated',
        secret: result.secret,
        qrCode: result.qrCodeUrl,
        manualEntryKey: result.manualEntryKey,
        backupCodes: result.backupCodes,
        instructions: {
          step1: 'Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.)',
          step2: 'Or manually enter the secret key into your app',
          step3: 'Enter the 6-digit code from your app to verify and enable 2FA',
          step4: 'Save your backup codes in a secure location',
        },
      });
    } catch (error) {
      logger.error('TOTP setup error:', error);
      next(error);
    }
  }

  /**
   * Verify TOTP token and enable 2FA
   */
  async verifyAndEnableTOTP(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const userId = req.user!.id;
      const { token } = req.body;

      const isValid = await mfaService.verifyAndEnableTOTP(userId, token);

      if (!isValid) {
        logSecurity('Invalid TOTP verification attempt', { userId, ip: req.ip });
        return res.status(400).json({
          error: 'Invalid verification code',
          message: 'The verification code is incorrect. Please try again.',
        });
      }

      logSecurity('TOTP enabled successfully', { userId, ip: req.ip });

      res.json({
        message: 'Two-factor authentication enabled successfully',
        enabled: true,
      });
    } catch (error) {
      logger.error('TOTP verification error:', error);
      if (error instanceof Error) {
        if (error.message === 'TOTP not set up') {
          return res.status(400).json({
            error: 'TOTP not set up',
            message: 'You must set up TOTP before enabling it.',
          });
        }
        if (error.message === '2FA already enabled') {
          return res.status(409).json({
            error: '2FA already enabled',
            message: 'Two-factor authentication is already enabled.',
          });
        }
      }
      next(error);
    }
  }

  /**
   * Disable TOTP
   */
  async disableTOTP(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const userId = req.user!.id;
      const { password, confirmationCode } = req.body;

      // Verify password
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { passwordHash: true, twoFactorEnabled: true },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (!user.twoFactorEnabled) {
        return res.status(400).json({
          error: '2FA not enabled',
          message: 'Two-factor authentication is not currently enabled.',
        });
      }

      const isValidPassword = await passwordService.verifyPassword(password, user.passwordHash!);
      if (!isValidPassword) {
        logSecurity('Invalid password in 2FA disable attempt', { userId, ip: req.ip });
        return res.status(401).json({
          error: 'Invalid password',
          message: 'The password is incorrect.',
        });
      }

      // If confirmation code provided, verify it
      if (confirmationCode) {
        const verification = await mfaService.verifyTOTP(userId, confirmationCode);
        if (!verification.success) {
          return res.status(400).json({
            error: 'Invalid confirmation code',
            message: 'The confirmation code is incorrect.',
          });
        }
      }

      await mfaService.disableTOTP(userId, password);

      logSecurity('TOTP disabled', { userId, ip: req.ip });

      res.json({
        message: 'Two-factor authentication disabled successfully',
        enabled: false,
      });
    } catch (error) {
      logger.error('TOTP disable error:', error);
      next(error);
    }
  }

  /**
   * Verify TOTP token for login
   */
  async verifyTOTPLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const { token, userId } = req.body;

      const result = await mfaService.verifyTOTP(userId, token);

      res.json({
        success: result.success,
        type: result.type,
      });
    } catch (error) {
      logger.error('TOTP login verification error:', error);
      res.status(500).json({
        success: false,
        error: 'Verification failed',
      });
    }
  }

  /**
   * Send SMS verification code
   */
  async sendSMSCode(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const userId = req.user!.id;
      const { phoneNumber } = req.body;

      await mfaService.sendSMSCode(userId, phoneNumber);

      res.json({
        message: 'SMS verification code sent',
        phoneNumber: phoneNumber.replace(/(\+\d{1,3})\d{6,10}(\d{4})/, '$1******$2'),
      });
    } catch (error) {
      logger.error('SMS send error:', error);
      next(error);
    }
  }

  /**
   * Verify SMS code
   */
  async verifySMSCode(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const userId = req.user!.id;
      const { code } = req.body;

      const result = await mfaService.verifySMSCode(userId, code);

      res.json({
        success: result.success,
        type: result.type,
      });
    } catch (error) {
      logger.error('SMS verification error:', error);
      next(error);
    }
  }

  /**
   * Send email verification code
   */
  async sendEmailCode(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const userEmail = req.user!.email;

      await mfaService.sendEmailCode(userId, userEmail);

      res.json({
        message: 'Email verification code sent',
        email: userEmail.replace(/(.{2}).*(@.*)/, '$1***$2'),
      });
    } catch (error) {
      logger.error('Email send error:', error);
      next(error);
    }
  }

  /**
   * Verify email code
   */
  async verifyEmailCode(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const userId = req.user!.id;
      const { code } = req.body;

      const result = await mfaService.verifyEmailCode(userId, code);

      res.json({
        success: result.success,
        type: result.type,
      });
    } catch (error) {
      logger.error('Email verification error:', error);
      next(error);
    }
  }

  /**
   * Verify backup code
   */
  async verifyBackupCode(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const userId = req.user!.id;
      const { code } = req.body;

      const result = await mfaService.verifyBackupCode(userId, code.toUpperCase());

      if (result.success) {
        logSecurity('Backup code used', { 
          userId, 
          remainingCodes: result.remainingBackupCodes,
          ip: req.ip 
        });
      }

      res.json({
        success: result.success,
        type: result.type,
        remainingBackupCodes: result.remainingBackupCodes,
        warning: result.remainingBackupCodes !== undefined && result.remainingBackupCodes <= 2
          ? 'You have few backup codes remaining. Consider generating new ones.'
          : undefined,
      });
    } catch (error) {
      logger.error('Backup code verification error:', error);
      next(error);
    }
  }

  /**
   * Generate new backup codes
   */
  async generateBackupCodes(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const userId = req.user!.id;
      const { password } = req.body;

      // Verify password
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { passwordHash: true },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const isValidPassword = await passwordService.verifyPassword(password, user.passwordHash!);
      if (!isValidPassword) {
        logSecurity('Invalid password in backup code generation', { userId, ip: req.ip });
        return res.status(401).json({
          error: 'Invalid password',
          message: 'The password is incorrect.',
        });
      }

      const backupCodes = await mfaService.generateNewBackupCodes(userId);

      logSecurity('New backup codes generated', { userId, ip: req.ip });

      res.json({
        message: 'New backup codes generated',
        backupCodes,
        warning: 'Store these codes in a secure location. They will not be shown again.',
      });
    } catch (error) {
      logger.error('Backup code generation error:', error);
      next(error);
    }
  }

  /**
   * Get MFA status
   */
  async getMFAStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const status = await mfaService.getMFAStatus(userId);

      res.json(status);
    } catch (error) {
      logger.error('Get MFA status error:', error);
      next(error);
    }
  }

  /**
   * Get available MFA methods
   */
  async getAvailableMethods(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const status = await mfaService.getMFAStatus(userId);

      const methods = {
        totp: {
          available: true,
          enabled: status.totpEnabled,
          name: 'Authenticator App',
          description: 'Use an authenticator app like Google Authenticator or Authy',
        },
        sms: {
          available: status.smsAvailable,
          enabled: false, // SMS is always per-request, not permanently enabled
          name: 'SMS',
          description: 'Receive verification codes via text message',
        },
        email: {
          available: status.emailAvailable,
          enabled: false, // Email is always per-request, not permanently enabled
          name: 'Email',
          description: 'Receive verification codes via email',
        },
        backup: {
          available: status.backupCodesCount > 0,
          enabled: status.backupCodesCount > 0,
          name: 'Backup Codes',
          description: 'Use backup codes when other methods are unavailable',
          remainingCodes: status.backupCodesCount,
        },
      };

      res.json({
        methods,
        primaryMethodEnabled: status.totpEnabled,
        recommendedSetup: !status.totpEnabled ? ['totp'] : [],
      });
    } catch (error) {
      logger.error('Get available methods error:', error);
      next(error);
    }
  }
}

export const mfaController = new MFAController();