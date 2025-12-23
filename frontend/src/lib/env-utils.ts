/**
 * Environment Utility Functions
 * Handles API base URL configuration for frontend
 */

import { logger } from './logger';

/**
 * Validates required environment variables
 * Should be called at app initialization
 */
export function validateEnvironment(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // In production, NEXT_PUBLIC_API_URL must be set
  if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_API_URL) {
    errors.push('NEXT_PUBLIC_API_URL is not set');
  }

  // Validate API URL format if provided
  if (process.env.NEXT_PUBLIC_API_URL) {
    try {
      new URL(process.env.NEXT_PUBLIC_API_URL);
    } catch {
      errors.push(`Invalid NEXT_PUBLIC_API_URL format: ${process.env.NEXT_PUBLIC_API_URL}`);
    }
  }

  if (errors.length > 0) {
    logger.error('Environment validation failed:', errors);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get the API base URL from environment variables
 * Falls back to localhost:3000 in development
 * Automatically detects GitHub Codespaces environment
 */
export function getApiBaseUrl(): string {
  // Check for explicit environment variable first
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  // Auto-detect GitHub Codespaces
  if (typeof window !== 'undefined' && typeof window.location !== 'undefined') {
    const hostname = window.location.hostname;

    // Check if running in Codespaces (hostname ends with app.github.dev)
    if (hostname.includes('app.github.dev')) {
      // Extract codespace name from hostname
      const match = hostname.match(/^(.+)-\d+\.app\.github\.dev$/);
      if (match) {
        const codespaceName = match[1];
        return `https://${codespaceName}-3000.app.github.dev`;
      }
    }
  }

  // Fall back to localhost for local development
  if (typeof window !== 'undefined') {
    return 'http://localhost:4000';
  }

  // Server-side
  return process.env.API_URL || 'http://localhost:4000';
}

/**
 * Get the WebSocket URL from environment variables
 */
export function getWebSocketUrl(): string {
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4001';
  }

  return process.env.NEXT_PUBLIC_WS_URL || process.env.WS_URL || 'ws://localhost:4001';
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Check if running in production mode
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}
