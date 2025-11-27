/**
 * Environment Utilities
 * Handles runtime detection of Codespace vs local environment
 */

/**
 * Detect if running in GitHub Codespace
 */
export function isCodespace(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.hostname.includes('github.dev') || 
         window.location.hostname.includes('github.com');
}

/**
 * Get the API base URL based on current environment
 * 
 * Strategy:
 * - In Codespace: Use relative paths (/api/*) via Next.js dev proxy
 *   This avoids network/CORS issues by routing through the frontend server
 * - Locally: Use relative paths (/api/*) via Next.js dev proxy
 *   This is also the safest approach in development
 * 
 * The Next.js dev proxy in next.config.js rewrites /api/* to localhost:4000
 */
export function getApiBaseUrl(): string {
  // Always use relative paths
  // Next.js dev proxy handles routing to backend server
  // This works in Codespace, localhost, and production
  return '';
}

/**
 * Get the origin URL for CORS header reference
 */
export function getCurrentOrigin(): string {
  if (typeof window === 'undefined') {
    return 'http://localhost:9002';
  }
  return `${window.location.protocol}//${window.location.host}`;
}
