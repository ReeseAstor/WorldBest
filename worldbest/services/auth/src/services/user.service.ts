import { PrismaClient, User, Prisma } from '@worldbest/database';
import { logger } from '../utils/logger';

export class UserService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async findById(id: string): Promise<User | null> {
    try {
      return await this.prisma.user.findUnique({
        where: { id },
      });
    } catch (error) {
      logger.error('Error finding user by ID:', error);
      throw error;
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      return await this.prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });
    } catch (error) {
      logger.error('Error finding user by email:', error);
      throw error;
    }
  }

  async findByVerificationToken(token: string): Promise<User | null> {
    try {
      return await this.prisma.user.findFirst({
        where: { emailVerificationToken: token },
      });
    } catch (error) {
      logger.error('Error finding user by verification token:', error);
      throw error;
    }
  }

  async findByResetToken(token: string): Promise<User | null> {
    try {
      return await this.prisma.user.findFirst({
        where: { resetToken: token },
      });
    } catch (error) {
      logger.error('Error finding user by reset token:', error);
      throw error;
    }
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    try {
      const user = await this.prisma.user.create({
        data: {
          ...data,
          email: data.email.toLowerCase(),
        },
      });
      return user;
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  async update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    try {
      const user = await this.prisma.user.update({
        where: { id },
        data,
      });
      return user;
    } catch (error) {
      logger.error('Error updating user:', error);
      throw error;
    }
  }

  async updateLastLogin(id: string): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id },
        data: { lastLoginAt: new Date() },
      });
    } catch (error) {
      logger.error('Error updating last login:', error);
      throw error;
    }
  }

  async setResetToken(id: string, token: string, expiry: Date): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id },
        data: {
          resetToken: token,
          resetTokenExpiry: expiry,
        },
      });
    } catch (error) {
      logger.error('Error setting reset token:', error);
      throw error;
    }
  }

  async clearResetToken(id: string): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id },
        data: {
          resetToken: null,
          resetTokenExpiry: null,
        },
      });
    } catch (error) {
      logger.error('Error clearing reset token:', error);
      throw error;
    }
  }

  async updatePassword(id: string, hashedPassword: string): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id },
        data: { password: hashedPassword },
      });
    } catch (error) {
      logger.error('Error updating password:', error);
      throw error;
    }
  }

  async verifyEmail(id: string): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id },
        data: {
          isEmailVerified: true,
          emailVerificationToken: null,
          emailVerifiedAt: new Date(),
        },
      });
    } catch (error) {
      logger.error('Error verifying email:', error);
      throw error;
    }
  }

  async updateVerificationToken(id: string, token: string): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id },
        data: { emailVerificationToken: token },
      });
    } catch (error) {
      logger.error('Error updating verification token:', error);
      throw error;
    }
  }

  async setTwoFactorSecret(id: string, secret: string): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id },
        data: { twoFactorSecret: secret },
      });
    } catch (error) {
      logger.error('Error setting 2FA secret:', error);
      throw error;
    }
  }

  async enableTwoFactor(id: string): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id },
        data: { twoFactorEnabled: true },
      });
    } catch (error) {
      logger.error('Error enabling 2FA:', error);
      throw error;
    }
  }

  async disableTwoFactor(id: string): Promise<void> {
    try {
      await this.prisma.user.update({
        where: { id },
        data: {
          twoFactorEnabled: false,
          twoFactorSecret: null,
        },
      });
    } catch (error) {
      logger.error('Error disabling 2FA:', error);
      throw error;
    }
  }

  sanitizeUser(user: User): Partial<User> {
    const { password, twoFactorSecret, resetToken, resetTokenExpiry, emailVerificationToken, ...sanitized } = user;
    return sanitized;
  }
}