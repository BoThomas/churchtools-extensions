import { test, expect } from './fixtures/extensionFixture';
import { authenticateChurchTools } from './utils/auth';
import { cleanupE2EData } from './utils/cleanup';

/**
 * E2E Tests for Multi-Window Mode with REAL ChurchTools Integration
 *
 * Tests the ability to open multiple presentation windows (one per language)
 * and ensure translations are properly distributed to the correct windows.
 *
 * IMPORTANT: These tests use a REAL ChurchTools instance
 * - Azure SDK: Mocked (stable, no costs, fast)
 * - ChurchTools: Real API calls (tests auth, persistence, API compatibility)
 */

test.describe('Multi-Window Mode', () => {
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

  test('opens multiple windows for multiple languages', async ({
    extensionPage,
    windowHelper,
  }) => {
    // Navigate to translate tab
    const translateTab = extensionPage.getByTestId('tab-translate');
    await translateTab.click();
    await extensionPage.waitForTimeout(500);

    // Expand Translation Options fieldset
    await extensionPage
      .getByRole('button', { name: /Translation Options/i })
      .click();
    await extensionPage.waitForTimeout(300);

    // Change input language to English
    const inputLangSelect = extensionPage.getByTestId('select-input-lang');
    await inputLangSelect.click();
    await extensionPage.waitForTimeout(300);
    await extensionPage.getByText('🇬🇧 English (United Kingdom)').click();
    await extensionPage.waitForTimeout(300);

    // Configure output languages via UI - select multiple languages
    const outputLangsMultiselect = extensionPage.getByTestId(
      'multiselect-output-langs',
    );
    await outputLangsMultiselect.click();
    await extensionPage.waitForTimeout(500);

    // First deselect English (now the input language) - target the option in the dropdown
    await extensionPage
      .getByLabel('Option List')
      .getByText('🇬🇧 English')
      .click();
    await extensionPage.waitForTimeout(200);

    // Select output languages: German, French, Spanish
    await extensionPage.getByText('🇩🇪 German').click();
    await extensionPage.waitForTimeout(200);

    await extensionPage.getByText('🇫🇷 French').click();
    await extensionPage.waitForTimeout(200);

    await extensionPage.getByText('🇪🇸 Spanish').click();
    await extensionPage.waitForTimeout(200);

    // Close the multiselect dropdown
    await extensionPage.keyboard.press('Escape');
    await extensionPage.waitForTimeout(300);

    // Expand Presentation Options fieldset
    await extensionPage
      .getByRole('button', { name: /Presentation Options/i })
      .click();
    await extensionPage.waitForTimeout(300);

    // Set presentation mode to multi-window
    const presentationModeSelect = extensionPage.locator('#presentation-mode');
    await presentationModeSelect.click();
    await extensionPage.waitForTimeout(300);
    await extensionPage.getByText('Multi-window').click();
    await extensionPage.waitForTimeout(300);

    // Start presentation
    const presentationButton = extensionPage.getByTestId('button-presentation');
    const windowsPromise = windowHelper.waitForWindows(3);
    await presentationButton.click();

    const windows = await windowsPromise;

    // Verify 3 windows opened (one per output language)
    expect(windows.length).toBe(3);
    expect(windowHelper.getWindowCount()).toBe(3);

    // Verify each has language parameter (accepts both "de" and "de-DE" formats)
    for (const win of windows) {
      const url = win.url();
      expect(url).toMatch(/[?&]lang=[a-z]{2}(-[A-Z]{2})?/);
    }
  });

  test('windows have unique URLs with language parameters', async ({
    extensionPage,
    windowHelper,
  }) => {
    // Navigate to translate tab
    const translateTab = extensionPage.getByTestId('tab-translate');
    await translateTab.click();
    await extensionPage.waitForTimeout(500);

    // Expand Translation Options fieldset
    await extensionPage
      .getByRole('button', { name: /Translation Options/i })
      .click();
    await extensionPage.waitForTimeout(300);

    // Change input language from German (default) to English
    const inputLangSelect = extensionPage.getByTestId('select-input-lang');
    await inputLangSelect.click();
    await extensionPage.waitForTimeout(300);
    await extensionPage.getByText('🇬🇧 English (United Kingdom)').click();
    await extensionPage.waitForTimeout(300);

    // Configure output languages via UI - select 2 languages
    const outputLangsMultiselect = extensionPage.getByTestId(
      'multiselect-output-langs',
    );
    await outputLangsMultiselect.click();
    await extensionPage.waitForTimeout(500);

    // First deselect English (now the input language) - target the option in the dropdown
    await extensionPage
      .getByLabel('Option List')
      .getByText('🇬🇧 English')
      .click();
    await extensionPage.waitForTimeout(200);

    // Select output languages: German and French
    await extensionPage.getByText('🇩🇪 German').click();
    await extensionPage.waitForTimeout(200);

    await extensionPage.getByText('🇫🇷 French').click();
    await extensionPage.waitForTimeout(200);

    // Close the multiselect dropdown
    await extensionPage.keyboard.press('Escape');
    await extensionPage.waitForTimeout(300);

    // Expand Presentation Options fieldset
    await extensionPage
      .getByRole('button', { name: /Presentation Options/i })
      .click();
    await extensionPage.waitForTimeout(300);

    // Set presentation mode to multi-window
    const presentationModeSelect = extensionPage.locator('#presentation-mode');
    await presentationModeSelect.click();
    await extensionPage.waitForTimeout(300);
    await extensionPage.getByRole('option', { name: /Multi-window/i }).click();
    await extensionPage.waitForTimeout(300);

    // Settings are in store and ready to use
    const presentationButton = extensionPage.getByTestId('button-presentation');
    const windowsPromise = windowHelper.waitForWindows(2);
    await presentationButton.click();

    const windows = await windowsPromise;

    // Get all URLs
    const urls = windows.map((w) => w.url());

    // Each should have unique language parameter (accepts both "de" and "de-DE" formats)
    const langParams = urls.map((url) => {
      const match = url.match(/[?&]lang=([a-z]{2}(?:-[A-Z]{2})?)/);
      return match ? match[1] : null;
    });

    expect(langParams[0]).not.toBe(langParams[1]);
    expect(langParams).toContain('de');
    expect(langParams).toContain('fr');
  });

  test('closing one window closes all windows and stops recording', async ({
    extensionPage,
    windowHelper,
  }) => {
    // Navigate to translate tab
    const translateTab = extensionPage.getByTestId('tab-translate');
    await translateTab.click();
    await extensionPage.waitForTimeout(500);

    // Expand Translation Options fieldset
    await extensionPage
      .getByRole('button', { name: /Translation Options/i })
      .click();
    await extensionPage.waitForTimeout(300);

    // Change input language from German (default) to English
    const inputLangSelect = extensionPage.getByTestId('select-input-lang');
    await inputLangSelect.click();
    await extensionPage.waitForTimeout(300);
    await extensionPage.getByText('🇬🇧 English (United Kingdom)').click();
    await extensionPage.waitForTimeout(300);

    // Configure output languages via UI - select 3 languages
    const outputLangsMultiselect = extensionPage.getByTestId(
      'multiselect-output-langs',
    );
    await outputLangsMultiselect.click();
    await extensionPage.waitForTimeout(500);

    // First deselect English (now the input language) - target the option in the dropdown
    await extensionPage
      .getByLabel('Option List')
      .getByText('🇬🇧 English')
      .click();
    await extensionPage.waitForTimeout(200);

    await extensionPage.getByText('🇩🇪 German').click();
    await extensionPage.waitForTimeout(200);
    await extensionPage.getByText('🇫🇷 French').click();
    await extensionPage.waitForTimeout(200);
    await extensionPage.getByText('🇪🇸 Spanish').click();
    await extensionPage.waitForTimeout(200);

    await extensionPage.keyboard.press('Escape');
    await extensionPage.waitForTimeout(300);

    // Expand Presentation Options fieldset
    await extensionPage
      .getByRole('button', { name: /Presentation Options/i })
      .click();
    await extensionPage.waitForTimeout(300);

    // Set presentation mode to multi-window
    const presentationModeSelect = extensionPage.locator('#presentation-mode');
    await presentationModeSelect.click();
    await extensionPage.waitForTimeout(300);
    await extensionPage.getByRole('option', { name: /Multi-window/i }).click();
    await extensionPage.waitForTimeout(300);

    // Start presentation
    const presentationButton = extensionPage.getByTestId('button-presentation');
    const windowsPromise = windowHelper.waitForWindows(3);
    await presentationButton.click();

    const windows = await windowsPromise;

    // Verify all 3 windows are open
    expect(windows[0].isClosed()).toBeFalsy();
    expect(windows[1].isClosed()).toBeFalsy();
    expect(windows[2].isClosed()).toBeFalsy();

    // Start recording
    const startRecordingButton = extensionPage.getByTestId(
      'button-start-recording',
    );
    await startRecordingButton.click();
    await extensionPage.waitForTimeout(500);

    // Verify recording is active (stop button should be enabled)
    const stopButton = extensionPage.getByTestId('button-stop');
    await expect(stopButton).toBeEnabled();

    // Close one window (middle window)
    await windows[1].close();

    // Wait for cleanup and cross-window communication
    // The close signal propagates via localStorage and other windows close themselves
    await extensionPage.waitForTimeout(1000);

    // Wait for all windows to finish closing
    await Promise.all([
      windows[0].waitForEvent('close', { timeout: 2000 }).catch(() => {}),
      windows[2].waitForEvent('close', { timeout: 2000 }).catch(() => {}),
    ]);

    // Verify ALL windows are now closed
    expect(windows[0].isClosed()).toBeTruthy();
    expect(windows[1].isClosed()).toBeTruthy();
    expect(windows[2].isClosed()).toBeTruthy();

    // Verify recording has stopped (presentation button should be enabled again)
    await expect(presentationButton).toBeEnabled();
    await expect(stopButton).toBeDisabled();
  });
});
