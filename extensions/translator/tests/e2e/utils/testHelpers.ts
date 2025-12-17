import type { Page } from '@playwright/test';
import type { MultiWindowHelper } from './multiWindow';

/**
 * Configuration for translation settings
 */
export interface TranslationConfig {
  inputLang: string; // e.g., '🇬🇧 English (United Kingdom)'
  outputLangs: string[]; // e.g., ['🇩🇪 German', '🇫🇷 French']
  presentationMode?: 'Single-window' | 'Multi-window';
}

/**
 * Configure translation settings via UI
 * Navigates to translate tab, sets input/output languages, and optionally presentation mode
 */
export async function configureTranslationSettings(
  page: Page,
  config: TranslationConfig,
) {
  // Navigate to translate tab
  await page.getByTestId('tab-translate').click();
  await page.waitForTimeout(500);

  // Expand Translation Options
  await page.getByRole('button', { name: /Translation Options/i }).click();
  await page.waitForTimeout(300);

  // Set input language
  const inputLangSelect = page.getByTestId('select-input-lang');
  await inputLangSelect.click();
  await page.waitForTimeout(300);
  // Input language: scope to the listbox to avoid matching the selected value display
  await page.locator('[role="listbox"]').getByText(config.inputLang).click();
  await page.waitForTimeout(300);

  // Configure output languages
  const outputLangsMultiselect = page.getByTestId('multiselect-output-langs');
  await outputLangsMultiselect.click();
  await page.waitForTimeout(500);

  // First, deselect all currently selected languages
  // The default is usually just English
  const selectedOptions = page
    .getByLabel('Option List')
    .locator('[aria-selected="true"]');
  const selectedCount = await selectedOptions.count();

  for (let i = 0; i < selectedCount; i++) {
    await selectedOptions.first().click();
    await page.waitForTimeout(200);
  }

  // Now select the desired output languages
  // Output languages: already scoped by getByLabel('Option List')
  for (const lang of config.outputLangs) {
    await page.getByLabel('Option List').getByText(lang).click();
    await page.waitForTimeout(200);
  }

  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  // Set presentation mode if specified and there are 2+ output languages
  // (presentation mode is disabled for single language)
  if (config.presentationMode && config.outputLangs.length >= 2) {
    await page.getByRole('button', { name: /Presentation Options/i }).click();
    await page.waitForTimeout(300);

    const presentationModeSelect = page.locator('#presentation-mode');
    // Verify the select is enabled before trying to click
    await presentationModeSelect.waitFor({ state: 'visible' });
    await presentationModeSelect.click();
    await page.waitForTimeout(300);
    await page
      .getByRole('option', { name: new RegExp(config.presentationMode, 'i') })
      .click();
    await page.waitForTimeout(300);
  }
}

/**
 * Open presentation windows and wait for them to load
 * @returns Array of opened presentation windows
 */
export async function openPresentationWindows(
  page: Page,
  windowHelper: MultiWindowHelper,
  expectedWindowCount: number,
) {
  const presentationButton = page.getByTestId('button-presentation');
  const windowsPromise = windowHelper.waitForWindows(expectedWindowCount);
  await presentationButton.click();
  return await windowsPromise;
}

/**
 * Open test presentation windows and wait for them to load
 * @returns Array of opened test presentation windows
 */
export async function openTestPresentationWindows(
  page: Page,
  windowHelper: MultiWindowHelper,
  expectedWindowCount: number,
) {
  const testPresentationButton = page.getByTestId('button-test-presentation');
  const windowsPromise = windowHelper.waitForWindows(expectedWindowCount);
  await testPresentationButton.click();
  return await windowsPromise;
}

/**
 * Start recording in the test presentation
 */
export async function startTestRecording(page: Page) {
  const startButton = page.getByTestId('button-start-test-generation');
  await startButton.click();
  await page.waitForTimeout(500);
}

/**
 * Extract language parameters from window URLs
 * Accepts both "de" and "de-DE" formats
 * @returns Array of language codes found in the URLs
 */
export function extractLanguageParams(windows: Page[]): (string | null)[] {
  return windows.map((win) => {
    const url = win.url();
    const match = url.match(/[?&]lang=([a-z]{2}(?:-[A-Z]{2})?)/);
    return match ? match[1] : null;
  });
}

/**
 * Navigate to a specific tab in the extension
 */
export async function navigateToTab(
  page: Page,
  tab: 'translate' | 'settings',
  waitTime: number = 500,
) {
  const tabButton = page.getByTestId(`tab-${tab}`);
  await tabButton.click();
  await page.waitForTimeout(waitTime);
}

/**
 * Configure Azure API credentials via Settings tab
 * Saves to real ChurchTools KV store
 */
export async function configureApiCredentials(
  page: Page,
  apiKey: string = 'mock-api-key-12345',
  region: string = 'westeurope',
) {
  await navigateToTab(page, 'settings');

  const apiKeyInput = page.getByTestId('input-api-key');
  await apiKeyInput.fill(apiKey);

  const regionInput = page.getByTestId('input-api-region');
  await regionInput.fill(region);

  const saveButton = page.getByTestId('button-save-settings');
  await saveButton.click();

  // Wait for save to complete (real API call)
  await page.waitForTimeout(1000);
}

/**
 * Create a new variant with a given name
 * Assumes user is already on the Translate tab
 */
export async function createVariant(
  page: Page,
  variantName: string,
): Promise<void> {
  const saveAsButton = page.getByTestId('button-save-as-variant');
  await saveAsButton.click();

  const dialog = page.getByTestId('dialog-save-as-variant');
  await dialog.waitFor({ state: 'visible' });

  const variantNameInput = page.getByTestId('input-variant-name');
  await variantNameInput.fill(variantName);

  const confirmButton = page.getByTestId('button-confirm-save-as');
  await confirmButton.click();

  await dialog.waitFor({ state: 'hidden' });
  await page.waitForTimeout(500);
}

/**
 * Clear localStorage and sessionStorage to simulate first-time user
 * Must be called after page navigation
 */
export async function clearBrowserStorage(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}
