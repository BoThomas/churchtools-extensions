import { test as base, expect } from '@playwright/test';
import type { Page, BrowserContext } from '@playwright/test';
import { LocalStorageHelper } from '../utils/localStorage';
import { MultiWindowHelper } from '../utils/multiWindow';
import { setupE2EMocksForContext } from '../mocks/mockSetup';

/**
 * Extended Playwright fixtures for testing ChurchTools extensions
 *
 * Provides pre-configured pages, window management, and localStorage helpers
 *
 * IMPORTANT: Mocks are set up at the CONTEXT level, so they apply to ALL pages
 * (including popup windows) created in the test. This ensures no real API calls
 * are made, even before tests explicitly call setupE2EMocks().
 */
export type ExtensionFixtures = {
  /**
   * Pre-configured page for the extension
   * Mocks are already set up at the context level
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
 *   // Mocks are automatically set up before any page navigation
 *   await extensionPage.goto('/');
 * });
 * ```
 */
export const test = base.extend<ExtensionFixtures>({
  // Set up API mocks at the context level BEFORE creating any pages
  // This is CRITICAL - mocks MUST be set up at context level to intercept
  // ALL requests including those made during page initialization
  context: async ({ context }, use) => {
    // Set up comprehensive mocking for ALL API endpoints
    await setupE2EMocksForContext(context, {
      azureScenario: 'basic',
      mockChurchTools: true,
    });

    await use(context);
  },

  // Pre-configured page for extension
  extensionPage: async ({ page }, use) => {
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
