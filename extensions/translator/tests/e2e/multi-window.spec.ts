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
    localStorage,
  }) => {
    // Set multi-window mode with 3 languages
    await localStorage.setItem('translator_settings', {
      inputLanguage: 'en-US',
      outputLanguages: ['de-DE', 'fr-FR', 'es-ES'],
      profanityOption: 'raw',
      stablePartialResultThreshold: '3',
      phraseList: '',
      presentation: {
        mode: 'multi-window',
        showInputLanguage: false,
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

    // Start presentation
    const presentationButton = extensionPage.getByTestId('button-presentation');
    const windowsPromise = windowHelper.waitForWindows(3);
    await presentationButton.click();

    const windows = await windowsPromise;

    // Verify 3 windows opened
    expect(windows.length).toBe(3);
    expect(windowHelper.getWindowCount()).toBe(3);

    // Verify each has language parameter
    for (const win of windows) {
      const url = win.url();
      expect(url).toMatch(/[?&]lang=[a-z]{2}-[A-Z]{2}/);
    }
  });

  test('each window displays only its assigned language', async ({
    extensionPage,
    windowHelper,
    localStorage,
  }) => {
    // This test is already covered in presentation-mode.spec.ts
    // with the "each window shows only its assigned language" test
    test.skip();
  });

  test('windows have unique URLs with language parameters', async ({
    extensionPage,
    windowHelper,
    localStorage,
  }) => {
    await localStorage.setItem('translator_settings', {
      inputLanguage: 'en-US',
      outputLanguages: ['de-DE', 'fr-FR'],
      profanityOption: 'raw',
      stablePartialResultThreshold: '3',
      phraseList: '',
      presentation: {
        mode: 'multi-window',
        showInputLanguage: false,
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

    const presentationButton = extensionPage.getByTestId('button-presentation');
    const windowsPromise = windowHelper.waitForWindows(2);
    await presentationButton.click();

    const windows = await windowsPromise;

    // Get all URLs
    const urls = windows.map((w) => w.url());

    // Each should have unique language parameter
    const langParams = urls.map((url) => {
      const match = url.match(/[?&]lang=([a-z]{2}-[A-Z]{2})/);
      return match ? match[1] : null;
    });

    expect(langParams[0]).not.toBe(langParams[1]);
    expect(langParams).toContain('de-DE');
    expect(langParams).toContain('fr-FR');
  });

  test('closing one window does not affect others', async ({
    extensionPage,
    windowHelper,
    localStorage,
  }) => {
    await localStorage.setItem('translator_settings', {
      inputLanguage: 'en-US',
      outputLanguages: ['de-DE', 'fr-FR', 'es-ES'],
      profanityOption: 'raw',
      stablePartialResultThreshold: '3',
      phraseList: '',
      presentation: {
        mode: 'multi-window',
        showInputLanguage: false,
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

    const presentationButton = extensionPage.getByTestId('button-presentation');
    const windowsPromise = windowHelper.waitForWindows(3);
    await presentationButton.click();

    const windows = await windowsPromise;

    // Close middle window
    await windows[1].close();

    // Wait a bit
    await extensionPage.waitForTimeout(300);

    // Verify other windows still open
    expect(windows[0].isClosed()).toBeFalsy();
    expect(windows[2].isClosed()).toBeFalsy();
    expect(windowHelper.getWindowCount()).toBe(2);
  });

  test('closing all windows stops presentation', async ({
    extensionPage,
    windowHelper,
    localStorage,
  }) => {
    await localStorage.setItem('translator_settings', {
      inputLanguage: 'en-US',
      outputLanguages: ['de-DE', 'fr-FR'],
      profanityOption: 'raw',
      stablePartialResultThreshold: '3',
      phraseList: '',
      presentation: {
        mode: 'multi-window',
        showInputLanguage: false,
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

    const presentationButton = extensionPage.getByTestId('button-presentation');
    const windowsPromise = windowHelper.waitForWindows(2);
    await presentationButton.click();

    const windows = await windowsPromise;

    // Close all windows
    await windowHelper.closeAll();

    // Wait for cleanup
    await extensionPage.waitForTimeout(500);

    // Verify presentation button is enabled again (can start new presentation)
    await expect(presentationButton).toBeEnabled();
  });

  test('window titles reflect the language', async ({
    extensionPage,
    windowHelper,
    localStorage,
  }) => {
    // Window titles are typically "Translator - <language>" or similar
    // This depends on the actual implementation
    test.skip();
  });
});

test.describe('Multi-Window - Translation Distribution', () => {
  test.beforeEach(async ({ extensionPage, localStorage }) => {
    await authenticateChurchTools(extensionPage);
    await localStorage.setItem('translator_api_settings', {
      azureApiKey: 'mock-api-key-12345',
      azureRegion: 'westeurope',
    });

    await extensionPage.goto('/');
  });

  test('translations are correctly routed to language-specific windows', async ({
    extensionPage,
    windowHelper,
    localStorage,
  }) => {
    // This test is covered in presentation-mode.spec.ts
    test.skip();
  });

  test('live vs finalized styling works per window', async ({
    extensionPage,
    windowHelper,
    localStorage,
  }) => {
    // Styling differences are tested at component level in integration tests
    // E2E focuses on window management and routing
    test.skip();
  });
});
