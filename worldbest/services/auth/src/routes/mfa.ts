import { Router } from 'express';
import { body, param } from 'express-validator';
import { authMiddleware } from '../middleware/auth';
import { mfaController } from '../controllers/mfa';

const router = Router();

// All MFA routes require authentication
router.use(authMiddleware);

/**
 * Setup TOTP (Time-based One-Time Password)
 */
router.post('/totp/setup',
  body('displayName').optional().isString().trim().isLength({ min: 1, max: 100 }),
  mfaController.setupTOTP
);

/**
 * Verify and enable TOTP
 */
router.post('/totp/verify',
  body('token').isString().isLength({ min: 6, max: 6 }).matches(/^\d{6}$/),
  mfaController.verifyAndEnableTOTP
);

/**
 * Disable TOTP
 */
router.post('/totp/disable',
  body('password').isString().isLength({ min: 1 }),
  body('confirmationCode').optional().isString().isLength({ min: 6, max: 6 }),
  mfaController.disableTOTP
);

/**
 * Verify TOTP token (for login)
 */
router.post('/totp/verify-login',
  body('token').isString().isLength({ min: 6, max: 6 }).matches(/^\d{6}$/),
  body('userId').isUUID(),
  mfaController.verifyTOTPLogin
);

/**
 * Send SMS verification code
 */
router.post('/sms/send',
  body('phoneNumber').isMobilePhone(),
  mfaController.sendSMSCode
);

/**
 * Verify SMS code
 */
router.post('/sms/verify',
  body('code').isString().isLength({ min: 6, max: 6 }).matches(/^\d{6}$/),
  mfaController.verifySMSCode
);

/**
 * Send email verification code
 */
router.post('/email/send',
  mfaController.sendEmailCode
);

/**
 * Verify email code
 */
router.post('/email/verify',
  body('code').isString().isLength({ min: 6, max: 6 }).matches(/^\d{6}$/),
  mfaController.verifyEmailCode
);

/**
 * Verify backup code
 */
router.post('/backup/verify',
  body('code').isString().isLength({ min: 8, max: 8 }).matches(/^[A-F0-9]{8}$/),
  mfaController.verifyBackupCode
);

/**
 * Generate new backup codes
 */
router.post('/backup/regenerate',
  body('password').isString().isLength({ min: 1 }),
  mfaController.generateBackupCodes
);

/**
 * Get MFA status
 */
router.get('/status', mfaController.getMFAStatus);

/**
 * Get available MFA methods
 */
router.get('/methods', mfaController.getAvailableMethods);

export { router as mfaRoutes };