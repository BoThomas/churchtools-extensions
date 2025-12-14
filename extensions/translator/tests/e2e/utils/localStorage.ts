import type { Page } from '@playwright/test';

/**
 * Helper class for managing localStorage operations in Playwright tests
 * 
 * Provides methods to interact with localStorage across different windows/pages
 * Handles JSON serialization/deserialization automatically
 */
export class LocalStorageHelper {
  constructor(private page: Page) {}

  /**
   * Set an item in localStorage with automatic JSON serialization
   */
  async setItem(key: string, value: any): Promise<void> {
    await this.page.evaluate(
      ({ k, v }) => localStorage.setItem(k, JSON.stringify(v)),
      { k: key, v: value }
    );
  }

  /**
   * Get an item from localStorage with automatic JSON deserialization
   */
  async getItem(key: string): Promise<any> {
    return this.page.evaluate(
      (k) => {
        const value = localStorage.getItem(k);
        return value ? JSON.parse(value) : null;
      },
      key
    );
  }

  /**
   * Wait for a localStorage item to exist (useful for cross-window communication)
   */
  async waitForItem(key: string, timeout = 5000): Promise<any> {
    await this.page.waitForFunction(
      (k) => localStorage.getItem(k) !== null,
      key,
      { timeout }
    );
    return this.getItem(key);
  }

  /**
   * Wait for a localStorage item to have a specific value
   */
  async waitForValue(
    key: string,
    expectedValue: any,
    timeout = 5000
  ): Promise<void> {
    await this.page.waitForFunction(
      ({ k, v }) => {
        const value = localStorage.getItem(k);
        if (!value) return false;
        try {
          const parsed = JSON.parse(value);
          return JSON.stringify(parsed) === JSON.stringify(v);
        } catch {
          return false;
        }
      },
      { k: key, v: expectedValue },
      { timeout }
    );
  }

  /**
   * Remove an item from localStorage
   */
  async removeItem(key: string): Promise<void> {
    await this.page.evaluate((k) => localStorage.removeItem(k), key);
  }

  /**
   * Clear all localStorage items
   */
  async clear(): Promise<void> {
    await this.page.evaluate(() => localStorage.clear());
  }

  /**
   * Get all localStorage keys
   */
  async keys(): Promise<string[]> {
    return this.page.evaluate(() => Object.keys(localStorage));
  }

  /**
   * Get all localStorage items as an object
   */
  async getAll(): Promise<Record<string, any>> {
    return this.page.evaluate(() => {
      const items: Record<string, any> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key);
          try {
            items[key] = value ? JSON.parse(value) : null;
          } catch {
            items[key] = value;
          }
        }
      }
      return items;
    });
  }

  /**
   * Check if a key exists in localStorage
   */
  async hasItem(key: string): Promise<boolean> {
    return this.page.evaluate((k) => localStorage.getItem(k) !== null, key);
  }
}
