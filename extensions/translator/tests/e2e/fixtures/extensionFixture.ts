import { test as base } from '@playwright/test';
import type { Page } from '@playwright/test';
import { LocalStorageHelper } from '../utils/localStorage';
import { MultiWindowHelper } from '../utils/multiWindow';
import { setupAzureMocksForContext } from '../mocks/azureMockSetup';

/**
 * Extended Playwright fixtures for testing ChurchTools extensions with Real ChurchTools Integration
 *
 * Provides pre-configured pages, window management, and localStorage helpers
 *
 * IMPORTANT: Azure SDK is mocked, but ChurchTools API calls are REAL
 * - Azure SDK: Mocked at context level (stable, no costs, fast)
 * - ChurchTools: Real API calls to test instance (authentic integration testing)
 *
 * This approach allows us to test real auth, persistence, and API compatibility
 * while avoiding Azure costs and rate limits.
 */
export type ExtensionFixtures = {
  /**
   * Pre-configured page for the extension
   * Azure mocks are already set up at the context level
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
 *   // Azure mocks are automatically set up
 *   // ChurchTools API calls are REAL
 *   await extensionPage.goto('/');
 * });
 * ```
 */
export const test = base.extend<ExtensionFixtures>({
  // Set up Azure mocks at the context level BEFORE creating any pages
  // ChurchTools API is NOT mocked - tests use real instance
  context: async ({ context }, use) => {
    // Only mock Azure SDK (ChurchTools is real)
    await setupAzureMocksForContext(context, {
      azureScenario: 'basic',
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
