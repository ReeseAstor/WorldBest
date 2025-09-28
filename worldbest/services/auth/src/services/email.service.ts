import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

export class EmailService {
  private transporter: nodemailer.Transporter;
  private fromEmail: string;
  private appUrl: string;

  constructor() {
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@worldbest.ai';
    this.appUrl = process.env.APP_URL || 'http://localhost:3000';

    // Configure email transporter
    if (process.env.NODE_ENV === 'production') {
      // Production email configuration (e.g., SendGrid, AWS SES)
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    } else {
      // Development: Use Ethereal Email or log to console
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        auth: {
          user: process.env.ETHEREAL_USER || 'test@ethereal.email',
          pass: process.env.ETHEREAL_PASS || 'test',
        },
      });
    }
  }

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    try {
      const verificationUrl = `${this.appUrl}/verify-email/${token}`;
      
      const mailOptions = {
        from: this.fromEmail,
        to: email,
        subject: 'Verify your WorldBest account',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; background-color: #f9f9f9; }
                .button { display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Welcome to WorldBest!</h1>
                </div>
                <div class="content">
                  <h2>Verify Your Email Address</h2>
                  <p>Thank you for signing up for WorldBest. To complete your registration and start your writing journey, please verify your email address.</p>
                  <center>
                    <a href="${verificationUrl}" class="button">Verify Email</a>
                  </center>
                  <p>Or copy and paste this link into your browser:</p>
                  <p style="word-break: break-all;">${verificationUrl}</p>
                  <p>This link will expire in 24 hours.</p>
                  <p>If you didn't create an account with WorldBest, you can safely ignore this email.</p>
                </div>
                <div class="footer">
                  <p>&copy; 2024 WorldBest. All rights reserved.</p>
                  <p>Empowering writers with AI-assisted creativity</p>
                </div>
              </div>
            </body>
          </html>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      logger.info(`Verification email sent to ${email}`);
    } catch (error) {
      logger.error('Error sending verification email:', error);
      throw error;
    }
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    try {
      const resetUrl = `${this.appUrl}/reset-password/${token}`;
      
      const mailOptions = {
        from: this.fromEmail,
        to: email,
        subject: 'Reset your WorldBest password',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; background-color: #f9f9f9; }
                .button { display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                .warning { background-color: #FEF2F2; border: 1px solid #FCA5A5; padding: 10px; border-radius: 5px; margin: 20px 0; }
                .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>WorldBest Password Reset</h1>
                </div>
                <div class="content">
                  <h2>Reset Your Password</h2>
                  <p>We received a request to reset your WorldBest account password. Click the button below to create a new password:</p>
                  <center>
                    <a href="${resetUrl}" class="button">Reset Password</a>
                  </center>
                  <p>Or copy and paste this link into your browser:</p>
                  <p style="word-break: break-all;">${resetUrl}</p>
                  <div class="warning">
                    <p><strong>Security Notice:</strong> This link will expire in 1 hour. If you didn't request a password reset, please ignore this email and your password will remain unchanged.</p>
                  </div>
                  <p>For security reasons, we recommend:</p>
                  <ul>
                    <li>Using a strong, unique password</li>
                    <li>Enabling two-factor authentication</li>
                    <li>Not sharing your password with anyone</li>
                  </ul>
                </div>
                <div class="footer">
                  <p>&copy; 2024 WorldBest. All rights reserved.</p>
                  <p>Need help? Contact support@worldbest.ai</p>
                </div>
              </div>
            </body>
          </html>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      logger.info(`Password reset email sent to ${email}`);
    } catch (error) {
      logger.error('Error sending password reset email:', error);
      throw error;
    }
  }

  async sendWelcomeEmail(email: string, displayName: string): Promise<void> {
    try {
      const mailOptions = {
        from: this.fromEmail,
        to: email,
        subject: 'Welcome to WorldBest - Your Writing Journey Begins!',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; background-color: #f9f9f9; }
                .feature { margin: 15px 0; padding: 15px; background: white; border-radius: 5px; }
                .button { display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Welcome to WorldBest, ${displayName}!</h1>
                </div>
                <div class="content">
                  <h2>Your Writing Journey Starts Here</h2>
                  <p>Congratulations on joining WorldBest! You're now part of a community of writers using AI to enhance their creativity and productivity.</p>
                  
                  <h3>Get Started with These Features:</h3>
                  
                  <div class="feature">
                    <h4>📚 Story Bible</h4>
                    <p>Create comprehensive worlds, characters, and storylines with our intuitive organization tools.</p>
                  </div>
                  
                  <div class="feature">
                    <h4>🤖 AI Writing Assistants</h4>
                    <p>Meet your three AI personas: Muse for inspiration, Editor for refinement, and Coach for guidance.</p>
                  </div>
                  
                  <div class="feature">
                    <h4>✍️ Collaborative Editor</h4>
                    <p>Write with real-time AI suggestions and collaborate with other writers seamlessly.</p>
                  </div>
                  
                  <center>
                    <a href="${this.appUrl}/dashboard" class="button">Go to Dashboard</a>
                  </center>
                  
                  <p>Need help getting started? Check out our <a href="${this.appUrl}/docs">documentation</a> or join our <a href="https://discord.gg/worldbest">Discord community</a>.</p>
                </div>
                <div class="footer">
                  <p>&copy; 2024 WorldBest. All rights reserved.</p>
                  <p>Happy writing! 🚀</p>
                </div>
              </div>
            </body>
          </html>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      logger.info(`Welcome email sent to ${email}`);
    } catch (error) {
      logger.error('Error sending welcome email:', error);
      // Don't throw - welcome email is not critical
    }
  }

  async sendSecurityAlert(email: string, alertType: string, details: any): Promise<void> {
    try {
      const alertMessages: { [key: string]: { subject: string; message: string } } = {
        new_login: {
          subject: 'New login to your WorldBest account',
          message: `A new login was detected from ${details.location || 'Unknown location'} using ${details.device || 'Unknown device'}.`,
        },
        password_changed: {
          subject: 'Your WorldBest password was changed',
          message: 'Your password was successfully changed. If you didn\'t make this change, please contact support immediately.',
        },
        two_factor_enabled: {
          subject: 'Two-factor authentication enabled',
          message: 'Two-factor authentication has been successfully enabled on your account.',
        },
        two_factor_disabled: {
          subject: 'Two-factor authentication disabled',
          message: 'Two-factor authentication has been disabled on your account. Your account may be less secure.',
        },
      };

      const alert = alertMessages[alertType] || {
        subject: 'Security alert for your WorldBest account',
        message: 'There was a security-related change to your account.',
      };

      const mailOptions = {
        from: this.fromEmail,
        to: email,
        subject: alert.subject,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background-color: #DC2626; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; background-color: #f9f9f9; }
                .alert { background-color: #FEF2F2; border: 1px solid #FCA5A5; padding: 15px; border-radius: 5px; margin: 20px 0; }
                .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Security Alert</h1>
                </div>
                <div class="content">
                  <div class="alert">
                    <p><strong>${alert.message}</strong></p>
                    <p>Time: ${new Date().toLocaleString()}</p>
                    ${details.ipAddress ? `<p>IP Address: ${details.ipAddress}</p>` : ''}
                  </div>
                  <p>If this was you, you can safely ignore this email.</p>
                  <p>If you didn't perform this action, please:</p>
                  <ol>
                    <li>Change your password immediately</li>
                    <li>Enable two-factor authentication</li>
                    <li>Contact our support team at support@worldbest.ai</li>
                  </ol>
                </div>
                <div class="footer">
                  <p>&copy; 2024 WorldBest. All rights reserved.</p>
                  <p>This is an automated security notification</p>
                </div>
              </div>
            </body>
          </html>
        `,
      };

      await this.transporter.sendMail(mailOptions);
      logger.info(`Security alert (${alertType}) sent to ${email}`);
    } catch (error) {
      logger.error('Error sending security alert:', error);
      // Don't throw - security alerts are not critical
    }
  }
}