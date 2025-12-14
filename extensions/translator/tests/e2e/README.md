# E2E Testing with Playwright - Translator Extension

This guide explains how to run and write E2E (End-to-End) tests for the Translator extension using Playwright.

## Overview

E2E tests run in a real browser (Chromium) and test the complete user experience, including:
- Multi-window functionality (presentation windows)
- localStorage communication between windows
- Real browser behavior (unlike unit/integration tests in jsdom)
- Visual verification

**Note:** E2E tests are run **manually only** - they are not part of CI/CD.

## Architecture

E2E tests are **extension-specific** because each extension has:
- Different dev server port
- Different mocks (Azure SDK, ChurchTools API, etc.)
- Different UI structure and selectors
- Different features to test

Playwright is installed globally at the monorepo root, but all test infrastructure (fixtures, utils, mocks, specs) lives in the translator extension.

## Prerequisites

1. **Playwright is installed** at the monorepo root (already done)
2. **Chromium browser** is installed: `npx playwright install chromium` (from monorepo root)
3. **Dev server is running** for the translator extension

## Running E2E Tests

### 1. Start the Dev Server

E2E tests require a running dev server. In a separate terminal:

```bash
cd extensions/translator
pnpm dev
```

The dev server runs on `https://localhost:5173` (HTTPS with self-signed cert)

### 2. Run the E2E Tests

From **within the translator extension**:

```bash
cd extensions/translator

# Run all E2E tests
pnpm test:e2e

# Run with UI (visual test runner) - RECOMMENDED
pnpm test:e2e:ui

# Run in headed mode (see browser)
pnpm test:e2e:headed

# Debug mode (step through tests)
pnpm test:e2e:debug
```

**Note:** There are no global E2E test scripts at the monorepo root. Each extension manages its own E2E tests.

## Test Structure

All E2E infrastructure is contained within the translator extension:

```
extensions/translator/tests/e2e/
├── fixtures/
│   └── extensionFixture.ts      # Extended Playwright test with custom fixtures
├── utils/
│   ├── localStorage.ts          # Helper for localStorage operations
│   └── multiWindow.ts           # Helper for managing multiple windows
├── mocks/
│   └── mockSetup.ts             # Mock injection strategies (Azure SDK, ChurchTools)
├── presentation-mode.spec.ts    # Split-screen presentation mode tests
├── multi-window.spec.ts         # Multi-window mode tests
├── test-mode.spec.ts            # Test/preview mode tests
├── settings-flow.spec.ts        # Settings and variant management tests
└── README.md                    # This file
```

## Writing E2E Tests

### Basic Test Template

```typescript
import { test, expect } from './fixtures/extensionFixture';
import { setupE2EMocks } from './mocks/mockSetup';

test.describe('My Feature', () => {
  test.beforeEach(async ({ extensionPage, localStorage }) => {
    // Setup mocks
    await setupE2EMocks(extensionPage);
    
    // Setup test data
    await localStorage.setItem('my_settings', {
      key: 'value'
    });
    
    // Navigate
    await extensionPage.goto('/');
  });

  test('does something', async ({ extensionPage }) => {
    // Your test code
    await expect(extensionPage.locator('h1')).toBeVisible();
  });
});
```

### Using Fixtures

The `extensionFixture` provides three custom fixtures:

1. **extensionPage**: Pre-configured page with the extension loaded
2. **windowHelper**: Helper for managing multiple windows
3. **localStorage**: Helper for localStorage operations

```typescript
test('multi-window test', async ({ extensionPage, windowHelper, localStorage }) => {
  // Open a new window
  const startButton = extensionPage.getByRole('button', { name: /start/i });
  const windowPromise = windowHelper.waitForWindow();
  await startButton.click();
  
  const newWindow = await windowPromise;
  await newWindow.waitForLoadState('networkidle');
  
  // Check window count
  expect(windowHelper.getWindowCount()).toBe(1);
  
  // Set localStorage and verify
  await localStorage.setItem('test_key', { data: 'value' });
  const value = await localStorage.getItem('test_key');
  expect(value.data).toBe('value');
});
```

### LocalStorage Helper Methods

```typescript
// Set item (auto JSON stringify)
await localStorage.setItem(key, value);

// Get item (auto JSON parse)
const value = await localStorage.getItem(key);

// Wait for item to exist
const value = await localStorage.waitForItem(key, timeout);

// Wait for specific value
await localStorage.waitForValue(key, expectedValue, timeout);

// Remove item
await localStorage.removeItem(key);

// Clear all
await localStorage.clear();

// Get all keys
const keys = await localStorage.keys();

// Get all items
const all = await localStorage.getAll();

// Check existence
const exists = await localStorage.hasItem(key);
```

### MultiWindow Helper Methods

