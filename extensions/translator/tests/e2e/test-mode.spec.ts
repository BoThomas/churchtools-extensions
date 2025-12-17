import { test, expect } from './fixtures/extensionFixture';
import { authenticateChurchTools } from './utils/auth';
import { cleanupE2EData } from './utils/cleanup';
import {
  configureApiCredentials,
  configureTranslationSettings,
  navigateToTab,
} from './utils/testHelpers';

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
  test('comprehensive test mode workflow', async ({
    extensionPage,
    windowHelper,
  }) => {
    // Setup: Authenticate and clean up
    await authenticateChurchTools(extensionPage);
    await cleanupE2EData(extensionPage);
    await extensionPage.goto('/');
    await extensionPage.waitForLoadState('networkidle');

    // Setup API credentials
    await configureApiCredentials(extensionPage);

    // Configure multiple languages for test
    await configureTranslationSettings(extensionPage, {
      inputLang: '🇬🇧 English (United Kingdom)',
      outputLangs: ['🇩🇪 German', '🇫🇷 French', '🇪🇸 Spanish'],
    });

    // Navigate to translate tab
    await navigateToTab(extensionPage, 'translate');

    // 1. Start test mode and verify output area appears
    const testButton = extensionPage.getByTestId('button-test-translation');
    await testButton.click();
    await extensionPage.waitForTimeout(500);

    // Verify test output area becomes visible
    const testOutput = extensionPage.getByTestId('test-output-display');
    await expect(testOutput).toBeVisible();

    // Verify no presentation windows opened
    expect(windowHelper.getWindowCount()).toBe(0);

    // 2. Verify output containers appear for all configured languages
    // Default showInputLanguage should be true, so 4 total (1 input + 3 output)
    const inputOutput = extensionPage.getByTestId('test-output-en-GB');
    const germanOutput = extensionPage.getByTestId('test-output-de');
    const frenchOutput = extensionPage.getByTestId('test-output-fr');
    const spanishOutput = extensionPage.getByTestId('test-output-es');

    await expect(inputOutput).toBeVisible();
    await expect(germanOutput).toBeVisible();
    await expect(frenchOutput).toBeVisible();
    await expect(spanishOutput).toBeVisible();

    // 3. Wait for mocked Azure SDK to produce translations
    // Test mode auto-starts recognition, no need to click start recording
    // Mock 'basic' scenario: recognizing at 500ms, recognized at 1000ms
    await extensionPage.waitForTimeout(1500);

    // 4. Verify translated content appears in correct language boxes
    // Mock 'basic' scenario produces:
    // - recognizing: "Hello" -> de: "Hallo", fr: "Bonjour", es: "Hola"
    // - recognized: "Hello world" -> de: "Hallo Welt", fr: "Bonjour le monde", es: "Hola mundo"

    // Check input language shows original text
    const inputContent = await inputOutput.textContent();
    expect(inputContent).toContain('Hello');

    // Check German translation
    const germanContent = await germanOutput.textContent();
    expect(germanContent).toContain('Hallo');

    // Check French translation
    const frenchContent = await frenchOutput.textContent();
    expect(frenchContent).toContain('Bonjour');

    // Check Spanish translation
    const spanishContent = await spanishOutput.textContent();
    expect(spanishContent).toContain('Hola');

    // 5. Verify live vs finalized styling
    // After recognized event, text should be finalized (not grayed out)
    // Live translations have text-surface-500, finalized don't
    const germanLiveText = germanOutput.locator('.text-surface-500');
    const germanFinalizedText = germanOutput.locator('p.text-sm');

    // Should have finalized paragraph after recognized event
    await expect(germanFinalizedText).toBeVisible();

    // 6. Stop test mode and verify output clears
    const stopButton = extensionPage.getByTestId('button-stop');
    await stopButton.click();
    await extensionPage.waitForTimeout(300);

    // Verify output is hidden
    await expect(testOutput).not.toBeVisible();
  });
});
