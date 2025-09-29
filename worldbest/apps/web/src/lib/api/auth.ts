import { User } from '@worldbest/shared-types';
import { apiClient } from './client';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  displayName: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

export interface RefreshTokenResponse {
  token: string;
}

export const authApi = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', {
      email,
      password,
    });
    return response.data;
  },

  async signup(email: string, password: string, displayName: string): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/signup', {
      email,
      password,
      displayName,
    });
    return response.data;
  },

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  },

  async refreshToken(): Promise<RefreshTokenResponse> {
    const response = await apiClient.post<RefreshTokenResponse>('/auth/refresh');
    return response.data;
  },

  async me(): Promise<User> {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  },

  async forgotPassword(email: string): Promise<void> {
    await apiClient.post('/auth/forgot-password', { email });
  },

  async resetPassword(token: string, password: string): Promise<void> {
    await apiClient.post('/auth/reset-password', { token, password });
  },

  async verifyEmail(token: string): Promise<void> {
    await apiClient.post('/auth/verify-email', { token });
  },

  async resendVerification(): Promise<void> {
    await apiClient.post('/auth/resend-verification');
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await apiClient.post('/auth/change-password', {
      currentPassword,
      newPassword,
    });
  },

  async updateProfile(data: Partial<User>): Promise<User> {
    const response = await apiClient.patch<User>('/auth/profile', data);
    return response.data;
  },

  async deleteAccount(): Promise<void> {
    await apiClient.delete('/auth/account');
  },

  async enable2FA(): Promise<{ qrCode: string; secret: string }> {
    const response = await apiClient.post<{ qrCode: string; secret: string }>('/auth/2fa/enable');
    return response.data;
  },

  async verify2FA(token: string): Promise<void> {
    await apiClient.post('/auth/2fa/verify', { token });
  },

  async disable2FA(token: string): Promise<void> {
    await apiClient.post('/auth/2fa/disable', { token });
  },
};