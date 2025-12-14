/**
 * Mock Injection Strategy for E2E Tests
 * 
 * Since Playwright runs in a real browser, we can't use Vitest mocks directly.
 * Instead, we use page.route() to intercept network requests and return mock data.
 * 
 * This approach allows us to:
 * - Mock Azure Speech SDK API calls
 * - Mock ChurchTools API calls
 * - Test real browser behavior without external dependencies
 */

import type { Page, Route } from '@playwright/test';

/**
 * Mock Azure Speech SDK API calls
 * 
 * Intercepts requests to Azure Cognitive Services and returns mock translation data
 */
export async function mockAzureSpeechAPI(page: Page, scenario: 'basic' | 'multiLanguage' | 'error' = 'basic') {
  await page.route('**/cognitiveservices.azure.com/**', async (route: Route) => {
    const url = route.request().url();
    
    // Mock token endpoint
    if (url.includes('/issuetoken')) {
      await route.fulfill({
        status: 200,
        contentType: 'text/plain',
        body: 'mock-token-12345',
      });
      return;
    }
    
    // Mock WebSocket connection (Speech SDK uses WebSocket for real-time translation)
    // Note: Playwright doesn't intercept WebSockets directly, so we'll need to
    // mock at the SDK level instead (see below)
    
    await route.continue();
  });
}

/**
 * Mock ChurchTools KV Store API calls
 * 
 * Intercepts requests to ChurchTools persistence API and returns mock data
 */
export async function mockChurchToolsAPI(page: Page) {
  const kvStore = new Map<string, any>();
  
  await page.route('**/api/modules/**', async (route: Route) => {
    const url = route.request().url();
    const method = route.request().method();
    
    // GET module
    if (method === 'GET' && url.includes('/modules/')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: 1,
            key: 'translator',
            categories: []
          }
        }),
      });
      return;
    }
    
    // POST create category
    if (method === 'POST' && url.includes('/categories')) {
      const postData = route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: Math.floor(Math.random() * 10000),
            key: postData.key,
            ...postData
          }
        }),
      });
      return;
    }
    
    await route.continue();
  });
}

/**
 * Alternative approach: Inject mock SDK via page.addInitScript()
 * 
 * This is more reliable for E2E tests as it mocks the SDK at the JavaScript level
 * before the app loads.
 */
export async function injectMockAzureSDK(page: Page, scenario: string = 'basic') {
  await page.addInitScript((scenarioName) => {
    // Store scenario in window for the app to use
    (window as any).__MOCK_AZURE_SCENARIO__ = scenarioName;
    (window as any).__USE_MOCK_AZURE__ = true;
  }, scenario);
}

/**
 * Inject mock ChurchTools KV store
 */
export async function injectMockChurchTools(page: Page) {
  await page.addInitScript(() => {
    (window as any).__USE_MOCK_PERSISTENCE__ = true;
  });
}

/**
 * Setup all mocks for E2E testing
 * 
 * Call this in beforeEach() of your E2E tests
 */
export async function setupE2EMocks(page: Page, options: {
  azureScenario?: string;
  mockChurchTools?: boolean;
} = {}) {
  const { azureScenario = 'basic', mockChurchTools = true } = options;
  
  await injectMockAzureSDK(page, azureScenario);
  
  if (mockChurchTools) {
    await injectMockChurchTools(page);
    await mockChurchToolsAPI(page);
  }
}
