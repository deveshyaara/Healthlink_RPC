/**
 * Safe Storage Utility
 * Provides error-safe localStorage operations with fallbacks
 */

const isClient = () => typeof window !== 'undefined';

class SafeStorage {
  private static isAvailable(): boolean {
    if (!isClient()) {
      return false;
    }

    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  static getItem(key: string): string | null {
    if (!this.isAvailable()) {
      return null;
    }

    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error(`Failed to get item "${key}" from localStorage:`, error);
      return null;
    }
  }

  static setItem(key: string, value: string): boolean {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.error(`Failed to set item "${key}" in localStorage:`, error);
      return false;
    }
  }

  static removeItem(key: string): boolean {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Failed to remove item "${key}" from localStorage:`, error);
      return false;
    }
  }

  static getJSON<T>(key: string, defaultValue: T): T {
    const item = this.getItem(key);
    if (!item) {
      return defaultValue;
    }

    try {
      return JSON.parse(item) as T;
    } catch (error) {
      console.error(`Failed to parse JSON from localStorage key "${key}":`, error);
      return defaultValue;
    }
  }

  static setJSON<T>(key: string, value: T): boolean {
    try {
      const json = JSON.stringify(value);
      return this.setItem(key, json);
    } catch (error) {
      console.error(`Failed to stringify JSON for localStorage key "${key}":`, error);
      return false;
    }
  }

  static clear(): boolean {
    if (!this.isAvailable()) {
      return false;
    }

    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
      return false;
    }
  }
}

export const safeStorage = SafeStorage;
