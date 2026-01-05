import { test, expect } from './fixtures/extensionFixture';
import { authenticateChurchTools } from './utils/auth';
import { cleanupE2EData } from './utils/cleanup';
import {
  configureApiCredentials,
  configureTranslationSettings,
  navigateToTab,
} from './utils/testHelpers';

/**
 * E2E Tests for Operator Preview with REAL ChurchTools Integration
 *
 * Tests the operator preview feature which displays translations in the operator
 * interface. This is shown during test mode and can also be shown during
 * presentations if the operator wants to monitor what the audience sees.
 *
 * IMPORTANT: These tests use a REAL ChurchTools instance
 * - Azure SDK: Mocked (stable, no costs, fast)
 * - ChurchTools: Real API calls (tests auth, persistence, API compatibility)
 */

test.describe('Operator Preview', () => {
  test('shows placeholder when idle', async ({ extensionPage }) => {
    // Setup: Authenticate and clean up
    await authenticateChurchTools(extensionPage);
    await cleanupE2EData(extensionPage);
    await extensionPage.goto('/');
    await extensionPage.waitForLoadState('networkidle');

    // Setup API credentials
    await configureApiCredentials(extensionPage);

    // Navigate to translate tab
    await navigateToTab(extensionPage, 'translate');

    // Verify operator preview is visible
    const operatorPreview = extensionPage.getByTestId(
      'fieldset-operator-preview',
    );
    await expect(operatorPreview).toBeVisible();

    // Verify placeholder is shown when nothing is running
    const placeholder = extensionPage.getByTestId(
      'operator-preview-placeholder',
    );
    await expect(placeholder).toBeVisible();
    await expect(placeholder).toContainText(
      'Start a translation test or presentation to see the live preview here.',
    );
  });

  test('test mode shows translations without presentation windows', async ({
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

    // Verify operator preview content becomes visible
    const operatorPreviewContent = extensionPage.getByTestId(
      'operator-preview-content',
    );
    await expect(operatorPreviewContent).toBeVisible();

    // Verify placeholder is hidden
    const placeholder = extensionPage.getByTestId(
      'operator-preview-placeholder',
    );
    await expect(placeholder).not.toBeVisible();

    // Verify no presentation windows opened
    expect(windowHelper.getWindowCount()).toBe(0);

    // 2. Verify output containers appear for all configured languages
    // Operator always sees input + output languages, so 4 total (1 input + 3 output)
    const inputOutput = extensionPage.getByTestId('operator-preview-en-GB');
    const germanOutput = extensionPage.getByTestId('operator-preview-de');
    const frenchOutput = extensionPage.getByTestId('operator-preview-fr');
    const spanishOutput = extensionPage.getByTestId('operator-preview-es');

    await expect(inputOutput).toBeVisible();
    await expect(germanOutput).toBeVisible();
    await expect(frenchOutput).toBeVisible();
    await expect(spanishOutput).toBeVisible();

    // 3. Wait for mocked Azure SDK to produce translations
    // Test mode auto-starts recognition, no need to click start translation
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

    // 5. Verify finalized text styling
    // After recognized event, text should be finalized (not grayed out)
    const germanFinalizedText = germanOutput.locator('p.text-sm');
    await expect(germanFinalizedText).toBeVisible();

    // 6. Stop test mode and verify placeholder returns
    const stopButton = extensionPage.getByTestId('button-stop');
    await stopButton.click();
    await extensionPage.waitForTimeout(300);

    // Verify content is hidden and placeholder returns
    await expect(operatorPreviewContent).not.toBeVisible();
    await expect(placeholder).toBeVisible();
  });

  test('test presentation shows lorem ipsum with presentation windows', async ({
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

    // Start test presentation
    const testPresentationButton = extensionPage.getByTestId(
      'button-test-presentation',
    );
    await testPresentationButton.click();
    await extensionPage.waitForTimeout(1000);

    // Verify presentation window opened
    expect(windowHelper.getWindowCount()).toBeGreaterThan(0);

    // Click start test to begin lorem ipsum generation
    const startTestButton = extensionPage.getByTestId(
      'button-start-test-generation',
    );
    await expect(startTestButton).toBeVisible({ timeout: 5000 });
    await startTestButton.click();
    await extensionPage.waitForTimeout(1500);

    // Verify operator preview shows content during test presentation
    const operatorPreviewContent = extensionPage.getByTestId(
      'operator-preview-content',
    );
    await expect(operatorPreviewContent).toBeVisible();

    // Verify language outputs are visible
    const inputOutput = extensionPage.getByTestId('operator-preview-en-GB');
    const germanOutput = extensionPage.getByTestId('operator-preview-de');
    await expect(inputOutput).toBeVisible();
    await expect(germanOutput).toBeVisible();

    // Stop test presentation
    const stopButton = extensionPage.getByTestId('button-stop');
    await stopButton.click();
    await extensionPage.waitForTimeout(500);

    // Verify placeholder returns after stopping
    const placeholder = extensionPage.getByTestId(
      'operator-preview-placeholder',
    );
    await expect(placeholder).toBeVisible();
  });

  test('auto-opens when starting test translation if collapsed', async ({
    extensionPage,
  }) => {
    // Setup: Authenticate and clean up
    await authenticateChurchTools(extensionPage);
    await cleanupE2EData(extensionPage);
    await extensionPage.goto('/');
    await extensionPage.waitForLoadState('networkidle');

    // Setup API credentials
    await configureApiCredentials(extensionPage);

    // Navigate to translate tab
    await navigateToTab(extensionPage, 'translate');

    // Collapse the operator preview fieldset by clicking the legend button
    const operatorPreview = extensionPage.getByTestId(
      'fieldset-operator-preview',
    );
    // PrimeVue Fieldset has a button inside the legend with the legend text
    const toggleButton = operatorPreview.locator('legend button');
    await toggleButton.click();
    await extensionPage.waitForTimeout(500);

    // Verify placeholder is not visible (collapsed)
    const placeholder = extensionPage.getByTestId(
      'operator-preview-placeholder',
    );
    await expect(placeholder).not.toBeVisible();

    // Start test translation
    const testButton = extensionPage.getByTestId('button-test-translation');
    await testButton.click();
    await extensionPage.waitForTimeout(500);

    // Verify operator preview expanded and shows content
    const operatorPreviewContent = extensionPage.getByTestId(
      'operator-preview-content',
    );
    await expect(operatorPreviewContent).toBeVisible();

    // Stop test
    const stopButton = extensionPage.getByTestId('button-stop');
    await stopButton.click();
  });
});
