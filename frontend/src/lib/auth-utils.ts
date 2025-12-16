/**
 * Centralized Authentication Utilities
 * Single source of truth for token management
 */

import { safeStorage } from './safe-storage';

const AUTH_TOKEN_KEY = 'auth_token';

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
  }
};
