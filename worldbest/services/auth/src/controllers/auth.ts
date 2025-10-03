import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { prisma } from '@worldbest/database';
import { User } from '@worldbest/shared-types';
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
        const speakeasy = require('speakeasy');
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
      const userData: Partial<User> = {
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
}

export const authController = new AuthController();