```typescript
// Get all windows
const windows = windowHelper.getWindows();

// Get specific window
const window = windowHelper.getWindow(index);

// Get last opened window
const lastWindow = windowHelper.getLastWindow();

// Wait for new window
const newWindow = await windowHelper.waitForWindow(timeout);

// Wait for N windows
const windows = await windowHelper.waitForWindows(count, timeout);

// Wait for window with URL pattern
const window = await windowHelper.waitForWindowWithUrl(/presentation/, timeout);

// Find windows by title
const windows = await windowHelper.findWindowsByTitle(/Translation/);

// Close all windows
await windowHelper.closeAll();

// Close specific window
await windowHelper.closeWindow(index);

// Get window count
const count = windowHelper.getWindowCount();

// Check if windows exist
const hasWindows = windowHelper.hasWindows();
```

## Mock Setup

E2E tests use `setupE2EMocks()` to inject mocks into the browser:

```typescript
// Basic setup
await setupE2EMocks(extensionPage);

// With Azure scenario
await setupE2EMocks(extensionPage, {
  azureScenario: 'multiLanguage',
  mockChurchTools: true
});
```

Available Azure scenarios:
- `basic` (default): Simple German to English translation
- `multiLanguage`: Multiple target languages
- `error`: Simulates API errors

## Debugging

### Visual Debugging

```bash
# Run with UI - best for debugging
pnpm test:e2e:ui

# Run in headed mode - see browser
pnpm test:e2e:headed

# Debug mode - step through tests
pnpm test:e2e:debug
```

### Debugging Tips

1. **Add screenshots**: Use `await extensionPage.screenshot({ path: 'debug.png' })`
2. **Use page.pause()**: Pause execution to inspect browser state
3. **Check console**: Use `extensionPage.on('console', msg => console.log(msg.text()))`
4. **Inspect elements**: Use Playwright Inspector with `--debug` flag

### Common Issues

**Issue: Tests fail with "Target closed"**
- Dev server crashed or stopped
- Window was closed unexpectedly
- Solution: Restart dev server, check for errors

**Issue: Tests timeout**
- Page didn't load in time
- Element selector is wrong
- Solution: Increase timeout, verify selectors

**Issue: Can't find element**
- Page structure changed
- Element not yet rendered
- Solution: Use `waitForSelector()`, check element exists

## Best Practices

1. **Always start dev server first**: E2E tests require a running server
2. **Use data-testid attributes**: Add `data-testid="my-element"` for stable selectors
3. **Wait for network idle**: Use `waitForLoadState('networkidle')` after navigation
4. **Clean up windows**: The windowHelper automatically closes windows after each test
5. **Mock external APIs**: Use `setupE2EMocks()` to avoid real API calls
6. **Keep tests independent**: Each test should work in isolation
7. **Use descriptive test names**: Make it clear what the test verifies

## Test Templates

The current E2E test files in `extensions/translator/tests/e2e/` are **templates**. Many tests use `test.skip()` because they need:

1. **Actual UI selectors**: Replace placeholder selectors with real ones from your UI
2. **Data-testid attributes**: Add these to your components for stable selectors
3. **localStorage keys**: Use the actual keys your extension uses
4. **Implementation details**: Adjust to match your actual implementation

To complete a test:
1. Remove `test.skip()`
2. Add real selectors based on your UI
3. Adjust assertions based on actual behavior
4. Test manually to verify it works

## Configuration

Playwright config is at `playwright.config.ts` in the translator extension root:

```typescript
// extensions/translator/playwright.config.ts
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',
  workers: 1,
  use: {
    baseURL: 'https://localhost:5173',  // Translator dev server
    ignoreHTTPSErrors: true,  // Self-signed cert
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium' },
  ],
});
```

## Adding E2E Tests to Other Extensions

To add E2E tests to another extension, copy the translator's E2E infrastructure:

1. Copy the entire E2E setup:
   ```bash
   # Copy E2E tests directory
   cp -r extensions/translator/tests/e2e extensions/my-extension/tests/
   
   # Copy Playwright config
   cp extensions/translator/playwright.config.ts extensions/my-extension/
   ```

2. Update `playwright.config.ts` for your extension:
   ```typescript
   // extensions/my-extension/playwright.config.ts
   export default defineConfig({
     testDir: './tests/e2e',
     use: {
       baseURL: 'https://localhost:XXXX',  // Your extension's port
       // ... rest of config
     },
   });
   ```

3. Update fixtures/mocks for your extension's specific needs:
   - Remove Azure SDK mocks if not needed (translator-specific)
   - Add your extension-specific mocks
   - Update fixture setup for your UI

4. Add scripts to your extension's package.json:
   ```json
   {
     "scripts": {
       "test:e2e": "playwright test",
       "test:e2e:ui": "playwright test --ui",
       "test:e2e:headed": "playwright test --headed",
       "test:e2e:debug": "playwright test --debug"
     }
   }
   ```

5. Start dev server and run tests:
   ```bash
   # Terminal 1
   cd extensions/my-extension
   pnpm dev
   
   # Terminal 2
   pnpm test:e2e
   ```

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Writing Tests](https://playwright.dev/docs/writing-tests)
- [Debugging Tests](https://playwright.dev/docs/debug)
