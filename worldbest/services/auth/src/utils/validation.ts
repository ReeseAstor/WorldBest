import { body } from 'express-validator';

export const authValidation = {
  signup: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    body('display_name')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Display name is required and must be between 1 and 100 characters'),
    body('username')
      .optional()
      .trim()
      .isLength({ min: 3, max: 30 })
      .withMessage('Username must be between 3 and 30 characters')
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage('Username can only contain letters, numbers, hyphens, and underscores'),
  ],

  login: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
    body('two_factor_code')
      .optional()
      .isLength({ min: 6, max: 6 })
      .withMessage('Two-factor code must be 6 digits'),
  ],

  refresh: [
    body('refresh_token')
      .notEmpty()
      .withMessage('Refresh token is required'),
  ],

  requestPasswordReset: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
  ],

  confirmPasswordReset: [
    body('token')
      .notEmpty()
      .withMessage('Reset token is required'),
    body('new_password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  ],

  verifyEmail: [
    body('token')
      .notEmpty()
      .withMessage('Verification token is required'),
  ],

  updateProfile: [
    body('display_name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Display name must be between 1 and 100 characters'),
    body('username')
      .optional()
      .trim()
      .isLength({ min: 3, max: 30 })
      .withMessage('Username must be between 3 and 30 characters')
      .matches(/^[a-zA-Z0-9_-]+$/)
      .withMessage('Username can only contain letters, numbers, hyphens, and underscores'),
  ],

  verify2FA: [
    body('token')
      .isLength({ min: 6, max: 6 })
      .withMessage('Two-factor code must be 6 digits'),
  ],

  disable2FA: [
    body('password')
      .notEmpty()
      .withMessage('Password is required to disable 2FA'),
  ],

  oauthCallback: [
    body('provider')
      .isIn(['google', 'github'])
      .withMessage('Invalid OAuth provider'),
    body('code')
      .notEmpty()
      .withMessage('Authorization code is required'),
    body('state')
      .optional()
      .withMessage('State parameter is optional'),
  ],
};