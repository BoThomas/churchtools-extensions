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

import type { Page, Route, BrowserContext } from '@playwright/test';

/**
 * Mock Azure Speech SDK API calls
 *
 * Intercepts requests to Azure Cognitive Services and returns mock translation data
 */
export async function mockAzureSpeechAPI(
  page: Page,
  scenario: 'basic' | 'multiLanguage' | 'error' = 'basic',
) {
  await page.route(
    '**/cognitiveservices.azure.com/**',
    async (route: Route) => {
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
    },
  );
}

/**
 * In-memory storage for mock ChurchTools API
 */
class MockKVStore {
  private modules = new Map<string, any>();
  private categories = new Map<number, any>();
  private values = new Map<number, Map<number, any>>();
  private nextModuleId = 1;
  private nextCategoryId = 1;
  private nextValueId = 1;

  reset() {
    this.modules.clear();
    this.categories.clear();
    this.values.clear();
    this.nextModuleId = 1;
    this.nextCategoryId = 1;
    this.nextValueId = 1;
  }

  // Module operations
  getModules() {
    return Array.from(this.modules.values());
  }

  getModule(shorty: string) {
    return this.modules.get(shorty);
  }

  createModule(data: any) {
    const module = {
      id: this.nextModuleId++,
      ...data,
    };
    this.modules.set(data.shorty, module);
    return module;
  }

  // Category operations
  getCategories(moduleId: number) {
    return Array.from(this.categories.values()).filter(
      (cat) => cat.customModuleId === moduleId,
    );
  }

  getCategory(categoryId: number) {
    return this.categories.get(categoryId);
  }

  createCategory(moduleId: number, data: any) {
    const category = {
      id: this.nextCategoryId++,
      customModuleId: moduleId,
      ...data,
    };
    this.categories.set(category.id, category);
    return category;
  }

  updateCategory(categoryId: number, data: any) {
    const existing = this.categories.get(categoryId);
    if (!existing) return null;
    const updated = { ...existing, ...data };
    this.categories.set(categoryId, updated);
    return updated;
  }

  deleteCategory(categoryId: number) {
    this.categories.delete(categoryId);
    this.values.delete(categoryId);
  }

  // Value operations
  getValues(categoryId: number) {
    const categoryValues = this.values.get(categoryId);
    return categoryValues ? Array.from(categoryValues.values()) : [];
  }

  getValue(categoryId: number, valueId: number) {
    return this.values.get(categoryId)?.get(valueId);
  }

  createValue(categoryId: number, data: any) {
    if (!this.values.has(categoryId)) {
      this.values.set(categoryId, new Map());
    }
    const value = {
      id: this.nextValueId++,
      customModuleCategoryId: categoryId,
      ...data,
    };
    this.values.get(categoryId)!.set(value.id, value);
    return value;
  }

  updateValue(categoryId: number, valueId: number, data: any) {
    const existing = this.values.get(categoryId)?.get(valueId);
    if (!existing) return null;
    const updated = { ...existing, ...data };
    this.values.get(categoryId)!.set(valueId, updated);
    return updated;
  }

  deleteValue(categoryId: number, valueId: number) {
    this.values.get(categoryId)?.delete(valueId);
  }
}

/**
 * Mock ChurchTools KV Store API calls
 *
 * Intercepts ALL requests to ChurchTools API and returns mock data
 * with proper state management across CRUD operations.
 *
 * This includes:
 * - Authentication endpoints (/whoami, /csrftoken)
 * - Custom Module endpoints (modules, categories, values)
 *
 * NO real ChurchTools API calls will be made during E2E tests.
 */
