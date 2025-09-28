import { Request, Response } from 'express';
import { AuthService } from '../services/auth-service';
import { logger } from '../utils/logger';

const authService = new AuthService();

export const authController = {
  async signup(req: Request, res: Response) {
    try {
      const { email, password, display_name, username } = req.body;
      
      const result = await authService.signup({
        email,
        password,
        display_name,
        username,
      });

      logger.info(`User signed up: ${email}`);
      
      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: result,
      });
    } catch (error) {
      logger.error('Signup error:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Signup failed',
      });
    }
  },

  async login(req: Request, res: Response) {
    try {
      const { email, password, two_factor_code } = req.body;
      
      const result = await authService.login({
        email,
        password,
        two_factor_code,
      });

      logger.info(`User logged in: ${email}`);
      
      res.json({
        success: true,
        message: 'Login successful',
        data: result,
      });
    } catch (error) {
      logger.error('Login error:', error);
      res.status(401).json({
        success: false,
        message: error instanceof Error ? error.message : 'Login failed',
      });
    }
  },

  async refresh(req: Request, res: Response) {
    try {
      const { refresh_token } = req.body;
      
      const result = await authService.refreshToken(refresh_token);
      
      res.json({
        success: true,
        message: 'Token refreshed successfully',
        data: result,
      });
    } catch (error) {
      logger.error('Token refresh error:', error);
      res.status(401).json({
        success: false,
        message: error instanceof Error ? error.message : 'Token refresh failed',
      });
    }
  },

  async logout(req: Request, res: Response) {
    try {
      const { user } = req;
      
      if (user) {
        await authService.logout(user.id);
        logger.info(`User logged out: ${user.email}`);
      }
      
      res.json({
        success: true,
        message: 'Logout successful',
      });
    } catch (error) {
      logger.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Logout failed',
      });
    }
  },

  async getCurrentUser(req: Request, res: Response) {
    try {
      const { user } = req;
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      const userData = await authService.getUserById(user.id);
      
      res.json({
        success: true,
        data: {
          user: userData.user,
          session: userData.session,
        },
      });
    } catch (error) {
      logger.error('Get current user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user data',
      });
    }
  },

  async updateProfile(req: Request, res: Response) {
    try {
      const { user } = req;
      const updateData = req.body;
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      const updatedUser = await authService.updateUser(user.id, updateData);
      
      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: updatedUser,
      });
    } catch (error) {
      logger.error('Update profile error:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Profile update failed',
      });
    }
  },

  async requestPasswordReset(req: Request, res: Response) {
    try {
      const { email } = req.body;
      
      await authService.requestPasswordReset(email);
      
      res.json({
        success: true,
        message: 'Password reset email sent',
      });
    } catch (error) {
      logger.error('Password reset request error:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Password reset request failed',
      });
    }
  },

  async confirmPasswordReset(req: Request, res: Response) {
    try {
      const { token, new_password } = req.body;
      
      await authService.confirmPasswordReset(token, new_password);
      
      res.json({
        success: true,
        message: 'Password reset successfully',
      });
    } catch (error) {
      logger.error('Password reset confirm error:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Password reset failed',
      });
    }
  },

  async verifyEmail(req: Request, res: Response) {
    try {
      const { token } = req.body;
      
      await authService.verifyEmail(token);
      
      res.json({
        success: true,
        message: 'Email verified successfully',
      });
    } catch (error) {
      logger.error('Email verification error:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Email verification failed',
      });
    }
  },

  async resendVerification(req: Request, res: Response) {
    try {
      const { user } = req;
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      await authService.resendVerificationEmail(user.id);
      
      res.json({
        success: true,
        message: 'Verification email sent',
      });
    } catch (error) {
      logger.error('Resend verification error:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to resend verification email',
      });
    }
  },

  async setup2FA(req: Request, res: Response) {
    try {
      const { user } = req;
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      const result = await authService.setup2FA(user.id);
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('2FA setup error:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : '2FA setup failed',
      });
    }
  },

  async verify2FA(req: Request, res: Response) {
    try {
      const { user } = req;
      const { token } = req.body;
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      await authService.verify2FASetup(user.id, token);
      
      res.json({
        success: true,
        message: '2FA enabled successfully',
      });
    } catch (error) {
      logger.error('2FA verification error:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : '2FA verification failed',
      });
    }
  },

  async disable2FA(req: Request, res: Response) {
    try {
      const { user } = req;
      const { password } = req.body;
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated',
        });
      }

      await authService.disable2FA(user.id, password);
      
      res.json({
        success: true,
        message: '2FA disabled successfully',
      });
    } catch (error) {
      logger.error('2FA disable error:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : '2FA disable failed',
      });
    }
  },

  async getOAuthProviders(req: Request, res: Response) {
    try {
      const providers = await authService.getOAuthProviders();
      
      res.json({
        success: true,
        data: providers,
      });
    } catch (error) {
      logger.error('Get OAuth providers error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get OAuth providers',
      });
    }
  },

  async handleOAuthCallback(req: Request, res: Response) {
    try {
      const { provider, code, state } = req.body;
      
      const result = await authService.handleOAuthCallback(provider, code, state);
      
      res.json({
        success: true,
        message: 'OAuth authentication successful',
        data: result,
      });
    } catch (error) {
      logger.error('OAuth callback error:', error);
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'OAuth authentication failed',
      });
    }
  },
};