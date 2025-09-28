import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getPrismaClient } from '../utils/database';
import { RedisService } from '../utils/redis';
import { config } from '../config';
import { logger } from '../utils/logger';
import { EmailService } from './email-service';
import { 
  User, 
  Session, 
  AuthResponse, 
  LoginRequest, 
  SignupRequest,
  UserRole,
  SubscriptionPlan 
} from '@worldbest/shared-types';

export class AuthService {
  private prisma = getPrismaClient();
  private redis = new RedisService();
  private emailService = new EmailService();

  async signup(data: SignupRequest): Promise<AuthResponse> {
    const { email, password, display_name, username } = data;

    // Check if user already exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email },
          ...(username ? [{ username }] : []),
        ],
      },
    });

    if (existingUser) {
      throw new Error('User with this email or username already exists');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, config.security.bcryptRounds);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email,
        display_name,
        username,
        password_hash: passwordHash,
        plan: SubscriptionPlan.STORY_STARTER,
        roles: [UserRole.USER],
        email_verified: false,
        two_factor_enabled: false,
      },
    });

    // Create session
    const session = await this.createSession(user.id);

    // Generate tokens
    const tokens = this.generateTokens(user, session);

    // Send verification email
    await this.emailService.sendVerificationEmail(user.email, tokens.verificationToken);

    return {
      user: this.sanitizeUser(user),
      session,
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expires_in: 15 * 60, // 15 minutes
    };
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    const { email, password, two_factor_code } = data;

    // Check rate limiting
    await this.checkRateLimit(email);

    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.password_hash) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      await this.recordFailedLogin(email);
      throw new Error('Invalid credentials');
    }

    // Check if 2FA is enabled
    if (user.two_factor_enabled) {
      if (!two_factor_code) {
        throw new Error('Two-factor authentication required');
      }

      const isValid2FA = await this.verify2FACode(user.id, two_factor_code);
      if (!isValid2FA) {
        throw new Error('Invalid two-factor authentication code');
      }
    }

    // Create session
    const session = await this.createSession(user.id);

    // Generate tokens
    const tokens = this.generateTokens(user, session);

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { last_login: new Date() },
    });

    // Clear failed login attempts
    await this.clearFailedLogins(email);

    return {
      user: this.sanitizeUser(user),
      session,
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expires_in: 15 * 60, // 15 minutes
    };
  }

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    try {
      const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as any;
      
      // Find session
      const session = await this.prisma.session.findUnique({
        where: { id: decoded.sessionId },
        include: { user: true },
      });

      if (!session || session.expires_at < new Date()) {
        throw new Error('Invalid refresh token');
      }

      // Generate new tokens
      const tokens = this.generateTokens(session.user, session);

      return {
        user: this.sanitizeUser(session.user),
        session,
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        expires_in: 15 * 60, // 15 minutes
      };
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  async logout(userId: string): Promise<void> {
    // Invalidate all sessions for user
    await this.prisma.session.deleteMany({
      where: { user_id: userId },
    });

    // Clear from Redis
    await this.redis.del(`user:${userId}:sessions`);
  }

  async getUserById(userId: string): Promise<{ user: User; session: Session }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const session = await this.prisma.session.findFirst({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });

    if (!session) {
      throw new Error('No active session found');
    }

    return {
      user: this.sanitizeUser(user),
      session,
    };
  }

  async updateUser(userId: string, updateData: Partial<User>): Promise<User> {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    return this.sanitizeUser(user);
  }

  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if user exists
      return;
    }

    const resetToken = uuidv4();
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour

    // Store reset token in Redis
    await this.redis.set(
      `password_reset:${resetToken}`,
      user.id,
      3600 // 1 hour
    );

    // Send reset email
    await this.emailService.sendPasswordResetEmail(email, resetToken);
  }

  async confirmPasswordReset(token: string, newPassword: string): Promise<void> {
    const userId = await this.redis.get(`password_reset:${token}`);
    
    if (!userId) {
      throw new Error('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, config.security.bcryptRounds);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password_hash: passwordHash },
    });

    // Invalidate all sessions
    await this.prisma.session.deleteMany({
      where: { user_id: userId },
    });

    // Clear reset token
    await this.redis.del(`password_reset:${token}`);
  }

  async verifyEmail(token: string): Promise<void> {
    const userId = await this.redis.get(`email_verification:${token}`);
    
    if (!userId) {
      throw new Error('Invalid or expired verification token');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { 
        email_verified: true,
        email_verified_at: new Date(),
      },
    });

    // Clear verification token
    await this.redis.del(`email_verification:${token}`);
  }

  async resendVerificationEmail(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.email_verified) {
      throw new Error('Email already verified');
    }

    const verificationToken = uuidv4();
    
    // Store verification token
    await this.redis.set(
      `email_verification:${verificationToken}`,
      userId,
      3600 // 1 hour
    );

    await this.emailService.sendVerificationEmail(user.email, verificationToken);
  }

  async setup2FA(userId: string): Promise<{ secret: string; qrCode: string; backupCodes: string[] }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    if (user.two_factor_enabled) {
      throw new Error('2FA already enabled');
    }

    // Generate secret and QR code
    const secret = this.generate2FASecret();
    const qrCode = await this.generate2FAQRCode(user.email, secret);
    
    // Generate backup codes
    const backupCodes = this.generateBackupCodes();

    // Store secret temporarily
    await this.redis.set(
      `2fa_setup:${userId}`,
      JSON.stringify({ secret, backupCodes }),
      600 // 10 minutes
    );

    return { secret, qrCode, backupCodes };
  }

  async verify2FASetup(userId: string, token: string): Promise<void> {
    const setupData = await this.redis.get(`2fa_setup:${userId}`);
    
    if (!setupData) {
      throw new Error('2FA setup session expired');
    }

    const { secret, backupCodes } = JSON.parse(setupData);
    
    // Verify token
    const isValid = this.verify2FAToken(secret, token);
    if (!isValid) {
      throw new Error('Invalid 2FA token');
    }

    // Enable 2FA
    await this.prisma.user.update({
      where: { id: userId },
      data: { 
        two_factor_enabled: true,
        two_factor_secret: secret,
      },
    });

    // Store backup codes
    await this.redis.set(
      `2fa_backup:${userId}`,
      JSON.stringify(backupCodes),
      86400 * 30 // 30 days
    );

    // Clear setup data
    await this.redis.del(`2fa_setup:${userId}`);
  }

  async disable2FA(userId: string, password: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.password_hash) {
      throw new Error('User not found');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Invalid password');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { 
        two_factor_enabled: false,
        two_factor_secret: null,
      },
    });

    // Clear backup codes
    await this.redis.del(`2fa_backup:${userId}`);
  }

  async getOAuthProviders(): Promise<Array<{ id: string; name: string; enabled: boolean }>> {
    return [
      { id: 'google', name: 'Google', enabled: !!config.oauth.google.clientId },
      { id: 'github', name: 'GitHub', enabled: !!config.oauth.github.clientId },
    ];
  }

  async handleOAuthCallback(provider: string, code: string, state?: string): Promise<AuthResponse> {
    // This would integrate with OAuth providers
    // For now, return a placeholder
    throw new Error('OAuth integration not implemented yet');
  }

  private async createSession(userId: string): Promise<Session> {
    const sessionId = uuidv4();
    const token = uuidv4();
    const refreshToken = uuidv4();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    const session = await this.prisma.session.create({
      data: {
        id: sessionId,
        user_id: userId,
        token,
        refresh_token: refreshToken,
        expires_at: expiresAt,
      },
    });

    return session;
  }

  private generateTokens(user: any, session: Session): { accessToken: string; refreshToken: string; verificationToken?: string } {
    const payload = {
      userId: user.id,
      email: user.email,
      sessionId: session.id,
    };

    const accessToken = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });

    const refreshToken = jwt.sign(
      { sessionId: session.id },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiresIn }
    );

    return { accessToken, refreshToken };
  }

  private sanitizeUser(user: any): User {
    const { password_hash, two_factor_secret, ...sanitized } = user;
    return sanitized;
  }

  private async checkRateLimit(email: string): Promise<void> {
    const key = `login_attempts:${email}`;
    const attempts = await this.redis.get(key);
    
    if (attempts && parseInt(attempts) >= config.security.maxLoginAttempts) {
      throw new Error('Too many login attempts. Please try again later.');
    }
  }

  private async recordFailedLogin(email: string): Promise<void> {
    const key = `login_attempts:${email}`;
    const attempts = await this.redis.increment(key);
    
    if (attempts === 1) {
      await this.redis.expire(key, config.security.lockoutDuration / 1000);
    }
  }

  private async clearFailedLogins(email: string): Promise<void> {
    const key = `login_attempts:${email}`;
    await this.redis.del(key);
  }

  private generate2FASecret(): string {
    // This would use speakeasy library
    return 'placeholder-secret';
  }

  private async generate2FAQRCode(email: string, secret: string): Promise<string> {
    // This would use qrcode library
    return 'placeholder-qr-code';
  }

  private generateBackupCodes(): string[] {
    return Array.from({ length: 10 }, () => Math.random().toString(36).substr(2, 8).toUpperCase());
  }

  private verify2FAToken(secret: string, token: string): boolean {
    // This would use speakeasy library
    return true; // Placeholder
  }

  private async verify2FACode(userId: string, code: string): Promise<boolean> {
    // This would verify 2FA code using speakeasy
    return true; // Placeholder
  }
}