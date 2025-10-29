import { Twilio } from 'twilio';
import { logger } from '../utils/logger';
import { config } from '../config';

export interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export class SMSService {
  private client: Twilio | null = null;

  constructor() {
    if (config.sms.twilio.accountSid && config.sms.twilio.authToken) {
      this.client = new Twilio(
        config.sms.twilio.accountSid,
        config.sms.twilio.authToken
      );
    } else {
      logger.warn('Twilio credentials not configured, SMS service disabled');
    }
  }

  /**
   * Send verification code via SMS
   */
  async sendVerificationCode(phoneNumber: string, code: string): Promise<SMSResult> {
    if (!this.client) {
      logger.error('SMS service not initialized');
      return { success: false, error: 'SMS service not available' };
    }

    try {
      const message = `Your ${config.app.name} verification code is: ${code}. This code will expire in 5 minutes.`;

      const result = await this.client.messages.create({
        body: message,
        from: config.sms.twilio.phoneNumber,
        to: phoneNumber,
      });

      logger.info('SMS verification code sent', { 
        phoneNumber: this.maskPhoneNumber(phoneNumber),
        messageId: result.sid 
      });

      return {
        success: true,
        messageId: result.sid,
      };
    } catch (error) {
      logger.error('SMS send error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send security alert SMS
   */
  async sendSecurityAlert(phoneNumber: string, alertType: string, location?: string): Promise<SMSResult> {
    if (!this.client) {
      return { success: false, error: 'SMS service not available' };
    }

    try {
      let message = `${config.app.name} Security Alert: ${alertType}`;
      if (location) {
        message += ` from ${location}`;
      }
      message += '. If this wasn\'t you, secure your account immediately.';

      const result = await this.client.messages.create({
        body: message,
        from: config.sms.twilio.phoneNumber,
        to: phoneNumber,
      });

      logger.info('Security alert SMS sent', { 
        phoneNumber: this.maskPhoneNumber(phoneNumber),
        alertType,
        messageId: result.sid 
      });

      return {
        success: true,
        messageId: result.sid,
      };
    } catch (error) {
      logger.error('Security alert SMS error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send password reset code
   */
  async sendPasswordResetCode(phoneNumber: string, code: string): Promise<SMSResult> {
    if (!this.client) {
      return { success: false, error: 'SMS service not available' };
    }

    try {
      const message = `Your ${config.app.name} password reset code is: ${code}. This code will expire in 10 minutes. If you didn't request this, ignore this message.`;

      const result = await this.client.messages.create({
        body: message,
        from: config.sms.twilio.phoneNumber,
        to: phoneNumber,
      });

      logger.info('Password reset SMS sent', { 
        phoneNumber: this.maskPhoneNumber(phoneNumber),
        messageId: result.sid 
      });

      return {
        success: true,
        messageId: result.sid,
      };
    } catch (error) {
      logger.error('Password reset SMS error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Validate phone number format
   */
  validatePhoneNumber(phoneNumber: string): boolean {
    // Basic E.164 format validation
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    return phoneRegex.test(phoneNumber);
  }

  /**
   * Format phone number to E.164
   */
  formatPhoneNumber(phoneNumber: string, countryCode: string = '+1'): string {
    // Remove all non-digit characters
    const digits = phoneNumber.replace(/\D/g, '');
    
    // If already starts with country code, return as is
    if (digits.startsWith('1') && digits.length === 11) {
      return `+${digits}`;
    }
    
    // Add country code if missing
    if (digits.length === 10) {
      return `${countryCode}${digits}`;
    }
    
    return phoneNumber; // Return original if can't format
  }

  /**
   * Mask phone number for logging
   */
  private maskPhoneNumber(phoneNumber: string): string {
    return phoneNumber.replace(/(\+\d{1,3})\d{6,10}(\d{4})/, '$1******$2');
  }

  /**
   * Check if SMS service is available
   */
  isAvailable(): boolean {
    return this.client !== null;
  }
}

export const smsService = new SMSService();