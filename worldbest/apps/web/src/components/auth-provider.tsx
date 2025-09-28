'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@worldbest/shared-types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/lib/api/auth';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signup: (data: {
    email: string;
    password: string;
    display_name: string;
    username?: string;
  }) => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  // Check for existing session on mount
  const { data: sessionData, isLoading: sessionLoading } = useQuery({
    queryKey: ['auth', 'session'],
    queryFn: authApi.getCurrentSession,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  useEffect(() => {
    if (sessionData) {
      setUser(sessionData.user);
      setSession(sessionData.session);
    }
    setIsLoading(sessionLoading);
  }, [sessionData, sessionLoading]);

  const loginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authApi.login({ email, password }),
    onSuccess: (data) => {
      setUser(data.user);
      setSession(data.session);
      queryClient.setQueryData(['auth', 'session'], data);
    },
    onError: (error) => {
      console.error('Login failed:', error);
      throw error;
    },
  });

  const signupMutation = useMutation({
    mutationFn: (data: {
      email: string;
      password: string;
      display_name: string;
      username?: string;
    }) => authApi.signup(data),
    onSuccess: (data) => {
      setUser(data.user);
      setSession(data.session);
      queryClient.setQueryData(['auth', 'session'], data);
    },
    onError: (error) => {
      console.error('Signup failed:', error);
      throw error;
    },
  });

  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      setUser(null);
      setSession(null);
      queryClient.clear();
    },
    onError: (error) => {
      console.error('Logout failed:', error);
    },
  });

  const refreshSessionMutation = useMutation({
    mutationFn: authApi.refreshSession,
    onSuccess: (data) => {
      setUser(data.user);
      setSession(data.session);
      queryClient.setQueryData(['auth', 'session'], data);
    },
    onError: () => {
      setUser(null);
      setSession(null);
      queryClient.clear();
    },
  });

  const login = async (email: string, password: string) => {
    await loginMutation.mutateAsync({ email, password });
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  const signup = async (data: {
    email: string;
    password: string;
    display_name: string;
    username?: string;
  }) => {
    await signupMutation.mutateAsync(data);
  };

  const refreshSession = async () => {
    await refreshSessionMutation.mutateAsync();
  };

  const value: AuthContextType = {
    user,
    session,
    isLoading: isLoading || loginMutation.isPending || signupMutation.isPending,
    isAuthenticated: !!user,
    login,
    logout,
    signup,
    refreshSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}