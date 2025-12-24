/**
 * Centralized Authentication Utilities
 * Single source of truth for token management
 */

import { safeStorage } from './safe-storage';

const AUTH_TOKEN_KEY = 'auth_token';
const USER_KEY = 'user';

export const authUtils = {
  /**
   * Get authentication token from storage
   * Safe for both SSR and client-side
   */
  getToken(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }
    return safeStorage.getItem(AUTH_TOKEN_KEY);
  },

  /**
   * Store authentication token
   */
  setToken(token: string): boolean {
    return safeStorage.setItem(AUTH_TOKEN_KEY, token);
  },

  /**
   * Remove authentication token
   */
  removeToken(): boolean {
    return safeStorage.removeItem(AUTH_TOKEN_KEY);
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getToken();
  },

  /**
   * Get authorization header for API requests
   */
  getAuthHeader(): HeadersInit {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  },

  /**
   * User storage helpers
   */
  setUser(user: Record<string, any> | null): boolean {
    if (typeof window === 'undefined') return false;
    try {
      if (user === null) {
        localStorage.removeItem(USER_KEY);
        return true;
      }
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      return true;
    } catch (error) {
      return false;
    }
  },

  getUser(): Record<string, any> | null {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem(USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      return null;
    }
  },

  removeUser(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      localStorage.removeItem(USER_KEY);
      return true;
    } catch (error) {
      return false;
    }
  },

  getUserId(): string | null {
    const user = this.getUser();
    if (!user) return null;
    return user.id || user.userId || null;
  },
};
