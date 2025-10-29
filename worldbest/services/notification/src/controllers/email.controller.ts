import express from 'express';
import { EmailService, EmailRequest, BatchEmailRequest } from '../services/email-service.js';
import { body, validationResult, param } from 'express-validator';

export class EmailController {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  // Validation middleware
  static validateSendEmail = [
    body('to').isEmail().withMessage('Valid recipient email is required'),
    body('subject').isString().isLength({ min: 1, max: 200 }).withMessage('Subject is required (max 200 chars)'),
    body('htmlBody').optional().isString(),
    body('textBody').optional().isString(),
    body('templateId').optional().isString(),
    body('templateData').optional().isObject(),
    body('priority').optional().isIn(['low', 'normal', 'high']),
    body('scheduledAt').optional().isISO8601().toDate(),
  ];

  static validateBatchEmail = [
    body('recipients').isArray({ min: 1, max: 1000 }).withMessage('Recipients array required (max 1000)'),
    body('recipients.*.email').isEmail().withMessage('All recipient emails must be valid'),
    body('recipients.*.data').optional().isObject(),
    body('templateId').optional().isString(),
    body('subject').optional().isString().isLength({ max: 200 }),
    body('htmlBody').optional().isString(),
    body('textBody').optional().isString(),
    body('priority').optional().isIn(['low', 'normal', 'high']),
  ];

  static validateCreateTemplate = [
    body('name').isString().isLength({ min: 1, max: 100 }).withMessage('Template name required (max 100 chars)'),
    body('subject').isString().isLength({ min: 1, max: 200 }).withMessage('Subject required (max 200 chars)'),
    body('htmlBody').isString().isLength({ min: 1 }).withMessage('HTML body required'),
    body('textBody').optional().isString(),
    body('variables').isArray().withMessage('Variables array required'),
    body('category').isString().isLength({ min: 1, max: 50 }).withMessage('Category required (max 50 chars)'),
  ];

  // Send transactional email
  async sendEmail(req: express.Request, res: express.Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
        return;
      }

      const {
        to,
        cc,
        bcc,
        subject,
        htmlBody,
        textBody,
        templateId,
        templateData,
        attachments,
        priority = 'normal',
        scheduledAt
      } = req.body;

      // Validate that either body content or template is provided
      if (!htmlBody && !textBody && !templateId) {
        res.status(400).json({
          success: false,
          error: 'Either email body content or template ID must be provided'
        });
        return;
      }

      const userId = req.user?.id; // From auth middleware

      let result: EmailRequest;

      if (scheduledAt) {
        // Schedule email for later
        result = await this.emailService.scheduleEmail({
          to,
          cc,
          bcc,
          subject,
          htmlBody,
          textBody,
          templateId,
          templateData,
          attachments,
          priority,
          userId,
          metadata: { source: 'api' }
        }, new Date(scheduledAt));
      } else {
        // Send immediately
        result = await this.emailService.sendTransactionalEmail({
          to,
          cc,
          bcc,
          subject,
          htmlBody,
          textBody,
          templateId,
          templateData,
          attachments,
          priority,
          userId,
          metadata: { source: 'api' }
        });
      }

