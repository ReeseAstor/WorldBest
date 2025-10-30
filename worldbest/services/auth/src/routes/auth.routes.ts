import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validation.middleware';

const router = Router();
const authController = new AuthController();

// Validation rules
const signupValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/),
  body('displayName').isLength({ min: 2, max: 50 }).trim(),
];

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
];

const refreshValidation = [
  body('refreshToken').notEmpty(),
];

const forgotPasswordValidation = [
  body('email').isEmail().normalizeEmail(),
];

const resetPasswordValidation = [
  body('token').notEmpty(),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/),
];

const changePasswordValidation = [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/),
];

// Public routes
router.post('/signup', signupValidation, validateRequest, authController.signup);
router.post('/login', loginValidation, validateRequest, authController.login);
router.post('/refresh', refreshValidation, validateRequest, authController.refreshToken);
router.post('/forgot-password', forgotPasswordValidation, validateRequest, authController.forgotPassword);
router.post('/reset-password', resetPasswordValidation, validateRequest, authController.resetPassword);
router.post('/verify-email/:token', authController.verifyEmail);
router.post('/resend-verification', body('email').isEmail(), validateRequest, authController.resendVerification);

// Protected routes
router.post('/logout', authenticate, authController.logout);
router.post('/change-password', authenticate, changePasswordValidation, validateRequest, authController.changePassword);
router.get('/me', authenticate, authController.getCurrentUser);
router.put('/me', authenticate, authController.updateProfile);
router.post('/enable-2fa', authenticate, authController.enable2FA);
router.post('/verify-2fa', authenticate, authController.verify2FA);
router.post('/disable-2fa', authenticate, authController.disable2FA);

// OAuth routes
router.get('/google', authController.googleAuth);
router.get('/google/callback', authController.googleCallback);
router.get('/github', authController.githubAuth);
router.get('/github/callback', authController.githubCallback);

export { router as authRouter };