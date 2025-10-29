import express from 'express';
import { EmailController } from '../controllers/email.controller.js';

const router = express.Router();
const emailController = new EmailController();

// Send transactional email
router.post(
  '/send',
  EmailController.validateSendEmail,
  emailController.sendEmail.bind(emailController)
);

// Send batch emails
router.post(
  '/send-batch',
  EmailController.validateBatchEmail,
  emailController.sendBatchEmails.bind(emailController)
);

// Create email template
router.post(
  '/templates',
  EmailController.validateCreateTemplate,
  emailController.createTemplate.bind(emailController)
);

// Update email template
router.put(
  '/templates/:templateId',
  emailController.updateTemplate.bind(emailController)
);

// Get email template
router.get(
  '/templates/:templateId',
  emailController.getTemplate.bind(emailController)
);

// List email templates
router.get(
  '/templates',
  emailController.listTemplates.bind(emailController)
);

// Get email statistics
router.get(
  '/stats',
  emailController.getEmailStats.bind(emailController)
);

// Test SMTP connection
router.get(
  '/test-connection',
  emailController.testConnection.bind(emailController)
);

// Convenience endpoints
router.post(
  '/welcome',
  emailController.sendWelcomeEmail.bind(emailController)
);

router.post(
  '/export-notification',
  emailController.sendExportNotification.bind(emailController)
);

// Health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'email-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

export default router;