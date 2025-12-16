import { type Page } from '@playwright/test';

/**
 * ChurchTools Authentication Helper for E2E Tests
 *
 * In dev environment, churchtoolsClient needs to call /api/login explicitly.
 */

/**
 * Authenticates with ChurchTools by calling the login API
 */
export async function authenticateChurchTools(page: Page): Promise<void> {
  const username = process.env.VITE_USERNAME;
  const password = process.env.VITE_PASSWORD;

  if (!username || !password) {
    throw new Error('Missing ChurchTools credentials in .env.e2e');
  }

  // Call the login API via the vite proxy
  const response = await page.request.post('/api/login', {
    data: {
      username,
      password,
    },
  });

  if (!response.ok()) {
    throw new Error(
      `Login failed: ${response.status()} ${response.statusText()}`,
    );
  }

  console.log(`✅ Logged in as ${username}`);
}
