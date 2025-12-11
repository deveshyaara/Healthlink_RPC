'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { AuthLoading } from '@/components/auth-loading';
import { authApi } from '@/lib/api-client';
import { getApiBaseUrl } from '@/lib/env-utils';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'patient' | 'doctor' | 'admin';
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string; role: string }) => Promise<void>;
  logout: () => void;
  loading: boolean;
  isAuthenticated: boolean;
  token: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to store token
const storeToken = (token: string) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('auth_token', token);
    document.cookie = `auth_token=${token}; path=/; max-age=86400; samesite=strict`;
  }
};

// Helper function to retrieve token
const getStoredToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('auth_token');
  }
  return null;
};

// Helper function to clear token
const clearStoredToken = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_token');
    document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  // Initialize auth state from stored token
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = getStoredToken();
      if (storedToken) {
        try {
          const apiUrl = getApiBaseUrl();
          const response = await fetch(
            `${apiUrl}/api/auth/me`,
            {
              headers: {
                'Authorization': `Bearer ${storedToken}`,
              },
            },
          );

          if (response.ok) {
            const jsonData = await response.json();
            // Backend returns { status, data: { user } }
            const userData = jsonData.data?.user || jsonData.user;
            if (userData) {
              setUser(userData);
              setToken(storedToken);
            } else {
              clearStoredToken();
            }
          } else {
            // Token is invalid, clear it
            clearStoredToken();
          }
        } catch (error) {
          console.error('Auth verification failed:', error);
          clearStoredToken();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      console.log('[Auth Context] Starting login for:', email);
      const response = await authApi.login({ email, password });
      console.log('[Auth Context] Login response:', response);
      console.log('[Auth Context] response.token:', response.token);
      console.log('[Auth Context] response.user:', response.user);

      if (response.token && response.user) {
        storeToken(response.token);
        setToken(response.token);
        setUser(response.user);
        
        console.log('[Auth Context] Token stored, user set');

        toast({
          title: 'Login successful',
          description: `Welcome back, ${response.user.name}!`,
        });

        // Role-based redirection
        const role = response.user.role?.toLowerCase();
        if (role === 'doctor') {
          router.push('/dashboard/doctor');
        } else if (role === 'patient') {
          router.push('/dashboard/patient');
        } else if (role === 'admin') {
          router.push('/dashboard');
        } else {
          // Default fallback for unknown roles
          router.push('/dashboard');
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      toast({
        title: 'Login failed',
        description: errorMessage,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const register = async (data: { name: string; email: string; password: string; role: string }) => {
    try {
      console.log('[Auth Context] Starting registration for:', data.email);
      const response = await authApi.register(data);
      console.log('[Auth Context] Register response:', response);
      console.log('[Auth Context] response.token:', response.token);
      console.log('[Auth Context] response.user:', response.user);

      if (response.token && response.user) {
        storeToken(response.token);
        setToken(response.token);
        setUser(response.user);
        
        console.log('[Auth Context] Token stored, user set');

        toast({
          title: 'Registration successful',
          description: `Welcome to HealthLink Pro, ${data.name}!`,
        });

        // Role-based redirection
        const role = response.user.role?.toLowerCase();
        if (role === 'doctor') {
          router.push('/dashboard/doctor');
        } else if (role === 'patient') {
          router.push('/dashboard/patient');
        } else if (role === 'admin') {
          router.push('/dashboard');
        } else {
          // Default fallback
          router.push('/dashboard');
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      toast({
        title: 'Registration failed',
        description: errorMessage,
        variant: 'destructive',
      });
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      clearStoredToken();
      setUser(null);
      setToken(null);
      toast({
        title: 'Logged out',
        description: 'You have been successfully logged out.',
      });
      router.push('/login');
    }
  };

  const value = {
    user,
    token,
    login,
    register,
    logout,
    loading,
    isAuthenticated: !!user,
  };

  // Show loading screen while checking authentication
  if (loading) {
    return <AuthLoading />;
  }

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