      res.status(result.status === 'sent' ? 200 : 202).json({
        success: true,
        data: {
          emailId: result.id,
          status: result.status,
          scheduledAt: result.scheduledAt,
          sentAt: result.sentAt,
          message: result.status === 'sent' ? 'Email sent successfully' : 
                   result.status === 'scheduled' ? 'Email scheduled successfully' : 'Email queued for sending'
        }
      });

    } catch (error) {
      console.error('Send email error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send email'
      });
    }
  }

  // Send batch emails
  async sendBatchEmails(req: express.Request, res: express.Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
        return;
      }

      const {
        recipients,
        templateId,
        subject,
        htmlBody,
        textBody,
        priority = 'normal',
        scheduledAt
      } = req.body;

      // Validate that either body content or template is provided
      if (!htmlBody && !textBody && !templateId) {
        res.status(400).json({
          success: false,
          error: 'Either email body content or template ID must be provided'
        });
        return;
      }

      const result = await this.emailService.sendBatchEmails({
        templateId,
        subject,
        htmlBody,
        textBody,
        recipients,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
        priority
      });

      res.status(202).json({
        success: true,
        data: {
          batchId: result.id,
          status: result.status,
          recipientCount: recipients.length,
          successCount: result.successCount,
          failureCount: result.failureCount,
          message: 'Batch email processing completed'
        }
      });

    } catch (error) {
      console.error('Send batch emails error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send batch emails'
      });
    }
  }

  // Create email template
  async createTemplate(req: express.Request, res: express.Response): Promise<void> {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
        return;
      }

      const {
        name,
        subject,
        htmlBody,
        textBody,
        variables,
        category
      } = req.body;

      const template = await this.emailService.createTemplate({
        name,
        subject,
        htmlBody,
        textBody,
        variables,
        category,
        isActive: true
      });

      res.status(201).json({
        success: true,
        data: {
          templateId: template.id,
          name: template.name,
          category: template.category,
          variables: template.variables,
          createdAt: template.createdAt
        }
      });

    } catch (error) {
      console.error('Create template error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create template'
      });
    }
  }

  // Update email template
  async updateTemplate(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { templateId } = req.params;
      const updates = req.body;

      const template = await this.emailService.updateTemplate(templateId, updates);

      if (!template) {
        res.status(404).json({
          success: false,
          error: 'Template not found'
        });
        return;
      }

      res.json({
        success: true,
        data: {
          templateId: template.id,
          name: template.name,
          category: template.category,
          variables: template.variables,
          updatedAt: template.updatedAt
        }
      });

    } catch (error) {
      console.error('Update template error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update template'
      });
    }
  }

  // Get email template
  async getTemplate(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { templateId } = req.params;

      const template = await this.emailService.getTemplate(templateId);

      if (!template) {
        res.status(404).json({
          success: false,
          error: 'Template not found'
        });
        return;
      }

      res.json({
        success: true,
        data: template
      });

    } catch (error) {
      console.error('Get template error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve template'
      });
    }
  }

  // List email templates
  async listTemplates(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { category } = req.query;

      const templates = await this.emailService.listTemplates(category as string);

      res.json({
        success: true,
        data: {
          templates: templates.map(t => ({
            id: t.id,
            name: t.name,
            subject: t.subject,
            category: t.category,
            variables: t.variables,
            isActive: t.isActive,
            createdAt: t.createdAt,
            updatedAt: t.updatedAt
          })),
          count: templates.length
        }
      });

    } catch (error) {
      console.error('List templates error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list templates'
      });
    }
  }

  // Get email statistics
  async getEmailStats(req: express.Request, res: express.Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const stats = await this.emailService.getEmailStats(userId);

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Get email stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve email statistics'
      });
    }
  }

  // Test SMTP connection
  async testConnection(req: express.Request, res: express.Response): Promise<void> {
    try {
      const result = await this.emailService.testConnection();

      res.status(result.success ? 200 : 500).json({
        success: result.success,
        message: result.message
      });

    } catch (error) {
      console.error('Test connection error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to test connection'
      });
    }
  }

  // Send welcome email (convenience method)
  async sendWelcomeEmail(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { email, name } = req.body;

      if (!email || !name) {
        res.status(400).json({
          success: false,
          error: 'Email and name are required'
        });
        return;
      }

      const result = await this.emailService.sendTransactionalEmail({
        to: email,
        subject: `Welcome to WorldBest Platform, ${name}!`,
        templateId: 'welcome',
        templateData: { name, email },
        priority: 'normal',
        metadata: { type: 'welcome', source: 'api' }
      });

      res.json({
        success: true,
        data: {
          emailId: result.id,
          status: result.status,
          message: 'Welcome email sent successfully'
        }
      });

    } catch (error) {
      console.error('Send welcome email error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send welcome email'
      });
    }
  }

  // Send export notification
  async sendExportNotification(req: express.Request, res: express.Response): Promise<void> {
    try {
      const {
        email,
        userName,
        projectTitle,
        format,
        fileSize,
        downloadUrl
      } = req.body;

      if (!email || !userName || !projectTitle || !downloadUrl) {
        res.status(400).json({
          success: false,
          error: 'Email, userName, projectTitle, and downloadUrl are required'
        });
        return;
      }

      const result = await this.emailService.sendTransactionalEmail({
        to: email,
        subject: `Your export is ready - ${projectTitle}`,
        templateId: 'export-complete',
        templateData: {
          userName,
          projectTitle,
          format: format || 'Unknown',
          fileSize: fileSize || 'Unknown',
          completedAt: new Date().toLocaleString(),
          downloadUrl
        },
        priority: 'high',
        metadata: { type: 'export-notification', source: 'api' }
      });

      res.json({
        success: true,
        data: {
          emailId: result.id,
          status: result.status,
          message: 'Export notification sent successfully'
        }
      });

    } catch (error) {
      console.error('Send export notification error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send export notification'
      });
    }
  }
}