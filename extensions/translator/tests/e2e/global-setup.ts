import { chromium, type FullConfig } from '@playwright/test';

/**
 * Global setup for E2E tests
 *
 * This function checks if the dev server is running on https://localhost:5173
 * If not, it exits with a warning.
 */
async function globalSetup(config: FullConfig) {
  const baseURL = (config as any).use?.baseURL || 'https://localhost:5173';

  console.log('\n🔍 Checking if dev server is running...');

  const isRunning = await checkServerRunning(baseURL);

  if (!isRunning) {
    console.error('\n❌ Dev server is not running at', baseURL);
    console.error('Please start the dev server manually with: pnpm dev\n');
    process.exit(1);
  }

  console.log('✅ Dev server is running at', baseURL);
}

/**
 * Check if the dev server is running by attempting to connect
 */
async function checkServerRunning(url: string): Promise<boolean> {
  try {
    const browser = await chromium.launch();
    const context = await browser.newContext({
      ignoreHTTPSErrors: true,
    });
    const page = await context.newPage();

    try {
      const response = await page.goto(url, {
        timeout: 5000,
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
