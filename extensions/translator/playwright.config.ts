import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Translator Extension E2E Tests
 *
 * E2E tests are extension-specific since each extension has:
 * - Different dev server port
 * - Different mocks and fixtures
 * - Different UI structure
 *
 * Tests are run manually only (no CI/CD integration)
 *
 * Usage:
 *   cd extensions/translator && pnpm test:e2e
 */
export default defineConfig({
  // Test directory
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',

  // Global setup
  globalSetup: './tests/e2e/global-setup.ts',

  // Single worker
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,

  // Reporting
  reporter: [['html', { outputFolder: 'playwright-report' }], ['list']],

  // Test settings
  use: {
    // Translator dev server port (from translator/.env)
    baseURL: 'https://localhost:5173',

    // Tracing and debugging
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // Timeouts
    actionTimeout: 10000,

    // Ignore HTTPS errors (self-signed cert in dev)
    ignoreHTTPSErrors: true,
  },

  // Test timeout
  timeout: 30000,

  // Browser
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        hasTouch: false,
      },
    },
  ],
});
