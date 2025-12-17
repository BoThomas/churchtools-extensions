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