export async function mockChurchToolsAPI(page: Page) {
  const kvStore = new MockKVStore();

  // Intercept ALL ChurchTools API calls (including auth endpoints)
  await page.route('**/api/**', async (route: Route) => {
    const url = route.request().url();
    const method = route.request().method();

    // Mock authentication endpoints
    // GET /api/whoami - Current user info
    if (method === 'GET' && url.match(/\/api\/whoami/)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          firstName: 'Mock',
          lastName: 'User',
          email: 'mock@example.com',
          permissions: ['churchcore:administer persons'],
        }),
      });
      return;
    }

    // GET /api/csrftoken - CSRF token for old API
    if (method === 'GET' && url.match(/\/api\/csrftoken/)) {
      await route.fulfill({
        status: 200,
        contentType: 'text/plain',
        body: 'mock-csrf-token-12345',
      });
      return;
    }

    // GET all modules
    if (method === 'GET' && url.match(/\/api\/custommodules\/?$/)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(kvStore.getModules()),
      });
      return;
    }

    // POST create module
    if (method === 'POST' && url.match(/\/api\/custommodules\/?$/)) {
      const postData = route.request().postDataJSON();
      const module = kvStore.createModule(postData);
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(module),
      });
      return;
    }

    // GET categories for a module
    if (
      method === 'GET' &&
      url.match(/\/api\/custommodules\/(\d+)\/categories\/?$/)
    ) {
      const match = url.match(/\/api\/custommodules\/(\d+)\/categories\/?$/);
      const moduleId = parseInt(match![1]);
      const categories = kvStore.getCategories(moduleId);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(categories),
      });
      return;
    }

    // POST create category
    if (
      method === 'POST' &&
      url.match(/\/api\/custommodules\/(\d+)\/categories\/?$/)
    ) {
      const match = url.match(/\/api\/custommodules\/(\d+)\/categories\/?$/);
      const moduleId = parseInt(match![1]);
      const postData = route.request().postDataJSON();
      const category = kvStore.createCategory(moduleId, postData);
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(category),
      });
      return;
    }

    // PUT update category
    if (
      method === 'PUT' &&
      url.match(/\/api\/custommodules\/\d+\/categories\/(\d+)\/?$/)
    ) {
      const match = url.match(
        /\/api\/custommodules\/\d+\/categories\/(\d+)\/?$/,
      );
      const categoryId = parseInt(match![1]);
      const putData = route.request().postDataJSON();
      const category = kvStore.updateCategory(categoryId, putData);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(category),
      });
      return;
    }

    // DELETE category
    if (
      method === 'DELETE' &&
      url.match(/\/api\/custommodules\/\d+\/categories\/(\d+)\/?$/)
    ) {
      const match = url.match(
        /\/api\/custommodules\/\d+\/categories\/(\d+)\/?$/,
      );
      const categoryId = parseInt(match![1]);
      kvStore.deleteCategory(categoryId);
      await route.fulfill({
        status: 204,
        body: '',
      });
      return;
    }

    // GET values for a category
    if (
      method === 'GET' &&
      url.match(/\/api\/custommodules\/\d+\/categories\/(\d+)\/values\/?$/)
    ) {
      const match = url.match(
        /\/api\/custommodules\/\d+\/categories\/(\d+)\/values\/?$/,
      );
      const categoryId = parseInt(match![1]);
      const values = kvStore.getValues(categoryId);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(values),
      });
      return;
    }

    // POST create value
    if (
      method === 'POST' &&
      url.match(/\/api\/custommodules\/\d+\/categories\/(\d+)\/values\/?$/)
    ) {
      const match = url.match(
        /\/api\/custommodules\/\d+\/categories\/(\d+)\/values\/?$/,
      );
      const categoryId = parseInt(match![1]);
      const postData = route.request().postDataJSON();
      const value = kvStore.createValue(categoryId, postData);
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(value),
      });
      return;
    }

    // PUT update value
    if (
      method === 'PUT' &&
      url.match(
        /\/api\/custommodules\/\d+\/categories\/(\d+)\/values\/(\d+)\/?$/,
      )
    ) {
      const match = url.match(
        /\/api\/custommodules\/\d+\/categories\/(\d+)\/values\/(\d+)\/?$/,
      );
      const categoryId = parseInt(match![1]);
      const valueId = parseInt(match![2]);
      const putData = route.request().postDataJSON();
      const value = kvStore.updateValue(categoryId, valueId, putData);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(value),
      });
      return;
    }

    // DELETE value
    if (
      method === 'DELETE' &&
      url.match(/\/api\/custommodules\/\d+\/categories\/\d+\/values\/(\d+)\/?$/)
    ) {
      const match = url.match(
        /\/api\/custommodules\/\d+\/categories\/\d+\/values\/(\d+)\/?$/,
      );
      const categoryId = parseInt(match![1]);
      const valueId = parseInt(match![2]);
      kvStore.deleteValue(categoryId, valueId);
      await route.fulfill({
        status: 204,
        body: '',
      });
      return;
    }

    // If not a matched endpoint, continue (this allows other API calls to go through if needed)
    // In production, you might want to be more strict and reject unknown calls
    console.warn(`[E2E Mock] Unhandled API call: ${method} ${url}`);
    await route.abort('failed');
  });
}

