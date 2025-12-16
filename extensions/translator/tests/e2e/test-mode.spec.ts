import { test, expect } from './fixtures/extensionFixture';
import { authenticateChurchTools } from './utils/auth';
import { cleanupE2EData } from './utils/cleanup';

/**
 * E2E Tests for Test Mode with REAL ChurchTools Integration
 *
 * Tests the test/preview mode where translations are displayed in the operator
 * interface without opening presentation windows. This mode is used for testing
 * the translation service before going live.
 *
 * IMPORTANT: These tests use a REAL ChurchTools instance
 * - Azure SDK: Mocked (stable, no costs, fast)
 * - ChurchTools: Real API calls (tests auth, persistence, API compatibility)
 */

test.describe('Test Mode', () => {
  test.beforeEach(async ({ extensionPage }) => {
    await authenticateChurchTools(extensionPage);
    await cleanupE2EData(extensionPage);

    // Navigate to extension
    await extensionPage.goto('/');
    await extensionPage.waitForLoadState('networkidle');

    // Setup API credentials via UI (save to real KV store)
    await extensionPage.getByTestId('tab-settings').click();
    await extensionPage.getByTestId('input-api-key').fill('mock-api-key-12345');
    await extensionPage.getByTestId('input-api-region').fill('westeurope');
    await extensionPage.getByTestId('button-save-settings').click();
    await extensionPage.waitForTimeout(1000);
  });

  test('starts test mode and displays output area', async ({
    extensionPage,
    windowHelper,
  }) => {
    await extensionPage.waitForLoadState('networkidle');

    // Navigate to Translate tab
    const translateTab = extensionPage.getByTestId('tab-translate');
    await translateTab.click();
    await extensionPage.waitForTimeout(500);

    // Click Test Translation button
    const testButton = extensionPage.getByTestId('button-test-translation');
    await testButton.click();

    // Wait a bit for test mode to start
    await extensionPage.waitForTimeout(500);

    // Verify test output area becomes visible
    const testOutput = extensionPage.getByTestId('test-output-display');
    await expect(testOutput).toBeVisible();

    // Verify no presentation windows opened
    expect(windowHelper.getWindowCount()).toBe(0);
  });

  test('displays translations in test output area', async ({
    extensionPage,
  }) => {
    await extensionPage.waitForLoadState('networkidle');

    const translateTab = extensionPage.getByTestId('tab-translate');
    await translateTab.click();
    await extensionPage.waitForTimeout(500);

    // Start test mode
    const testButton = extensionPage.getByTestId('button-test-translation');
    await testButton.click();
    await extensionPage.waitForTimeout(300);

    // Verify output containers appear for configured languages
    const testOutput = extensionPage.getByTestId('test-output-display');
    await expect(testOutput).toBeVisible();

    // With default settings, should have input + output language containers
    // The actual languages depend on the default configuration
  });

  test('shows live vs finalized translation styling', async ({
    extensionPage,
  }) => {
    await extensionPage.waitForLoadState('networkidle');

    const translateTab = extensionPage.getByTestId('tab-translate');
    await translateTab.click();
    await extensionPage.waitForTimeout(500);

    // Start test mode
    const testButton = extensionPage.getByTestId('button-test-translation');
    await testButton.click();
    await extensionPage.waitForTimeout(300);

    // Test output has different CSS classes for live vs finalized
    // Live: text-surface-500 (gray/dimmed)
    // Finalized: text-sm (normal)

    // This is primarily tested at the integration level
    // E2E just verifies the output area exists
    const testOutput = extensionPage.getByTestId('test-output-display');
    await expect(testOutput).toBeVisible();
  });

  test('clears output when stopping test mode', async ({ extensionPage }) => {
    await extensionPage.waitForLoadState('networkidle');

    const translateTab = extensionPage.getByTestId('tab-translate');
    await translateTab.click();
    await extensionPage.waitForTimeout(500);

    // Start test mode
    const testButton = extensionPage.getByTestId('button-test-translation');
    await testButton.click();
    await extensionPage.waitForTimeout(300);

    // Verify output is visible
    const testOutput = extensionPage.getByTestId('test-output-display');
    await expect(testOutput).toBeVisible();

    // Stop test mode
    const stopButton = extensionPage.getByTestId('button-stop');
    await stopButton.click();
    await extensionPage.waitForTimeout(300);

    // Verify output is hidden
    await expect(testOutput).not.toBeVisible();
  });

  test('tracks session even in test mode', async ({
    extensionPage,
    localStorage,
  }) => {
    // Session tracking is tested at integration level
    // E2E focuses on UI interactions
    test.skip();
  });

  test('displays multiple languages simultaneously', async ({
    extensionPage,
    localStorage,
  }) => {
    // Setup with multiple output languages
    await localStorage.setItem('translator_settings', {
      inputLanguage: 'en-US',
      outputLanguages: ['de-DE', 'fr-FR', 'es-ES'],
      profanityOption: 'raw',
      stablePartialResultThreshold: '3',
      phraseList: '',
      presentation: {
        mode: 'split',
        showInputLanguage: true,
        font: 'Arial',
        fontSize: '2em',
        margin: '1em 2em',
        color: 'white',
        liveColor: '#999',
        background: 'black',
      },
    });

    await extensionPage.goto('/');
    await extensionPage.waitForLoadState('networkidle');

    const translateTab = extensionPage.getByTestId('tab-translate');
    await translateTab.click();
    await extensionPage.waitForTimeout(500);

    // Start test mode
    const testButton = extensionPage.getByTestId('button-test-translation');
    await testButton.click();
    await extensionPage.waitForTimeout(300);

    // Verify output containers for each language
    // With showInputLanguage: true, should have 4 total (1 input + 3 output)
    const testOutput = extensionPage.getByTestId('test-output-display');
    await expect(testOutput).toBeVisible();

    // Check for individual language outputs
    await expect(extensionPage.getByTestId('test-output-en-US')).toBeVisible();
    await expect(extensionPage.getByTestId('test-output-de-DE')).toBeVisible();
    await expect(extensionPage.getByTestId('test-output-fr-FR')).toBeVisible();
    await expect(extensionPage.getByTestId('test-output-es-ES')).toBeVisible();
  });
});

