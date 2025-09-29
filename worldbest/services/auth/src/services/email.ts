import nodemailer from 'nodemailer';
import { config } from '../config';
import { logger } from '../utils/logger';

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private async initializeTransporter() {
    try {
      this.transporter = nodemailer.createTransporter({
        host: config.email.smtp.host,
        port: config.email.smtp.port,
        secure: config.email.smtp.secure,
        auth: config.email.smtp.auth.user ? {
          user: config.email.smtp.auth.user,
          pass: config.email.smtp.auth.pass,
        } : undefined,
      });

      // Verify connection
      if (config.email.smtp.auth.user) {
        await this.transporter.verify();
        logger.info('Email transporter initialized successfully');
      }
    } catch (error) {
      logger.error('Failed to initialize email transporter:', error);
      this.transporter = null;
    }
  }

  async sendVerificationEmail(email: string, displayName: string, token: string): Promise<void> {
    if (!this.transporter) {
      logger.warn('Email transporter not available, skipping verification email');
      return;
    }

    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}`;

    const mailOptions = {
      from: config.email.from,
      to: email,
      subject: 'Verify your WorldBest account',
      html: this.getVerificationEmailTemplate(displayName, verificationUrl),
    };

    try {
      await this.transporter.sendMail(mailOptions);
      logger.info('Verification email sent', { email });
    } catch (error) {
      logger.error('Failed to send verification email:', error);
      throw new Error('Failed to send verification email');
    }
  }

  async sendPasswordResetEmail(email: string, displayName: string, token: string): Promise<void> {
    if (!this.transporter) {
      logger.warn('Email transporter not available, skipping password reset email');
      return;
    }

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

    const mailOptions = {
      from: config.email.from,
      to: email,
      subject: 'Reset your WorldBest password',
      html: this.getPasswordResetEmailTemplate(displayName, resetUrl),
    };

    try {
      await this.transporter.sendMail(mailOptions);
      logger.info('Password reset email sent', { email });
    } catch (error) {
      logger.error('Failed to send password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }

  private getVerificationEmailTemplate(displayName: string, verificationUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Verify your WorldBest account</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb;">Welcome to WorldBest!</h1>
          <p>Hi ${displayName},</p>
          <p>Thank you for signing up for WorldBest! To complete your registration, please verify your email address by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email Address</a>
          </div>
          <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
          <p>This link will expire in 24 hours for security reasons.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 14px;">
            If you didn't create a WorldBest account, you can safely ignore this email.
          </p>
          <p style="color: #666; font-size: 14px;">
            Best regards,<br>
            The WorldBest Team
          </p>
        </div>
      </body>
      </html>
    `;
  }

  private getPasswordResetEmailTemplate(displayName: string, resetUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Reset your WorldBest password</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb;">Password Reset Request</h1>
          <p>Hi ${displayName},</p>
          <p>We received a request to reset your WorldBest account password. Click the button below to create a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
          </div>
          <p>If the button doesn't work, you can also copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${resetUrl}</p>
          <p>This link will expire in 1 hour for security reasons.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 14px;">
            If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.
          </p>
          <p style="color: #666; font-size: 14px;">
            Best regards,<br>
            The WorldBest Team
          </p>
        </div>
      </body>
      </html>
    `;
  }
}

export const emailService = new EmailService();