/**
 * Alternative approach: Inject mock SDK via page.addInitScript()
 *
 * This is more reliable for E2E tests as it mocks the SDK at the JavaScript level
 * before the app loads.
 */
export async function injectMockAzureSDK(
  page: Page,
  scenario: string = 'basic',
) {
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
 * Setup all mocks for E2E testing at the CONTEXT level
 *
 * This function configures Playwright to intercept ALL external API calls
 * at the browser context level, which means it applies to ALL pages
 * (including popups/new windows) created in that context.
 *
 * This is the CORRECT way to set up mocks to ensure no real API calls
 * are made even before tests navigate to pages.
 *
 * IMPORTANT: Call this in a context fixture or at the beginning of test setup
 */
export async function setupE2EMocksForContext(
  context: BrowserContext,
  options: {
    azureScenario?: string;
    mockChurchTools?: boolean;
  } = {},
) {
  const { azureScenario = 'basic', mockChurchTools = true } = options;

  if (mockChurchTools) {
    await mockChurchToolsAPIForContext(context);
  }

  // Inject init scripts for all pages created in this context
  await context.addInitScript((scenarioName) => {
    (window as any).__USE_MOCK_AZURE__ = true;
    (window as any).__MOCK_AZURE_SCENARIO__ = scenarioName;
    (window as any).__USE_MOCK_PERSISTENCE__ = true;
  }, azureScenario);
}

/**
 * Mock ChurchTools API at the CONTEXT level
 *
 * This applies to ALL pages in the context, including popups
 */
async function mockChurchToolsAPIForContext(context: BrowserContext) {
  const kvStore = new MockKVStore();

  await context.route('**/api/**', async (route: Route) => {
    const url = route.request().url();
    const method = route.request().method();

    // Mock authentication endpoints
    if (method === 'GET' && url.match(/\/api\/whoami/)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          firstName: 'Mock',
          lastName: 'User',
          email: 'mock@example.com',
          permissions: ['churchcore:administer persons'],
        }),
      });
      return;
    }

    if (method === 'GET' && url.match(/\/api\/csrftoken/)) {
      await route.fulfill({
        status: 200,
        contentType: 'text/plain',
        body: 'mock-csrf-token-12345',
      });
      return;
    }

    // POST /api/login - Login endpoint
    if (method === 'POST' && url.match(/\/api\/login/)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'success',
          data: {
            id: 1,
            firstName: 'Mock',
            lastName: 'User',
            email: 'mock@example.com',
          },
        }),
      });
      return;
    }

    // GET all modules
    if (method === 'GET' && url.match(/\/api\/custommodules\/?$/)) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(kvStore.getModules()),
      });
      return;
    }

    // POST create module
    if (method === 'POST' && url.match(/\/api\/custommodules\/?$/)) {
      const postData = route.request().postDataJSON();
      const module = kvStore.createModule(postData);
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(module),
      });
      return;
    }

    // GET categories for a module
    if (
      method === 'GET' &&
      url.match(/\/api\/custommodules\/(\d+)\/categories\/?$/)
    ) {
      const match = url.match(/\/api\/custommodules\/(\d+)\/categories\/?$/);
      const moduleId = parseInt(match![1]);
      const categories = kvStore.getCategories(moduleId);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(categories),
      });
      return;
    }

    // POST create category
    if (
      method === 'POST' &&
      url.match(/\/api\/custommodules\/(\d+)\/categories\/?$/)
    ) {
      const match = url.match(/\/api\/custommodules\/(\d+)\/categories\/?$/);
      const moduleId = parseInt(match![1]);
      const postData = route.request().postDataJSON();
      const category = kvStore.createCategory(moduleId, postData);
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(category),
      });
      return;
    }

    // PUT update category
    if (
      method === 'PUT' &&
      url.match(/\/api\/custommodules\/\d+\/categories\/(\d+)\/?$/)
    ) {
      const match = url.match(
        /\/api\/custommodules\/\d+\/categories\/(\d+)\/?$/,
      );
      const categoryId = parseInt(match![1]);
      const putData = route.request().postDataJSON();
      const category = kvStore.updateCategory(categoryId, putData);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(category),
      });
      return;
    }

    // DELETE category
    if (
      method === 'DELETE' &&
      url.match(/\/api\/custommodules\/\d+\/categories\/(\d+)\/?$/)
    ) {
      const match = url.match(
        /\/api\/custommodules\/\d+\/categories\/(\d+)\/?$/,
      );
      const categoryId = parseInt(match![1]);
      kvStore.deleteCategory(categoryId);
      await route.fulfill({
        status: 204,
        body: '',
      });
      return;
    }

    // GET values for a category
    if (
      method === 'GET' &&
      url.match(/\/api\/custommodules\/\d+\/categories\/(\d+)\/values\/?$/)
    ) {
      const match = url.match(
        /\/api\/custommodules\/\d+\/categories\/(\d+)\/values\/?$/,
      );
      const categoryId = parseInt(match![1]);
      const values = kvStore.getValues(categoryId);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(values),
      });
      return;
    }

    // POST create value
    if (
      method === 'POST' &&
      url.match(/\/api\/custommodules\/\d+\/categories\/(\d+)\/values\/?$/)
    ) {
      const match = url.match(
        /\/api\/custommodules\/\d+\/categories\/(\d+)\/values\/?$/,
      );
      const categoryId = parseInt(match![1]);
      const postData = route.request().postDataJSON();
      const value = kvStore.createValue(categoryId, postData);
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(value),
      });
      return;
    }

    // PUT update value
    if (
      method === 'PUT' &&
      url.match(
        /\/api\/custommodules\/\d+\/categories\/(\d+)\/values\/(\d+)\/?$/,
      )
    ) {
      const match = url.match(
        /\/api\/custommodules\/\d+\/categories\/(\d+)\/values\/(\d+)\/?$/,
      );
      const categoryId = parseInt(match![1]);
      const valueId = parseInt(match![2]);
      const putData = route.request().postDataJSON();
      const value = kvStore.updateValue(categoryId, valueId, putData);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(value),
      });
      return;
    }

    // DELETE value
    if (
      method === 'DELETE' &&
      url.match(/\/api\/custommodules\/\d+\/categories\/\d+\/values\/(\d+)\/?$/)
    ) {
      const match = url.match(
        /\/api\/custommodules\/\d+\/categories\/(\d+)\/values\/(\d+)\/?$/,
      );
      const categoryId = parseInt(match![1]);
      const valueId = parseInt(match![2]);
      kvStore.deleteValue(categoryId, valueId);
      await route.fulfill({
        status: 204,
        body: '',
      });
      return;
    }

    // If not a matched endpoint, abort to prevent real calls
    console.warn(`[E2E Mock] Unhandled API call: ${method} ${url}`);
    await route.abort('blocked');
  });
}

/**
 * Setup all mocks for E2E testing (PAGE LEVEL - DEPRECATED)
 *
 * @deprecated Use setupE2EMocksForContext() instead for proper context-level mocking
 *
 * This function is kept for backward compatibility but should not be used
 * as it sets up mocks at the page level, which means they only apply AFTER
 * the page is created, potentially allowing real API calls during initialization.
 */
export async function setupE2EMocks(
  page: Page,
  options: {
    azureScenario?: string;
    mockChurchTools?: boolean;
  } = {},
) {
  const { azureScenario = 'basic', mockChurchTools = true } = options;

  // Mock Azure Speech SDK
  await injectMockAzureSDK(page, azureScenario);

  // Mock ChurchTools API (KV store operations)
  if (mockChurchTools) {
    await injectMockChurchTools(page);
    await mockChurchToolsAPI(page);
  }
}
