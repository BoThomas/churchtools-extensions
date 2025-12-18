import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

// Load .env.e2e if it exists and parse it into process.env
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const e2eEnvPath = path.join(__dirname, '.env.e2e');
if (fs.existsSync(e2eEnvPath)) {
  const envContent = fs.readFileSync(e2eEnvPath, 'utf-8');
  envContent.split('\n').forEach((line) => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();
      process.env[key] = value;
    }
  });
} else {
  console.warn(
    '⚠️  No .env.e2e file found. Copy .env.e2e.example to .env.e2e and configure it.',
  );
}

/**
 * Playwright configuration for Translator Extension E2E Tests
 *
 * E2E tests now use REAL ChurchTools instance for authentic integration testing
 * while keeping Azure SDK mocked for stability and cost savings.
 *
 * E2E tests are extension-specific since each extension has:
 * - Different dev server port
 * - Different mocks and fixtures
 * - Different UI structure
 *
 * Tests are run manually only (no CI/CD integration)
 *
 * Prerequisites:
 * 1. Create .env.e2e from .env.e2e.example
 * 2. Configure ChurchTools test instance credentials
 * 3. Ensure translator-e2e-test module exists in testinstance.church.tools
 * 4. Ensure e2e-test user has appropriate permissions
 *
 * Usage:
 *   cd extensions/translator && pnpm test:e2e
 *   (Dev server starts automatically on port 5163)
 */
export default defineConfig({
  // Test directory
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',

  // Global setup (runs after webServer is ready)
  globalSetup: './tests/e2e/global-setup.ts',

  // Automatically start dev server before tests
  webServer: {
    command: 'pnpm vite --mode e2e --port 5163',
    port: 5163,
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
    timeout: 5000, // 5 seconds for server to start
  },

  // Single worker
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,

  // Reporting - unified test-results structure
  reporter: [
    ['html', { outputFolder: 'test-results/playwright/report' }],
    ['list'],
  ],

  // Test results output directory
  outputDir: 'test-results/playwright/traces',

  // Test settings
  use: {
    // E2E dev server on dedicated port (automatically started by Playwright)
    baseURL: 'https://localhost:5163',

    // Tracing and debugging - on-demand via PLAYWRIGHT_TRACE env variable
    // Set PLAYWRIGHT_TRACE=1 in .env.e2e for full debugging artifacts
    trace: process.env.PLAYWRIGHT_TRACE ? 'on' : 'off',
    screenshot: process.env.PLAYWRIGHT_TRACE ? 'on' : 'off',
    video: process.env.PLAYWRIGHT_TRACE ? 'on' : 'off',

    // Timeouts - increased for real API calls
    actionTimeout: 15000, // Increased from 10s for real API operations
    navigationTimeout: 20000, // Time for page loads with real auth

    // Ignore HTTPS errors (self-signed cert in dev)
    ignoreHTTPSErrors: true,
  },

  // Test timeout - increased for real ChurchTools API calls
  timeout: 60000, // Increased from 30s to accommodate real API operations

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
