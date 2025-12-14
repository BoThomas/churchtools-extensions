import { test as base, expect } from '@playwright/test';
import type { Page, BrowserContext } from '@playwright/test';
import { LocalStorageHelper } from '../utils/localStorage';
import { MultiWindowHelper } from '../utils/multiWindow';

/**
 * Extended Playwright fixtures for testing ChurchTools extensions
 * 
 * Provides pre-configured pages, window management, and localStorage helpers
 */
export type ExtensionFixtures = {
  /**
   * Pre-configured page for the extension with networkidle state
   */
  extensionPage: Page;
  
  /**
   * Helper for managing multiple windows (e.g., presentation windows)
   */
  windowHelper: MultiWindowHelper;
  
  /**
   * Helper for localStorage operations on the main page
   */
  localStorage: LocalStorageHelper;
};

/**
 * Extended test with extension-specific fixtures
 * 
 * Usage:
 * ```typescript
 * import { test, expect } from './fixtures/extensionFixture';
 * 
 * test('my test', async ({ extensionPage, windowHelper, localStorage }) => {
 *   // Test code here
 * });
 * ```
 */
export const test = base.extend<ExtensionFixtures>({
  // Pre-configured page for extension
  extensionPage: async ({ page }, use) => {
    // Navigate to the extension
    await page.goto('/');
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
    
    // Wait for Vue app to be mounted (look for #app having content)
    await page.waitForSelector('#app > *', { timeout: 10000 });
    
    await use(page);
  },

  // Multi-window helper
  windowHelper: async ({ context }, use) => {
    const helper = new MultiWindowHelper(context);
    await use(helper);
    
    // Cleanup: close all tracked windows
    await helper.closeAll();
  },

  // localStorage helper for main page
  localStorage: async ({ page }, use) => {
    const helper = new LocalStorageHelper(page);
    await use(helper);
  },
});

// Re-export expect for convenience
export { expect } from '@playwright/test';
