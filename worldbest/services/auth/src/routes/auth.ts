import { Router } from 'express';
import { body } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { authController } from '../controllers/auth';
import { authenticateToken } from '../middleware/auth';
import { config } from '../config';

const router = Router();

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: config.rateLimiting.loginAttempts.windowMs,
  max: config.rateLimiting.loginAttempts.max,
  message: {
    error: 'Too many authentication attempts',
    message: 'Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Validation rules
const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: config.password.minLength })
    .withMessage(`Password must be at least ${config.password.minLength} characters long`),
  body('displayName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Display name must be between 2 and 50 characters'),
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

// Routes
router.post('/register', registerValidation, authController.register);
router.post('/signup', registerValidation, authController.register); // alias for web client
router.post('/login', authLimiter, loginValidation, authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.get('/me', authenticateToken, authController.me);

// Password reset
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

// Email verification
router.post('/verify-email', authController.verifyEmail);
router.post('/resend-verification', authenticateToken, authController.resendVerification);

// Account management
router.post('/change-password', authenticateToken, authController.changePassword);
router.patch('/profile', authenticateToken, authController.updateProfile);
router.delete('/account', authenticateToken, authController.deleteAccount);

// 2FA
router.post('/2fa/enable', authenticateToken, authController.enable2FA);
router.post('/2fa/verify', authenticateToken, authController.verify2FA);
router.post('/2fa/disable', authenticateToken, authController.disable2FA);

export { router as authRoutes };