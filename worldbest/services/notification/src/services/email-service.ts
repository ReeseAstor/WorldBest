import nodemailer, { Transporter, SendMailOptions } from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';

export interface EmailConfig {
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  from: {
    name: string;
    email: string;
  };
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  variables: string[];
  category: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailRequest {
  id: string;
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  subject: string;
  htmlBody?: string;
  textBody?: string;
  templateId?: string;
  templateData?: Record<string, any>;
  attachments?: EmailAttachment[];
  priority: 'low' | 'normal' | 'high';
  scheduledAt?: Date;
  userId?: string;
  metadata?: Record<string, any>;
  status: 'pending' | 'sent' | 'failed' | 'scheduled';
  createdAt: Date;
  sentAt?: Date;
  errorMessage?: string;
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
  encoding?: string;
  cid?: string; // For inline images
}

export interface BatchEmailRequest {
  id: string;
  templateId?: string;
  subject?: string;
  htmlBody?: string;
  textBody?: string;
  recipients: Array<{
    email: string;
    data?: Record<string, any>;
  }>;
  scheduledAt?: Date;
  priority: 'low' | 'normal' | 'high';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
  successCount: number;
  failureCount: number;
  results: Array<{
    email: string;
    status: 'sent' | 'failed';
    messageId?: string;
    error?: string;
  }>;
}

export interface EmailStats {
  totalSent: number;
  totalFailed: number;
  totalPending: number;
  totalScheduled: number;
  deliveryRate: number;
  bounceRate: number;
  lastUpdated: Date;
}

export class EmailService {
  private transporter: Transporter;
  private config: EmailConfig;
  private templates: Map<string, EmailTemplate>;

  constructor() {
    this.config = this.loadConfig();
    this.transporter = this.createTransporter();
    this.templates = new Map();
    this.initializeDefaultTemplates();
  }

  private loadConfig(): EmailConfig {
    return {
      smtp: {
        host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER || '98719f001@smtp-brevo.com',
          pass: process.env.SMTP_PASS || 'mhAvE04MbG6QU2q9'
        }
      },
      from: {
        name: process.env.EMAIL_FROM_NAME || 'WorldBest Platform',
        email: process.env.EMAIL_FROM_ADDRESS || '98719f001@smtp-brevo.com'
      }
    };
  }

  private createTransporter(): Transporter {
    const transporter = nodemailer.createTransporter({
      host: this.config.smtp.host,
      port: this.config.smtp.port,
      secure: this.config.smtp.secure,
      auth: {
        user: this.config.smtp.auth.user,
        pass: this.config.smtp.auth.pass
      },
      tls: {
        // Do not fail on invalid certs for development
        rejectUnauthorized: process.env.NODE_ENV === 'production'
      }
    });

    // Verify connection configuration
    transporter.verify((error, success) => {
      if (error) {
        console.error('SMTP connection error:', error);
      } else {
        console.log('✅ SMTP server is ready to take our messages');
      }
    });

    return transporter;
  }

