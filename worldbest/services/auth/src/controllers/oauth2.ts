import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { prisma } from '@worldbest/database';
import { oauth2Service } from '../services/oauth2';
import { logger, logAuth, logSecurity } from '../utils/logger';
import { config } from '../config';

export class OAuth2Controller {
  /**
   * Get available OAuth providers
   */
  async getProviders(req: Request, res: Response, next: NextFunction) {
    try {
      const providers = oauth2Service.getAvailableProviders();
      
      res.json({
        providers,
        enabled: config.features.socialAuth,
      });
    } catch (error) {
      logger.error('Get OAuth providers error:', error);
      next(error);
    }
  }

  /**
   * Initiate OAuth login
   */
  async initiateLogin(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const { provider } = req.params;
      const { redirect_uri } = req.query;

      if (!config.features.socialAuth) {
        return res.status(403).json({
          error: 'Social authentication disabled',
          message: 'Social authentication is currently disabled.',
        });
      }

      const redirectUri = redirect_uri as string || `${config.app.url}/auth/callback/${provider}`;

      const authData = await oauth2Service.getAuthorizationUrl(provider, redirectUri, req);

      logger.info('OAuth login initiated', {
        provider,
        state: authData.state,
        ip: req.ip,
      });

      res.json({
        authUrl: authData.url,
        state: authData.state,
        provider,
      });
    } catch (error) {
      logger.error('OAuth initiate login error:', error);
      if (error instanceof Error && error.message.includes('not configured')) {
        return res.status(400).json({
          error: 'Provider not available',
          message: `OAuth provider '${req.params.provider}' is not configured.`,
        });
      }
      next(error);
    }
  }

  /**
   * Handle OAuth callback
   */
  async handleCallback(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const { provider } = req.params;
      const { code, state, error: oauthError } = req.query;

      if (oauthError) {
        logSecurity('OAuth callback error', {
          provider,
          error: oauthError,
          ip: req.ip,
        });
        
        return res.status(400).json({
          error: 'OAuth authorization failed',
          message: `Authorization was denied or failed: ${oauthError}`,
        });
      }

      if (!code || !state) {
        return res.status(400).json({
          error: 'Missing parameters',
          message: 'Authorization code and state are required.',
        });
      }

      // Handle OAuth callback
      const oauthUser = await oauth2Service.handleCallback(
        code as string,
        state as string,
        req
      );

      // Create or login user
      const result = await oauth2Service.createOrLoginUser(oauthUser, req);

      // Set refresh token cookie
      res.cookie('refresh_token', result.tokens.refreshToken, {
        httpOnly: true,
        secure: config.env === 'production',
        sameSite: 'strict',
        maxAge: result.tokens.refreshTokenExpiry,
      });

      logAuth(`OAuth ${result.isNewUser ? 'registration' : 'login'} successful`, result.user.id, {
        provider,
        email: result.user.email,
        ip: req.ip,
      });

      res.json({
        message: `OAuth ${result.isNewUser ? 'registration' : 'login'} successful`,
        user: result.user,
        token: result.tokens.accessToken,
        expiresAt: result.tokens.accessTokenExpiry,
        isNewUser: result.isNewUser,
        provider,
      });
    } catch (error) {
      logger.error('OAuth callback error:', error);
      if (error instanceof Error) {
        if (error.message.includes('Invalid or expired OAuth state')) {
          return res.status(400).json({
            error: 'Invalid state',
            message: 'The OAuth state is invalid or expired. Please try again.',
          });
        }
        if (error.message.includes('Email not provided')) {
          return res.status(400).json({
            error: 'Email required',
            message: 'Email permission is required for authentication.',
          });
        }
      }
      next(error);
    }
  }

  /**
   * Link OAuth account to existing user
   */
  async linkAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const userId = req.user!.id;
      const { provider } = req.params;
      const { code, state } = req.body;

      // Handle OAuth callback to get user info
      const oauthUser = await oauth2Service.handleCallback(code, state, req);

      // Verify the OAuth email matches the user's email or allow linking
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Allow linking if emails match or if it's an additional account
      if (user.email.toLowerCase() !== oauthUser.email.toLowerCase()) {
        logSecurity('OAuth account linking with different email', {
          userId,
          userEmail: user.email,
          oauthEmail: oauthUser.email,
          provider,
          ip: req.ip,
        });
        
        // You might want to require additional verification here
        // For now, we'll allow it but log it for security monitoring
      }

      await oauth2Service.linkAccount(userId, oauthUser);

      logAuth('OAuth account linked', userId, {
        provider,
        oauthEmail: oauthUser.email,
        ip: req.ip,
      });

      res.json({
        message: 'Account linked successfully',
        provider: oauthUser.provider,
        email: oauthUser.email,
      });
    } catch (error) {
      logger.error('OAuth account linking error:', error);
      if (error instanceof Error && error.message.includes('already linked')) {
        return res.status(409).json({
          error: 'Account already linked',
          message: 'This OAuth account is already linked to another user.',
        });
      }
      next(error);
    }
  }

  /**
   * Unlink OAuth account
   */
  async unlinkAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors.array(),
        });
      }

      const userId = req.user!.id;
      const { provider } = req.params;

      // Check if user has a password set (for security)
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { 
          passwordHash: true,
          oauthAccounts: {
            where: { provider: { not: provider } },
          },
        },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Ensure user has alternative login method
      if (!user.passwordHash && user.oauthAccounts.length === 0) {
        return res.status(400).json({
          error: 'Cannot unlink account',
          message: 'You must set a password or have another linked account before unlinking this one.',
        });
      }

      await oauth2Service.unlinkAccount(userId, provider);

      logAuth('OAuth account unlinked', userId, {
        provider,
        ip: req.ip,
      });

      res.json({
        message: 'Account unlinked successfully',
        provider,
      });
    } catch (error) {
      logger.error('OAuth account unlinking error:', error);
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({
          error: 'Account not linked',
          message: 'This OAuth account is not linked to your profile.',
        });
      }
      next(error);
    }
  }

  /**
   * Get user's linked OAuth accounts
   */
  async getLinkedAccounts(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const accounts = await oauth2Service.getLinkedAccounts(userId);

      res.json({
        accounts,
        availableProviders: oauth2Service.getAvailableProviders(),
      });
    } catch (error) {
      logger.error('Get linked accounts error:', error);
      next(error);
    }
  }
}

export const oauth2Controller = new OAuth2Controller();