test.describe('Test Mode - Error Handling', () => {
  test.beforeEach(async ({ extensionPage, localStorage }) => {
    await authenticateChurchTools(extensionPage);
    await localStorage.setItem('translator_api_settings', {
      azureApiKey: 'mock-api-key-12345',
      azureRegion: 'westeurope',
    });

    await extensionPage.goto('/');
  });

  // Cleanup after all tests in this block
  test.afterAll(async ({ extensionPage }) => {
    await cleanupE2EData(extensionPage);
  });

  test('displays error message when Azure API fails', async ({
    extensionPage,
  }) => {
    // Error handling is tested at integration level with mocked Azure SDK
    // E2E with real Azure API mocking is complex and may not be reliable
    test.skip();
  });

  test('gracefully handles missing API credentials', async ({
    extensionPage,
    localStorage,
  }) => {
    // Clear API credentials
    await localStorage.clear();
    await extensionPage.reload();
    await extensionPage.waitForLoadState('networkidle');

    const translateTab = extensionPage.getByTestId('tab-translate');
    await translateTab.click();
    await extensionPage.waitForTimeout(500);

    // Verify warning message about missing credentials
    const warningMessage = extensionPage.getByText(
      /configure.*azure.*api.*credentials/i,
    );
    await expect(warningMessage).toBeVisible();

    // Test button should exist but may be disabled or show warning
    const testButton = extensionPage.getByTestId('button-test-translation');
    await expect(testButton).toBeVisible();
  });
});