  async sendTransactionalEmail(request: Omit<EmailRequest, 'id' | 'createdAt' | 'status'>): Promise<EmailRequest> {
    const emailRequest: EmailRequest = {
      ...request,
      id: uuidv4(),
      status: 'pending',
      createdAt: new Date()
    };

    try {
      let htmlBody = request.htmlBody;
      let textBody = request.textBody;
      let subject = request.subject;

      // Apply template if specified
      if (request.templateId && request.templateData) {
        const template = this.templates.get(request.templateId);
        if (template) {
          subject = this.processTemplate(template.subject, request.templateData);
          htmlBody = this.processTemplate(template.htmlBody, request.templateData);
          textBody = template.textBody ? this.processTemplate(template.textBody, request.templateData) : undefined;
        }
      }

      const mailOptions: SendMailOptions = {
        from: `${this.config.from.name} <${this.config.from.email}>`,
        to: Array.isArray(request.to) ? request.to.join(', ') : request.to,
        cc: request.cc ? (Array.isArray(request.cc) ? request.cc.join(', ') : request.cc) : undefined,
        bcc: request.bcc ? (Array.isArray(request.bcc) ? request.bcc.join(', ') : request.bcc) : undefined,
        subject,
        html: htmlBody,
        text: textBody,
        attachments: request.attachments?.map(att => ({
          filename: att.filename,
          content: att.content,
          contentType: att.contentType,
          encoding: att.encoding as any,
          cid: att.cid
        })),
        priority: request.priority === 'high' ? 'high' : (request.priority === 'low' ? 'low' : 'normal')
      };

      const info = await this.transporter.sendMail(mailOptions);

      emailRequest.status = 'sent';
      emailRequest.sentAt = new Date();
      emailRequest.metadata = {
        ...emailRequest.metadata,
        messageId: info.messageId,
        response: info.response
      };

      console.log(`✅ Email sent successfully: ${info.messageId}`);

    } catch (error) {
      emailRequest.status = 'failed';
      emailRequest.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      console.error('❌ Failed to send email:', error);
    }

    // In a real implementation, you would save this to a database
    await this.saveEmailRequest(emailRequest);

    return emailRequest;
  }

