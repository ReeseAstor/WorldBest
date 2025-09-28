import nodemailer from 'nodemailer';
import { config } from '../config';
import { logger } from '../utils/logger';

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransporter({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: config.email.auth,
    });
  }

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const verificationUrl = `${config.frontend.verifyEmailUrl}?token=${token}`;
    
    const mailOptions = {
      from: config.email.from,
      to: email,
      subject: 'Verify your WorldBest account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #0ea5e9;">Welcome to WorldBest!</h1>
          <p>Thank you for signing up. Please verify your email address by clicking the button below:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Verify Email Address
            </a>
          </div>
          <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
          <p>This link will expire in 1 hour.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 14px;">
            If you didn't create an account with WorldBest, you can safely ignore this email.
          </p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      logger.info(`Verification email sent to ${email}`);
    } catch (error) {
      logger.error('Failed to send verification email:', error);
      throw new Error('Failed to send verification email');
    }
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetUrl = `${config.frontend.resetPasswordUrl}?token=${token}`;
    
    const mailOptions = {
      from: config.email.from,
      to: email,
      subject: 'Reset your WorldBest password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #0ea5e9;">Password Reset Request</h1>
          <p>You requested to reset your password. Click the button below to create a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #666;">${resetUrl}</p>
          <p>This link will expire in 1 hour.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 14px;">
            If you didn't request a password reset, you can safely ignore this email.
          </p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      logger.info(`Password reset email sent to ${email}`);
    } catch (error) {
      logger.error('Failed to send password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }

  async sendWelcomeEmail(email: string, displayName: string): Promise<void> {
    const mailOptions = {
      from: config.email.from,
      to: email,
      subject: 'Welcome to WorldBest!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #0ea5e9;">Welcome to WorldBest, ${displayName}!</h1>
          <p>We're excited to have you join our community of writers. Here's what you can do next:</p>
          <ul>
            <li>Create your first project</li>
            <li>Set up your story bible</li>
            <li>Explore our AI writing assistants</li>
            <li>Join our community forum</li>
          </ul>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${config.frontend.baseUrl}/dashboard" 
               style="background-color: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Get Started
            </a>
          </div>
          <p>If you have any questions, feel free to reach out to our support team.</p>
          <p>Happy writing!</p>
          <p>The WorldBest Team</p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      logger.info(`Welcome email sent to ${email}`);
    } catch (error) {
      logger.error('Failed to send welcome email:', error);
      // Don't throw error for welcome email
    }
  }
}