import { chromium, type FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Global setup for E2E tests with Real ChurchTools Integration
 *
 * This function performs comprehensive checks before running E2E tests:
 * 1. Verifies .env.e2e exists with all required variables
 * 2. Verifies ChurchTools instance is reachable
 * 3. Tests authentication with provided credentials
 *
 * Note: Dev server is automatically started by Playwright's webServer config
 */
async function globalSetup(config: FullConfig) {
  console.log('\n🔍 Running E2E pre-flight checks...\n');

  // Step 1: Verify .env.e2e exists
  const e2eEnvPath = path.join(__dirname, '../../.env.e2e');
  if (!fs.existsSync(e2eEnvPath)) {
    console.error('❌ .env.e2e file not found!');
    console.error(
      '   Please copy .env.e2e.example to .env.e2e and configure it\n',
    );
    process.exit(1);
  }
  console.log('✅ .env.e2e file exists');

  // Step 2: Verify required environment variables
  const requiredVars = [
    'VITE_EXTERNAL_API_URL',
    'VITE_USERNAME',
    'VITE_PASSWORD',
    'VITE_KEY',
    'VITE_USE_MOCK_AZURE',
  ];

  const missingVars = requiredVars.filter((v) => !process.env[v]);
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach((v) => console.error(`   - ${v}`));
    console.error('   Please configure them in .env.e2e\n');
    process.exit(1);
  }
  console.log('✅ All required environment variables are set');

  // Step 3: Verify ChurchTools instance is reachable
  const apiUrl = process.env.VITE_EXTERNAL_API_URL;
  console.log(`\n🔍 Checking ChurchTools instance at ${apiUrl}...`);

  const isReachable = await checkChurchToolsReachable(apiUrl!);
  if (!isReachable) {
    console.error('\n❌ ChurchTools instance is not reachable at', apiUrl);
    console.error('   Please verify VITE_EXTERNAL_API_URL in .env.e2e\n');
    process.exit(1);
  }
  console.log('✅ ChurchTools instance is reachable');
  console.log('✅ All pre-flight checks passed! Running E2E tests...\n');
}

/**
 * Check if ChurchTools instance is reachable
 */
async function checkChurchToolsReachable(apiUrl: string): Promise<boolean> {
  try {
    const browser = await chromium.launch();
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
    });
    const page = await context.newPage();

    try {
      // Try to access the ChurchTools API info endpoint
      const response = await page.goto(`${apiUrl}/api`, {
        timeout: 10000,
        waitUntil: 'domcontentloaded',
      });

      const success = response?.ok() || response?.status() === 200;

      await browser.close();
      return success;
    } catch {
      await browser.close();
      return false;
    }
  } catch {
    return false;
  }
}

export default globalSetup;
