import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import { prisma } from '@worldbest/database';
import { jwtService } from '../services/jwt';
import { passwordService } from '../services/password';
import { redisService } from '../services/redis';
import { emailService } from '../services/email';
import { logger, logAuth, logSecurity } from '../utils/logger';
import { config } from '../config';

export class AuthController {
  /**
   * User registration
   */
  async register(req: Request, res: Response, next: NextFunction) {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const { email, password, displayName } = req.body;

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (existingUser) {
        logSecurity('Registration attempt with existing email', { email, ip: req.ip });
        return res.status(409).json({
          error: 'User already exists',
          message: 'An account with this email address already exists.',
        });
      }

      // Validate password
      const passwordValidation = passwordService.validatePassword(password);
      if (!passwordValidation.isValid) {
        return res.status(400).json({
          error: 'Password validation failed',
          details: passwordValidation.errors,
        });
      }

      // Hash password
      const passwordHash = await passwordService.hashPassword(password);

      // Create user
      const user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          displayName,
          passwordHash,
          emailVerified: !config.features.emailVerification,
        },
        select: {
          id: true,
          email: true,
          displayName: true,
          emailVerified: true,
          plan: true,
          createdAt: true,
        },
      });

      // Send verification email if enabled
      if (config.features.emailVerification) {
        const verificationToken = jwtService.generateEmailVerificationToken();
        await redisService.setEmailVerificationToken(verificationToken, user.id);
        await emailService.sendVerificationEmail(user.email, user.displayName, verificationToken);
      }

      // Generate tokens
      const tokens = await jwtService.generateTokenPair(user.id, user.email);

      // Set HTTP-only cookie for refresh token
      res.cookie('refresh_token', tokens.refreshToken, {
        httpOnly: true,
        secure: config.env === 'production',
        sameSite: 'strict',
        maxAge: tokens.refreshTokenExpiry,
      });

      logAuth('User registered', user.id, { email: user.email, ip: req.ip });

      res.status(201).json({
        message: 'User registered successfully',
        user,
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.accessTokenExpiry,
        emailVerificationRequired: config.features.emailVerification && !user.emailVerified,
      });
    } catch (error) {
      logger.error('Registration error:', error);
      next(error);
    }
  }

  /**
   * User login
   */
  async login(req: Request, res: Response, next: NextFunction) {
    try {
      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const { email, password, rememberMe = false } = req.body;
      const userEmail = email.toLowerCase();

      // Check rate limiting
      const rateLimitKey = `login_attempts:${req.ip}:${userEmail}`;
      const attempts = await redisService.incrementRateLimit(
        rateLimitKey,
        config.rateLimiting.loginAttempts.windowMs
      );

      if (attempts > config.rateLimiting.loginAttempts.max) {
        logSecurity('Rate limit exceeded for login', { email: userEmail, ip: req.ip, attempts });
        return res.status(429).json({
          error: 'Too many login attempts',
          message: 'Please try again later.',
        });
      }

      // Check account lockout
      const lockoutInfo = await redisService.getAccountLockout(userEmail);
      if (lockoutInfo?.lockedUntil && lockoutInfo.lockedUntil > Date.now()) {
        logSecurity('Login attempt on locked account', { email: userEmail, ip: req.ip });
        return res.status(423).json({
          error: 'Account locked',
          message: 'Account is temporarily locked due to multiple failed login attempts.',
        });
      }

      // Find user
      const user = await prisma.user.findUnique({
        where: { email: userEmail },
        select: {
          id: true,
          email: true,
          displayName: true,
          passwordHash: true,
          emailVerified: true,
          twoFactorEnabled: true,
          twoFactorSecret: true,
          plan: true,
          deletedAt: true,
        },
      });

      if (!user || user.deletedAt) {
        // Increment failed attempts
        await this.handleFailedLogin(userEmail, req.ip);
        return res.status(401).json({
          error: 'Invalid credentials',
          message: 'Email or password is incorrect.',
        });
      }

      // Verify password
      const isValidPassword = await passwordService.verifyPassword(password, user.passwordHash!);
      if (!isValidPassword) {
        await this.handleFailedLogin(userEmail, req.ip);
        logSecurity('Failed login attempt', { email: userEmail, ip: req.ip });
        return res.status(401).json({
          error: 'Invalid credentials',
          message: 'Email or password is incorrect.',
        });
      }

      // Check email verification
      if (config.features.emailVerification && !user.emailVerified) {
        return res.status(403).json({
          error: 'Email not verified',
          message: 'Please verify your email address before logging in.',
          needsEmailVerification: true,
        });
      }

      // Handle 2FA if enabled
      if (user.twoFactorEnabled) {
        const { token: twoFactorToken } = req.body;
        if (!twoFactorToken) {
          return res.status(200).json({
            message: 'Two-factor authentication required',
            requires2FA: true,
            userId: user.id, // Temporary, for 2FA verification
          });
        }

        // Verify 2FA token
        const isValid2FA = speakeasy.totp.verify({
          secret: user.twoFactorSecret,
          encoding: 'base32',
          token: twoFactorToken,
          window: 2,
        });

        if (!isValid2FA) {
          await this.handleFailedLogin(userEmail, req.ip);
          return res.status(401).json({
            error: 'Invalid 2FA token',
            message: 'The two-factor authentication token is invalid.',
          });
        }
      }

      // Clear failed attempts
      await redisService.clearAccountLockout(userEmail);

      // Generate tokens
      const tokens = await jwtService.generateTokenPair(user.id, user.email);

      // Set refresh token cookie
      const cookieMaxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : undefined; // 30 days if remember me
      res.cookie('refresh_token', tokens.refreshToken, {
        httpOnly: true,
        secure: config.env === 'production',
        sameSite: 'strict',
        maxAge: cookieMaxAge || tokens.refreshTokenExpiry,
      });

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLogin: new Date() },
      });

      logAuth('User logged in', user.id, { email: user.email, ip: req.ip });

      // Return user data without sensitive fields
      const userData = {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        emailVerified: user.emailVerified,
        plan: user.plan,
      };

      res.json({
        message: 'Login successful',
        user: userData,
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.accessTokenExpiry,
      });
    } catch (error) {
      logger.error('Login error:', error);
      next(error);
    }
  }

  /**
   * Refresh access token
   */
  async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies.refresh_token || req.body.refreshToken;

      if (!refreshToken) {
        return res.status(401).json({
          error: 'Refresh token required',
          message: 'No refresh token provided.',
        });
      }

      // Verify and refresh token
      const result = await jwtService.refreshAccessToken(refreshToken);

      res.json({
        message: 'Token refreshed successfully',
        token: result.accessToken,
        expiresAt: result.accessTokenExpiry,
      });
    } catch (error) {
      logger.error('Token refresh error:', error);
      res.status(401).json({
        error: 'Invalid refresh token',
        message: 'The refresh token is invalid or expired.',
      });
    }
  }

  /**
   * User logout
   */
  async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies.refresh_token;
      const accessToken = jwtService.extractTokenFromHeader(req.headers.authorization);

      // Revoke refresh token
      if (refreshToken) {
        try {
          const payload = await jwtService.verifyRefreshToken(refreshToken);
          await jwtService.revokeRefreshToken(payload.tokenId);
        } catch (error) {
          // Token might already be invalid, continue with logout
        }
      }

      // Blacklist access token
      if (accessToken) {
        try {
          const payload = jwtService.decodeToken(accessToken);
          if (payload?.exp) {
            await jwtService.blacklistAccessToken(payload.tokenId, payload.exp * 1000);
          }
        } catch (error) {
          // Token might be invalid, continue with logout
        }
      }

      // Clear refresh token cookie
      res.clearCookie('refresh_token');

      logAuth('User logged out', req.user?.id, { ip: req.ip });

      res.json({
        message: 'Logout successful',
      });
    } catch (error) {
      logger.error('Logout error:', error);
      next(error);
    }
  }

  /**
   * Get current user profile
   */
  async me(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          displayName: true,
          avatarUrl: true,
          emailVerified: true,
          twoFactorEnabled: true,
          plan: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        return res.status(404).json({
          error: 'User not found',
        });
      }

      res.json(user);
    } catch (error) {
      logger.error('Get user profile error:', error);
      next(error);
    }
  }

  /**
   * Handle failed login attempts
   */
  private async handleFailedLogin(email: string, ip: string) {
    const lockoutInfo = await redisService.getAccountLockout(email);
    const attempts = (lockoutInfo?.attempts || 0) + 1;

    if (attempts >= config.accountLockout.maxAttempts) {
      const lockoutTime = Date.now() + config.accountLockout.lockoutDuration;
      await redisService.setAccountLockout(email, attempts, lockoutTime);
      logSecurity('Account locked due to failed attempts', { email, ip, attempts });
    } else {
      await redisService.setAccountLockout(email, attempts);
    }
  }

  /**
   * Request password reset
   */
  async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      if (!config.features.passwordReset) {
        return res.status(403).json({ error: 'Feature disabled' });
      }

      const { email } = req.body as { email?: string };
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        select: { id: true, email: true, displayName: true, deletedAt: true },
      });

      // Respond generically even if user not found
      if (!user || user.deletedAt) {
        return res.json({ message: 'If an account exists, an email was sent' });
      }

      const token = jwtService.generatePasswordResetToken();
      await redisService.setPasswordResetToken(token, user.id, 60 * 60);
      await emailService.sendPasswordResetEmail(user.email, user.displayName || user.email, token);

      res.json({ message: 'If an account exists, an email was sent' });
    } catch (error) {
      logger.error('Forgot password error:', error);
      next(error);
    }
  }

  /**
   * Reset password
   */
  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      if (!config.features.passwordReset) {
        return res.status(403).json({ error: 'Feature disabled' });
      }

      const { token, password } = req.body as { token?: string; password?: string };
      if (!token || !password) {
        return res.status(400).json({ error: 'Token and password are required' });
      }

      // Validate password
      const validation = passwordService.validatePassword(password);
      if (!validation.isValid) {
        return res.status(400).json({ error: 'Password validation failed', details: validation.errors });
      }

      const userId = await redisService.getPasswordResetToken(token);
      if (!userId) {
        return res.status(400).json({ error: 'Invalid or expired token' });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, deletedAt: true },
      });
      if (!user || user.deletedAt) {
        return res.status(404).json({ error: 'User not found' });
      }

      const passwordHash = await passwordService.hashPassword(password);
      await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
      await redisService.deletePasswordResetToken(token);

      res.json({ message: 'Password reset successfully' });
    } catch (error) {
      logger.error('Reset password error:', error);
      next(error);
    }
  }

  /**
   * Verify email
   */
  async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      if (!config.features.emailVerification) {
        return res.status(403).json({ error: 'Feature disabled' });
      }
      const { token } = req.body as { token?: string };
      if (!token) {
        return res.status(400).json({ error: 'Token is required' });
      }

      const userId = await redisService.getEmailVerificationToken(token);
      if (!userId) {
        return res.status(400).json({ error: 'Invalid or expired token' });
      }

      await prisma.user.update({ where: { id: userId }, data: { emailVerified: true } });
      await redisService.deleteEmailVerificationToken(token);

      res.json({ message: 'Email verified successfully' });
    } catch (error) {
      logger.error('Verify email error:', error);
      next(error);
    }
  }

  /**
   * Resend verification email
   */
  async resendVerification(req: Request, res: Response, next: NextFunction) {
    try {
      if (!config.features.emailVerification) {
        return res.status(403).json({ error: 'Feature disabled' });
      }

      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, displayName: true, emailVerified: true },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (user.emailVerified) {
        return res.status(400).json({ error: 'Email already verified' });
      }

      const token = jwtService.generateEmailVerificationToken();
      await redisService.setEmailVerificationToken(token, user.id, 24 * 60 * 60);
      await emailService.sendVerificationEmail(user.email, user.displayName || user.email, token);

      res.json({ message: 'Verification email sent' });
    } catch (error) {
      logger.error('Resend verification error:', error);
      next(error);
    }
  }

  /**
   * Change password
   */
  async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current and new passwords are required' });
      }

      const validation = passwordService.validatePassword(newPassword);
      if (!validation.isValid) {
        return res.status(400).json({ error: 'Password validation failed', details: validation.errors });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, passwordHash: true },
      });
      if (!user || !user.passwordHash) {
        return res.status(404).json({ error: 'User not found' });
      }

      const isValid = await passwordService.verifyPassword(currentPassword, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid current password' });
      }

      const passwordHash = await passwordService.hashPassword(newPassword);
      await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      logger.error('Change password error:', error);
      next(error);
    }
  }

  /**
   * Update profile
   */
  async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const allowed: Record<string, any> = {};
      const { displayName, avatarUrl } = req.body as { displayName?: string; avatarUrl?: string };
      if (typeof displayName === 'string') (allowed as any).displayName = displayName.trim();
      if (typeof avatarUrl === 'string') (allowed as any).avatarUrl = avatarUrl.trim();

      if (Object.keys(allowed).length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      const updated = await prisma.user.update({
        where: { id: userId },
        data: allowed as any,
        select: {
          id: true,
          email: true,
          displayName: true,
          avatarUrl: true,
          emailVerified: true,
          twoFactorEnabled: true,
          plan: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      res.json(updated);
    } catch (error) {
      logger.error('Update profile error:', error);
      next(error);
    }
  }

  /**
   * Delete account (soft delete)
   */
  async deleteAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      await prisma.user.update({ where: { id: userId }, data: { deletedAt: new Date() } });
      res.json({ message: 'Account deleted' });
    } catch (error) {
      logger.error('Delete account error:', error);
      next(error);
    }
  }

  /**
   * Enable 2FA (returns QR code and secret)
   */
  async enable2FA(req: Request, res: Response, next: NextFunction) {
    try {
      if (!config.features.twoFactorAuth) {
        return res.status(403).json({ error: 'Feature disabled' });
      }
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const secret = speakeasy.generateSecret({
        name: `${config.twoFactor.issuer} (${userId})`,
        issuer: config.twoFactor.issuer,
      });

      await prisma.user.update({ where: { id: userId }, data: { twoFactorSecret: secret.base32, twoFactorEnabled: false } });

      const otpauthUrl: string = secret.otpauth_url;
      const qrCode: string = await qrcode.toDataURL(otpauthUrl);

      res.json({ qrCode, secret: secret.base32 });
    } catch (error) {
      logger.error('Enable 2FA error:', error);
      next(error);
    }
  }

  /**
   * Verify 2FA token and enable
   */
  async verify2FA(req: Request, res: Response, next: NextFunction) {
    try {
      if (!config.features.twoFactorAuth) {
        return res.status(403).json({ error: 'Feature disabled' });
      }
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { token } = req.body as { token?: string };
      if (!token) {
        return res.status(400).json({ error: 'Token is required' });
      }

      const user = await prisma.user.findUnique({ where: { id: userId }, select: { twoFactorSecret: true } });
      if (!user?.twoFactorSecret) {
        return res.status(400).json({ error: '2FA not initialized' });
      }

      const valid = speakeasy.totp.verify({ secret: user.twoFactorSecret, encoding: 'base32', token, window: 2 });
      if (!valid) {
        return res.status(400).json({ error: 'Invalid 2FA token' });
      }

      await prisma.user.update({ where: { id: userId }, data: { twoFactorEnabled: true } });
      res.json({ message: '2FA enabled' });
    } catch (error) {
      logger.error('Verify 2FA error:', error);
      next(error);
    }
  }

  /**
   * Disable 2FA
   */
  async disable2FA(req: Request, res: Response, next: NextFunction) {
    try {
      if (!config.features.twoFactorAuth) {
        return res.status(403).json({ error: 'Feature disabled' });
      }
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const { token } = req.body as { token?: string };
      if (!token) {
        return res.status(400).json({ error: 'Token is required' });
      }

      const user = await prisma.user.findUnique({ where: { id: userId }, select: { twoFactorSecret: true } });
      if (!user?.twoFactorSecret) {
        return res.status(400).json({ error: '2FA not enabled' });
      }

      const valid = speakeasy.totp.verify({ secret: user.twoFactorSecret, encoding: 'base32', token, window: 2 });
      if (!valid) {
        return res.status(400).json({ error: 'Invalid 2FA token' });
      }

      await prisma.user.update({ where: { id: userId }, data: { twoFactorEnabled: false, twoFactorSecret: null } as any });
      res.json({ message: '2FA disabled' });
    } catch (error) {
      logger.error('Disable 2FA error:', error);
      next(error);
    }
  }
}

export const authController = new AuthController();