import { apiClient } from './client';
import { User, Session, AuthResponse, LoginRequest, SignupRequest } from '@worldbest/shared-types';

export const authApi = {
  // Get current session
  async getCurrentSession(): Promise<{ user: User; session: Session }> {
    return apiClient.get('/auth/me');
  },

  // Login
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
    
    // Store tokens
    if (response.access_token) {
      apiClient.setAuthToken(response.access_token);
    }
    
    return response;
  },

  // Signup
  async signup(data: SignupRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/signup', data);
    
    // Store tokens
    if (response.access_token) {
      apiClient.setAuthToken(response.access_token);
    }
    
    return response;
  },

  // Logout
  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      apiClient.clearAuthToken();
    }
  },

  // Refresh session
  async refreshSession(): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/refresh');
    
    // Update tokens
    if (response.access_token) {
      apiClient.setAuthToken(response.access_token);
    }
    
    return response;
  },

  // Request password reset
  async requestPasswordReset(email: string): Promise<void> {
    return apiClient.post('/auth/password-reset', { email });
  },

  // Confirm password reset
  async confirmPasswordReset(token: string, newPassword: string): Promise<void> {
    return apiClient.post('/auth/password-reset/confirm', { token, newPassword });
  },

  // Verify email
  async verifyEmail(token: string): Promise<void> {
    return apiClient.post('/auth/verify-email', { token });
  },

  // Resend verification email
  async resendVerificationEmail(): Promise<void> {
    return apiClient.post('/auth/resend-verification');
  },

  // Setup 2FA
  async setup2FA(): Promise<{ secret: string; qrCode: string; backupCodes: string[] }> {
    return apiClient.post('/auth/2fa/setup');
  },

  // Verify 2FA setup
  async verify2FASetup(token: string): Promise<void> {
    return apiClient.post('/auth/2fa/verify', { token });
  },

  // Disable 2FA
  async disable2FA(password: string): Promise<void> {
    return apiClient.post('/auth/2fa/disable', { password });
  },

  // Get OAuth providers
  async getOAuthProviders(): Promise<Array<{ id: string; name: string; enabled: boolean }>> {
    return apiClient.get('/auth/oauth/providers');
  },

  // OAuth callback
  async handleOAuthCallback(provider: string, code: string, state?: string): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/oauth/callback', {
      provider,
      code,
      state,
    });
    
    // Store tokens
    if (response.access_token) {
      apiClient.setAuthToken(response.access_token);
    }
    
    return response;
  },
};