import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { URL, URLSearchParams } from 'url';
import { config } from '../config';
import { redisService } from './redis';
import { jwtService } from './jwt';
import { passwordService } from './password';
import { logger, logAuth, logSecurity } from '../utils/logger';
import { prisma } from '@worldbest/database';

export interface OAuth2Provider {
  name: string;
  authUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  clientId: string;
  clientSecret: string;
  scopes: string[];
  userMapping: {
    id: string;
    email: string;
    name: string;
    avatar?: string;
  };
}

export interface OAuth2State {
  state: string;
  codeVerifier: string;
  provider: string;
  redirectUri: string;
  createdAt: number;
}

export interface OAuth2UserInfo {
  providerId: string;
  email: string;
  name: string;
  avatar?: string;
  provider: string;
}

export class OAuth2Service {
  private providers: Map<string, OAuth2Provider> = new Map();

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders() {
    // Google OAuth2
    if (config.oauth.google.clientId && config.oauth.google.clientSecret) {
      this.providers.set('google', {
        name: 'Google',
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
        clientId: config.oauth.google.clientId,
        clientSecret: config.oauth.google.clientSecret,
        scopes: ['openid', 'email', 'profile'],
        userMapping: {
          id: 'id',
          email: 'email',
          name: 'name',
          avatar: 'picture',
        },
      });
    }

    // GitHub OAuth2
    if (config.oauth.github.clientId && config.oauth.github.clientSecret) {
      this.providers.set('github', {
        name: 'GitHub',
        authUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        userInfoUrl: 'https://api.github.com/user',
        clientId: config.oauth.github.clientId,
        clientSecret: config.oauth.github.clientSecret,
        scopes: ['user:email'],
        userMapping: {
          id: 'id',
          email: 'email',
          name: 'name',
          avatar: 'avatar_url',
        },
      });
    }

    // Discord OAuth2
    if (config.oauth.discord.clientId && config.oauth.discord.clientSecret) {
      this.providers.set('discord', {
        name: 'Discord',
        authUrl: 'https://discord.com/api/oauth2/authorize',
        tokenUrl: 'https://discord.com/api/oauth2/token',
        userInfoUrl: 'https://discord.com/api/users/@me',
        clientId: config.oauth.discord.clientId,
        clientSecret: config.oauth.discord.clientSecret,
        scopes: ['identify', 'email'],
        userMapping: {
          id: 'id',
          email: 'email',
          name: 'username',
          avatar: 'avatar',
        },
      });
    }

    logger.info('OAuth2 providers initialized', {
      providers: Array.from(this.providers.keys()),
    });
  }

