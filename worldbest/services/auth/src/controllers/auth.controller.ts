import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';
import { TokenService } from '../services/token.service';
import { EmailService } from '../services/email.service';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';
import { AuthErrorCode } from '@worldbest/shared-types';

export class AuthController {
  private authService: AuthService;
  private userService: UserService;
  private tokenService: TokenService;
  private emailService: EmailService;

  constructor() {
    this.authService = new AuthService();
    this.userService = new UserService();
    this.tokenService = new TokenService();
    this.emailService = new EmailService();
  }

  signup = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password, displayName } = req.body;

      // Check if user already exists
      const existingUser = await this.userService.findByEmail(email);
      if (existingUser) {
        throw new AppError('User already exists', 409, AuthErrorCode.USER_ALREADY_EXISTS);
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create user
      const user = await this.userService.create({
        email,
        password: hashedPassword,
        displayName,
        isEmailVerified: false,
        emailVerificationToken: uuidv4(),
      });

      // Send verification email
      await this.emailService.sendVerificationEmail(user.email, user.emailVerificationToken!);

      // Generate tokens
      const { accessToken, refreshToken } = await this.tokenService.generateTokenPair(user);

      // Store refresh token
      await this.tokenService.storeRefreshToken(user.id, refreshToken);

      res.status(201).json({
        success: true,
        data: {
          user: this.userService.sanitizeUser(user),
          accessToken,
          refreshToken,
        },
        message: 'User created successfully. Please verify your email.',
      });
    } catch (error) {
      next(error);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await this.userService.findByEmail(email);
      if (!user) {
        throw new AppError('Invalid credentials', 401, AuthErrorCode.INVALID_CREDENTIALS);
      }

      // Check password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new AppError('Invalid credentials', 401, AuthErrorCode.INVALID_CREDENTIALS);
      }

      // Check if 2FA is enabled
      if (user.twoFactorEnabled) {
        // Generate temporary token for 2FA verification
        const tempToken = await this.tokenService.generateTempToken(user.id);
        return res.json({
          success: true,
          requiresTwoFactor: true,
          tempToken,
        });
      }

      // Update last login
      await this.userService.updateLastLogin(user.id);

      // Generate tokens
      const { accessToken, refreshToken } = await this.tokenService.generateTokenPair(user);

      // Store refresh token
      await this.tokenService.storeRefreshToken(user.id, refreshToken);

      res.json({
        success: true,
        data: {
          user: this.userService.sanitizeUser(user),
          accessToken,
          refreshToken,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  refreshToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body;

      // Verify refresh token
      const payload = await this.tokenService.verifyRefreshToken(refreshToken);
      
      // Get user
      const user = await this.userService.findById(payload.userId);
      if (!user) {
        throw new AppError('User not found', 404, AuthErrorCode.USER_NOT_FOUND);
      }

      // Check if refresh token exists in store
      const isValid = await this.tokenService.validateRefreshToken(user.id, refreshToken);
      if (!isValid) {
        throw new AppError('Invalid refresh token', 401, AuthErrorCode.INVALID_TOKEN);
      }

      // Generate new token pair
      const tokens = await this.tokenService.generateTokenPair(user);

      // Revoke old refresh token and store new one
      await this.tokenService.revokeRefreshToken(user.id, refreshToken);
      await this.tokenService.storeRefreshToken(user.id, tokens.refreshToken);

      res.json({
        success: true,
        data: tokens,
      });
    } catch (error) {
      next(error);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const authHeader = req.headers.authorization;
      const token = authHeader?.split(' ')[1];

      if (token) {
        // Blacklist the access token
        await this.tokenService.blacklistToken(token);
      }

      // Revoke all refresh tokens for the user
      await this.tokenService.revokeAllRefreshTokens(userId);

      res.json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body;

      const user = await this.userService.findByEmail(email);
      if (!user) {
        // Don't reveal if user exists
        return res.json({
          success: true,
          message: 'If the email exists, a password reset link has been sent.',
        });
      }

      // Generate reset token
      const resetToken = uuidv4();
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

      // Save reset token
      await this.userService.setResetToken(user.id, resetToken, resetTokenExpiry);

      // Send reset email
      await this.emailService.sendPasswordResetEmail(user.email, resetToken);

      res.json({
        success: true,
        message: 'If the email exists, a password reset link has been sent.',
      });
    } catch (error) {
      next(error);
    }
  };

  resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token, password } = req.body;

      // Find user by reset token
      const user = await this.userService.findByResetToken(token);
      if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
        throw new AppError('Invalid or expired reset token', 400, AuthErrorCode.INVALID_TOKEN);
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Update password and clear reset token
      await this.userService.updatePassword(user.id, hashedPassword);
      await this.userService.clearResetToken(user.id);

      // Revoke all existing refresh tokens
      await this.tokenService.revokeAllRefreshTokens(user.id);

      res.json({
        success: true,
        message: 'Password reset successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  changePassword = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const { currentPassword, newPassword } = req.body;

      // Get user
      const user = await this.userService.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404, AuthErrorCode.USER_NOT_FOUND);
      }

      // Verify current password
      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        throw new AppError('Current password is incorrect', 400, AuthErrorCode.INVALID_CREDENTIALS);
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 12);

      // Update password
      await this.userService.updatePassword(user.id, hashedPassword);

      // Revoke all refresh tokens except current session
      await this.tokenService.revokeAllRefreshTokens(user.id);

      res.json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { token } = req.params;

      // Find user by verification token
      const user = await this.userService.findByVerificationToken(token);
      if (!user) {
        throw new AppError('Invalid verification token', 400, AuthErrorCode.INVALID_TOKEN);
      }

      // Mark email as verified
      await this.userService.verifyEmail(user.id);

      res.json({
        success: true,
        message: 'Email verified successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  resendVerification = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body;

      const user = await this.userService.findByEmail(email);
      if (!user || user.isEmailVerified) {
        return res.json({
          success: true,
          message: 'If the email exists and is unverified, a new verification link has been sent.',
        });
      }

      // Generate new verification token
      const verificationToken = uuidv4();
      await this.userService.updateVerificationToken(user.id, verificationToken);

      // Send verification email
      await this.emailService.sendVerificationEmail(user.email, verificationToken);

      res.json({
        success: true,
        message: 'If the email exists and is unverified, a new verification link has been sent.',
      });
    } catch (error) {
      next(error);
    }
  };

  getCurrentUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      
      const user = await this.userService.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404, AuthErrorCode.USER_NOT_FOUND);
      }

      res.json({
        success: true,
        data: this.userService.sanitizeUser(user),
      });
    } catch (error) {
      next(error);
    }
  };

  updateProfile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const updates = req.body;

      // Remove sensitive fields from updates
      delete updates.password;
      delete updates.email;
      delete updates.role;
      delete updates.isEmailVerified;

      const user = await this.userService.update(userId, updates);

      res.json({
        success: true,
        data: this.userService.sanitizeUser(user),
      });
    } catch (error) {
      next(error);
    }
  };

  enable2FA = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;

      // Generate secret
      const secret = speakeasy.generateSecret({
        name: `WorldBest (${(req as any).user.email})`,
      });

      // Save secret temporarily
      await this.userService.setTwoFactorSecret(userId, secret.base32);

      // Generate QR code
      const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url!);

      res.json({
        success: true,
        data: {
          secret: secret.base32,
          qrCode: qrCodeUrl,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  verify2FA = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const { token, tempToken } = req.body;

      let actualUserId = userId;

      // If tempToken is provided, this is during login
      if (tempToken) {
        const payload = await this.tokenService.verifyTempToken(tempToken);
        actualUserId = payload.userId;
      }

      const user = await this.userService.findById(actualUserId);
      if (!user || !user.twoFactorSecret) {
        throw new AppError('2FA not set up', 400, AuthErrorCode.TWO_FACTOR_NOT_SETUP);
      }

      // Verify token
      const isValid = speakeasy.totp.verify({
        secret: user.twoFactorSecret,
        encoding: 'base32',
        token,
        window: 2,
      });

      if (!isValid) {
        throw new AppError('Invalid 2FA token', 400, AuthErrorCode.INVALID_TWO_FACTOR_TOKEN);
      }

      // If this is first-time setup, enable 2FA
      if (!user.twoFactorEnabled) {
        await this.userService.enableTwoFactor(actualUserId);
      }

      // If this is during login, generate access tokens
      if (tempToken) {
        const { accessToken, refreshToken } = await this.tokenService.generateTokenPair(user);
        await this.tokenService.storeRefreshToken(user.id, refreshToken);

        return res.json({
          success: true,
          data: {
            user: this.userService.sanitizeUser(user),
            accessToken,
            refreshToken,
          },
        });
      }

      res.json({
        success: true,
        message: '2FA enabled successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  disable2FA = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user.id;
      const { token } = req.body;

      const user = await this.userService.findById(userId);
      if (!user || !user.twoFactorEnabled) {
        throw new AppError('2FA not enabled', 400, AuthErrorCode.TWO_FACTOR_NOT_SETUP);
      }

      // Verify token
      const isValid = speakeasy.totp.verify({
        secret: user.twoFactorSecret!,
        encoding: 'base32',
        token,
        window: 2,
      });

      if (!isValid) {
        throw new AppError('Invalid 2FA token', 400, AuthErrorCode.INVALID_TWO_FACTOR_TOKEN);
      }

      // Disable 2FA
      await this.userService.disableTwoFactor(userId);

      res.json({
        success: true,
        message: '2FA disabled successfully',
      });
    } catch (error) {
      next(error);
    }
  };

  // OAuth handlers
  googleAuth = async (req: Request, res: Response, next: NextFunction) => {
    // Implement Google OAuth
    res.status(501).json({ message: 'Google OAuth not implemented yet' });
  };

  googleCallback = async (req: Request, res: Response, next: NextFunction) => {
    // Implement Google OAuth callback
    res.status(501).json({ message: 'Google OAuth callback not implemented yet' });
  };

  githubAuth = async (req: Request, res: Response, next: NextFunction) => {
    // Implement GitHub OAuth
    res.status(501).json({ message: 'GitHub OAuth not implemented yet' });
  };

  githubCallback = async (req: Request, res: Response, next: NextFunction) => {
    // Implement GitHub OAuth callback
    res.status(501).json({ message: 'GitHub OAuth callback not implemented yet' });
  };
}