  async sendBatchEmails(batchRequest: Omit<BatchEmailRequest, 'id' | 'createdAt' | 'status' | 'successCount' | 'failureCount' | 'results'>): Promise<BatchEmailRequest> {
    const batch: BatchEmailRequest = {
      ...batchRequest,
      id: uuidv4(),
      status: 'processing',
      createdAt: new Date(),
      successCount: 0,
      failureCount: 0,
      results: []
    };

    try {
      for (const recipient of batchRequest.recipients) {
        try {
          let htmlBody = batchRequest.htmlBody;
          let textBody = batchRequest.textBody;
          let subject = batchRequest.subject;

          // Apply template if specified
          if (batchRequest.templateId) {
            const template = this.templates.get(batchRequest.templateId);
            if (template) {
              const data = { ...recipient.data, email: recipient.email };
              subject = this.processTemplate(template.subject, data);
              htmlBody = this.processTemplate(template.htmlBody, data);
              textBody = template.textBody ? this.processTemplate(template.textBody, data) : undefined;
            }
          }

          // Process templates with recipient data
          if (recipient.data) {
            if (subject) subject = this.processTemplate(subject, recipient.data);
            if (htmlBody) htmlBody = this.processTemplate(htmlBody, recipient.data);
            if (textBody) textBody = this.processTemplate(textBody, recipient.data);
          }

          const mailOptions: SendMailOptions = {
            from: `${this.config.from.name} <${this.config.from.email}>`,
            to: recipient.email,
            subject: subject || 'Message from WorldBest Platform',
            html: htmlBody,
            text: textBody,
            priority: batchRequest.priority === 'high' ? 'high' : (batchRequest.priority === 'low' ? 'low' : 'normal')
          };

          const info = await this.transporter.sendMail(mailOptions);

          batch.results.push({
            email: recipient.email,
            status: 'sent',
            messageId: info.messageId
          });
          batch.successCount++;

          // Add delay between emails to avoid rate limiting
          await this.delay(100);

        } catch (error) {
          batch.results.push({
            email: recipient.email,
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          batch.failureCount++;
        }
      }

      batch.status = 'completed';
      batch.completedAt = new Date();

      console.log(`📧 Batch email completed: ${batch.successCount} sent, ${batch.failureCount} failed`);

    } catch (error) {
      batch.status = 'failed';
      console.error('❌ Batch email failed:', error);
    }

    // Save batch results
    await this.saveBatchEmailRequest(batch);

    return batch;
  }

  async scheduleEmail(request: Omit<EmailRequest, 'id' | 'createdAt' | 'status'>, scheduledAt: Date): Promise<EmailRequest> {
    const emailRequest: EmailRequest = {
      ...request,
      id: uuidv4(),
      status: 'scheduled',
      scheduledAt,
      createdAt: new Date()
    };

    // Save scheduled email
    await this.saveEmailRequest(emailRequest);

    console.log(`📅 Email scheduled for ${scheduledAt.toISOString()}`);

    return emailRequest;
  }

  async processScheduledEmails(): Promise<void> {
    try {
      // In a real implementation, this would query the database for scheduled emails
      const scheduledEmails = await this.getScheduledEmails();

      for (const email of scheduledEmails) {
        if (email.scheduledAt && email.scheduledAt <= new Date()) {
          try {
            await this.sendTransactionalEmail({
              to: email.to,
              cc: email.cc,
              bcc: email.bcc,
              subject: email.subject,
              htmlBody: email.htmlBody,
              textBody: email.textBody,
              templateId: email.templateId,
              templateData: email.metadata?.templateData,
              attachments: email.attachments,
              priority: email.priority,
              userId: email.userId,
              metadata: email.metadata
            });

            // Mark as processed
            await this.updateEmailStatus(email.id, 'sent');

          } catch (error) {
            console.error(`Failed to send scheduled email ${email.id}:`, error);
            await this.updateEmailStatus(email.id, 'failed');
          }
        }
      }

    } catch (error) {
      console.error('Failed to process scheduled emails:', error);
    }
  }

  async createTemplate(template: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<EmailTemplate> {
    const newTemplate: EmailTemplate = {
      ...template,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.templates.set(newTemplate.id, newTemplate);
    await this.saveTemplate(newTemplate);

    return newTemplate;
  }

  async updateTemplate(templateId: string, updates: Partial<EmailTemplate>): Promise<EmailTemplate | null> {
    const existing = this.templates.get(templateId);
    if (!existing) return null;

    const updated: EmailTemplate = {
      ...existing,
      ...updates,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date()
    };

    this.templates.set(templateId, updated);
    await this.saveTemplate(updated);

    return updated;
  }

  async getTemplate(templateId: string): Promise<EmailTemplate | null> {
    return this.templates.get(templateId) || null;
  }

  async listTemplates(category?: string): Promise<EmailTemplate[]> {
    const templates = Array.from(this.templates.values());
    
    if (category) {
      return templates.filter(t => t.category === category && t.isActive);
    }
    
    return templates.filter(t => t.isActive);
  }

  async getEmailStats(userId?: string): Promise<EmailStats> {
    // In a real implementation, this would query the database
    return {
      totalSent: 0,
      totalFailed: 0,
      totalPending: 0,
      totalScheduled: 0,
      deliveryRate: 0,
      bounceRate: 0,
      lastUpdated: new Date()
    };
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      await this.transporter.verify();
      return {
        success: true,
        message: 'SMTP connection successful'
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Connection failed'
      };
    }
  }

  private processTemplate(template: string, data: Record<string, any>): string {
    let result = template;
    
    // Simple template processing - replace {{variable}} with data
    Object.entries(data).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
      result = result.replace(regex, String(value || ''));
    });

    return result;
  }

  private async initializeDefaultTemplates(): Promise<void> {
    const defaultTemplates = [
      {
        id: 'welcome',
        name: 'Welcome Email',
        subject: 'Welcome to WorldBest Platform, {{name}}!',
        htmlBody: `
          <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #333;">Welcome to WorldBest Platform!</h1>
              <p>Hello {{name}},</p>
              <p>Thank you for joining WorldBest Platform. We're excited to help you on your writing journey.</p>
              <p>Your account has been successfully created with the email: <strong>{{email}}</strong></p>
              <p>Get started by:</p>
              <ul>
                <li>Creating your first project</li>
                <li>Exploring our AI writing assistants</li>
                <li>Setting up your writing goals</li>
              </ul>
              <p>If you have any questions, feel free to reach out to our support team.</p>
              <p>Happy writing!</p>
              <p>The WorldBest Team</p>
            </body>
          </html>
        `,
        textBody: `Welcome to WorldBest Platform!

Hello {{name}},

Thank you for joining WorldBest Platform. We're excited to help you on your writing journey.

Your account has been successfully created with the email: {{email}}

Get started by:
- Creating your first project
- Exploring our AI writing assistants
- Setting up your writing goals

If you have any questions, feel free to reach out to our support team.

Happy writing!
The WorldBest Team`,
        variables: ['name', 'email'],
        category: 'onboarding',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'export-complete',
        name: 'Export Complete',
        subject: 'Your export is ready - {{projectTitle}}',
        htmlBody: `
          <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #333;">Export Complete!</h1>
              <p>Hello {{userName}},</p>
              <p>Great news! Your export for "<strong>{{projectTitle}}</strong>" has been completed successfully.</p>
              <div style="background: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
                <h3>Export Details:</h3>
                <ul>
                  <li><strong>Format:</strong> {{format}}</li>
                  <li><strong>File Size:</strong> {{fileSize}}</li>
                  <li><strong>Completed:</strong> {{completedAt}}</li>
                </ul>
              </div>
              <p>
                <a href="{{downloadUrl}}" style="background: #007acc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  Download Your Export
                </a>
              </p>
              <p><small>This download link will expire in 7 days.</small></p>
              <p>Thank you for using WorldBest Platform!</p>
            </body>
          </html>
        `,
        textBody: `Export Complete!

Hello {{userName}},

Great news! Your export for "{{projectTitle}}" has been completed successfully.

Export Details:
- Format: {{format}}
- File Size: {{fileSize}}
- Completed: {{completedAt}}

Download your export: {{downloadUrl}}

This download link will expire in 7 days.

Thank you for using WorldBest Platform!`,
        variables: ['userName', 'projectTitle', 'format', 'fileSize', 'completedAt', 'downloadUrl'],
        category: 'notification',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'password-reset',
        name: 'Password Reset',
        subject: 'Reset your WorldBest Platform password',
        htmlBody: `
          <html>
            <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #333;">Password Reset Request</h1>
              <p>Hello {{name}},</p>
              <p>We received a request to reset your password for your WorldBest Platform account.</p>
              <p>
                <a href="{{resetUrl}}" style="background: #007acc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  Reset Your Password
                </a>
              </p>
              <p>This link will expire in 1 hour for security reasons.</p>
              <p>If you didn't request this password reset, please ignore this email or contact our support team if you have concerns.</p>
              <p>Best regards,<br>The WorldBest Team</p>
            </body>
          </html>
        `,
        textBody: `Password Reset Request

Hello {{name}},

We received a request to reset your password for your WorldBest Platform account.

Reset your password: {{resetUrl}}

This link will expire in 1 hour for security reasons.

If you didn't request this password reset, please ignore this email or contact our support team if you have concerns.

Best regards,
The WorldBest Team`,
        variables: ['name', 'resetUrl'],
        category: 'security',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    for (const template of defaultTemplates) {
      this.templates.set(template.id, template);
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Database operations (would be implemented with actual database)
  private async saveEmailRequest(request: EmailRequest): Promise<void> {
    console.log('Saving email request:', request.id);
  }

  private async saveBatchEmailRequest(batch: BatchEmailRequest): Promise<void> {
    console.log('Saving batch email request:', batch.id);
  }

  private async saveTemplate(template: EmailTemplate): Promise<void> {
    console.log('Saving email template:', template.id);
  }

  private async getScheduledEmails(): Promise<EmailRequest[]> {
    // Would query database for scheduled emails
    return [];
  }

  private async updateEmailStatus(emailId: string, status: EmailRequest['status']): Promise<void> {
    console.log(`Updating email ${emailId} status to ${status}`);
  }
}