  /**
   * Generate authorization URL with PKCE
   */
  async getAuthorizationUrl(
    provider: string,
    redirectUri: string,
    req: Request
  ): Promise<{ url: string; state: string }> {
    const oauthProvider = this.providers.get(provider);
    if (!oauthProvider) {
      throw new Error(`OAuth provider '${provider}' not configured`);
    }

    // Generate PKCE parameters
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.generateCodeChallenge(codeVerifier);
    const state = this.generateState();

    // Store OAuth state in Redis with 10-minute expiry
    const oauthState: OAuth2State = {
      state,
      codeVerifier,
      provider,
      redirectUri,
      createdAt: Date.now(),
    };

    await redisService.set(
      `oauth_state:${state}`,
      JSON.stringify(oauthState),
      600 // 10 minutes
    );

    // Build authorization URL
    const authUrl = new URL(oauthProvider.authUrl);
    const params = new URLSearchParams({
      client_id: oauthProvider.clientId,
      response_type: 'code',
      scope: oauthProvider.scopes.join(' '),
      state,
      redirect_uri: redirectUri,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    // Add provider-specific parameters
    if (provider === 'google') {
      params.append('access_type', 'offline');
      params.append('prompt', 'consent');
    }

    authUrl.search = params.toString();

    logger.info('OAuth authorization URL generated', {
      provider,
      state,
      ip: req.ip,
    });

    return {
      url: authUrl.toString(),
      state,
    };
  }

  /**
   * Handle OAuth callback and exchange code for tokens
   */
  async handleCallback(
    code: string,
    state: string,
    req: Request
  ): Promise<OAuth2UserInfo> {
    // Verify state
    const stateKey = `oauth_state:${state}`;
    const storedStateData = await redisService.get(stateKey);
    
    if (!storedStateData) {
      logSecurity('Invalid OAuth state', { state, ip: req.ip });
      throw new Error('Invalid or expired OAuth state');
    }

    const oauthState: OAuth2State = JSON.parse(storedStateData);
    
    // Delete used state
    await redisService.del(stateKey);

    const provider = this.providers.get(oauthState.provider);
    if (!provider) {
      throw new Error(`OAuth provider '${oauthState.provider}' not configured`);
    }

    // Exchange code for tokens
    const tokenData = await this.exchangeCodeForTokens(
      provider,
      code,
      oauthState.redirectUri,
      oauthState.codeVerifier
    );

    // Get user information
    const userInfo = await this.getUserInfo(provider, tokenData.access_token);

    // Handle special cases for email retrieval
    if (oauthState.provider === 'github' && !userInfo[provider.userMapping.email]) {
      const emails = await this.getGitHubEmails(tokenData.access_token);
      const primaryEmail = emails.find(email => email.primary && email.verified);
      if (primaryEmail) {
        userInfo.email = primaryEmail.email;
      }
    }

    // Map user data
    const mappedUser: OAuth2UserInfo = {
      providerId: userInfo[provider.userMapping.id]?.toString() || '',
      email: userInfo[provider.userMapping.email] || '',
      name: userInfo[provider.userMapping.name] || '',
      avatar: provider.userMapping.avatar ? userInfo[provider.userMapping.avatar] : undefined,
      provider: oauthState.provider,
    };

    // Handle Discord avatar URL
    if (oauthState.provider === 'discord' && mappedUser.avatar) {
      mappedUser.avatar = `https://cdn.discordapp.com/avatars/${mappedUser.providerId}/${mappedUser.avatar}.png`;
    }

    if (!mappedUser.email) {
      throw new Error('Email not provided by OAuth provider');
    }

    logger.info('OAuth user info retrieved', {
      provider: oauthState.provider,
      userId: mappedUser.providerId,
      email: mappedUser.email,
      ip: req.ip,
    });

    return mappedUser;
  }

  /**
   * Link OAuth account to existing user
   */
  async linkAccount(userId: string, oauthUser: OAuth2UserInfo): Promise<void> {
    try {
      // Check if this OAuth account is already linked to another user
      const existingAccount = await prisma.oAuthAccount.findUnique({
        where: {
          provider_providerId: {
            provider: oauthUser.provider,
            providerId: oauthUser.providerId,
          },
        },
      });

      if (existingAccount && existingAccount.userId !== userId) {
        throw new Error('This account is already linked to another user');
      }

      if (existingAccount) {
        // Update existing account
        await prisma.oAuthAccount.update({
          where: { id: existingAccount.id },
          data: {
            email: oauthUser.email,
            name: oauthUser.name,
            avatarUrl: oauthUser.avatar,
            lastUsedAt: new Date(),
          },
        });
      } else {
        // Create new OAuth account link
        await prisma.oAuthAccount.create({
          data: {
            userId,
            provider: oauthUser.provider,
            providerId: oauthUser.providerId,
            email: oauthUser.email,
            name: oauthUser.name,
            avatarUrl: oauthUser.avatar,
            lastUsedAt: new Date(),
          },
        });
      }

      logger.info('OAuth account linked', {
        userId,
        provider: oauthUser.provider,
        providerId: oauthUser.providerId,
      });
    } catch (error) {
      logger.error('OAuth account linking error:', error);
      throw error;
    }
  }

  /**
   * Unlink OAuth account
   */
  async unlinkAccount(userId: string, provider: string): Promise<void> {
    try {
      const deletedAccount = await prisma.oAuthAccount.deleteMany({
        where: {
          userId,
          provider,
        },
      });

      if (deletedAccount.count === 0) {
        throw new Error('OAuth account not found');
      }

      logger.info('OAuth account unlinked', { userId, provider });
    } catch (error) {
      logger.error('OAuth account unlinking error:', error);
      throw error;
    }
  }

  /**
   * Create or login user with OAuth
   */
  async createOrLoginUser(oauthUser: OAuth2UserInfo, req: Request): Promise<{
    user: any;
    tokens: any;
    isNewUser: boolean;
  }> {
    try {
      // Check if user exists by email
      let user = await prisma.user.findUnique({
        where: { email: oauthUser.email.toLowerCase() },
        include: {
          oauthAccounts: true,
        },
      });

      let isNewUser = false;

      if (!user) {
        // Create new user
        user = await prisma.user.create({
          data: {
            email: oauthUser.email.toLowerCase(),
            displayName: oauthUser.name,
            avatarUrl: oauthUser.avatar,
            emailVerified: true, // OAuth emails are considered verified
            oauthAccounts: {
              create: {
                provider: oauthUser.provider,
                providerId: oauthUser.providerId,
                email: oauthUser.email,
                name: oauthUser.name,
                avatarUrl: oauthUser.avatar,
                lastUsedAt: new Date(),
              },
            },
          },
          include: {
            oauthAccounts: true,
          },
        });
        isNewUser = true;

        logAuth('New user created via OAuth', user.id, {
          provider: oauthUser.provider,
          email: user.email,
          ip: req.ip,
        });
      } else {
        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date() },
        });

        // Link OAuth account if not already linked
        const existingOAuth = user.oauthAccounts.find(
          account => account.provider === oauthUser.provider
        );

        if (!existingOAuth) {
          await this.linkAccount(user.id, oauthUser);
        } else {
          // Update existing OAuth account
          await prisma.oAuthAccount.update({
            where: { id: existingOAuth.id },
            data: {
              lastUsedAt: new Date(),
              email: oauthUser.email,
              name: oauthUser.name,
              avatarUrl: oauthUser.avatar,
            },
          });
        }

        logAuth('User logged in via OAuth', user.id, {
          provider: oauthUser.provider,
          email: user.email,
          ip: req.ip,
        });
      }

      // Generate tokens
      const tokens = await jwtService.generateTokenPair(user.id, user.email);

      return {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          emailVerified: user.emailVerified,
          plan: user.plan,
        },
        tokens,
        isNewUser,
      };
    } catch (error) {
      logger.error('OAuth user creation/login error:', error);
      throw error;
    }
  }

  /**
   * Get user's linked OAuth accounts
   */
  async getLinkedAccounts(userId: string) {
    try {
      const accounts = await prisma.oAuthAccount.findMany({
        where: { userId },
        select: {
          provider: true,
          email: true,
          name: true,
          avatarUrl: true,
          lastUsedAt: true,
        },
      });

      return accounts.map(account => ({
        ...account,
        providerName: this.providers.get(account.provider)?.name || account.provider,
      }));
    } catch (error) {
      logger.error('Get linked accounts error:', error);
      throw error;
    }
  }

  /**
   * Get available OAuth providers
   */
  getAvailableProviders() {
    return Array.from(this.providers.entries()).map(([key, provider]) => ({
      id: key,
      name: provider.name,
      enabled: true,
    }));
  }

  // Private helper methods

  private generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  private generateCodeChallenge(verifier: string): string {
    return crypto.createHash('sha256').update(verifier).digest('base64url');
  }

  private generateState(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private async exchangeCodeForTokens(
    provider: OAuth2Provider,
    code: string,
    redirectUri: string,
    codeVerifier: string
  ): Promise<any> {
    const tokenParams = new URLSearchParams({
      client_id: provider.clientId,
      client_secret: provider.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code_verifier: codeVerifier,
    });

    const response = await fetch(provider.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: tokenParams,
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error('OAuth token exchange failed', { provider: provider.name, error });
      throw new Error('Failed to exchange authorization code for tokens');
    }

    return response.json();
  }

  private async getUserInfo(provider: OAuth2Provider, accessToken: string): Promise<any> {
    const response = await fetch(provider.userInfoUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      logger.error('OAuth user info request failed', { provider: provider.name, error });
      throw new Error('Failed to get user information');
    }

    return response.json();
  }

  private async getGitHubEmails(accessToken: string): Promise<any[]> {
    const response = await fetch('https://api.github.com/user/emails', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return [];
    }

    return response.json();
  }
}

export const oauth2Service = new OAuth2Service();"]}]