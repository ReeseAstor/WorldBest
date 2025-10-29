import { Router } from 'express';
import { query, param, body } from 'express-validator';
import { authMiddleware } from '../middleware/auth';
import { oauth2Controller } from '../controllers/oauth2';

const router = Router();

/**
 * Get available OAuth providers
 */
router.get('/providers', oauth2Controller.getProviders);

/**
 * Initiate OAuth login
 */
router.get('/login/:provider',
  param('provider').isIn(['google', 'github', 'discord']).withMessage('Invalid OAuth provider'),
  query('redirect_uri').optional().isURL().withMessage('Invalid redirect URI'),
  oauth2Controller.initiateLogin
);

/**
 * Handle OAuth callback
 */
router.get('/callback/:provider',
  param('provider').isIn(['google', 'github', 'discord']).withMessage('Invalid OAuth provider'),
  query('code').notEmpty().withMessage('Authorization code is required'),
  query('state').notEmpty().withMessage('State parameter is required'),
  query('error').optional(),
  oauth2Controller.handleCallback
);

/**
 * Link OAuth account to existing user (requires authentication)
 */
router.post('/link/:provider',
  authMiddleware,
  param('provider').isIn(['google', 'github', 'discord']).withMessage('Invalid OAuth provider'),
  body('code').notEmpty().withMessage('Authorization code is required'),
  body('state').notEmpty().withMessage('State parameter is required'),
  oauth2Controller.linkAccount
);

/**
 * Unlink OAuth account (requires authentication)
 */
router.delete('/unlink/:provider',
  authMiddleware,
  param('provider').isIn(['google', 'github', 'discord']).withMessage('Invalid OAuth provider'),
  oauth2Controller.unlinkAccount
);

/**
 * Get user's linked OAuth accounts (requires authentication)
 */
router.get('/accounts',
  authMiddleware,
  oauth2Controller.getLinkedAccounts
);

export { router as oauth2Routes };