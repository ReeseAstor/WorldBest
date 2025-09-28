import { Router } from 'express';
import { authController } from '../controllers/auth';
import { validateRequest } from '../middleware/validate-request';
import { authValidation } from '../utils/validation';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Public routes
router.post(
  '/signup',
  validateRequest(authValidation.signup),
  authController.signup
);

router.post(
  '/login',
  validateRequest(authValidation.login),
  authController.login
);

router.post(
  '/refresh',
  validateRequest(authValidation.refresh),
  authController.refresh
);

router.post(
  '/logout',
  authenticateToken,
  authController.logout
);

router.post(
  '/password-reset',
  validateRequest(authValidation.requestPasswordReset),
  authController.requestPasswordReset
);

router.post(
  '/password-reset/confirm',
  validateRequest(authValidation.confirmPasswordReset),
  authController.confirmPasswordReset
);

router.post(
  '/verify-email',
  validateRequest(authValidation.verifyEmail),
  authController.verifyEmail
);

router.post(
  '/resend-verification',
  authenticateToken,
  authController.resendVerification
);

// Protected routes
router.get(
  '/me',
  authenticateToken,
  authController.getCurrentUser
);

router.put(
  '/me',
  authenticateToken,
  validateRequest(authValidation.updateProfile),
  authController.updateProfile
);

router.post(
  '/2fa/setup',
  authenticateToken,
  authController.setup2FA
);

router.post(
  '/2fa/verify',
  authenticateToken,
  validateRequest(authValidation.verify2FA),
  authController.verify2FA
);

router.post(
  '/2fa/disable',
  authenticateToken,
  validateRequest(authValidation.disable2FA),
  authController.disable2FA
);

router.get(
  '/oauth/providers',
  authController.getOAuthProviders
);

router.post(
  '/oauth/callback',
  validateRequest(authValidation.oauthCallback),
  authController.handleOAuthCallback
);

export { router as authRoutes };