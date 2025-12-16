import { test, expect } from './fixtures/extensionFixture';
import { authenticateChurchTools } from './utils/auth';
import { cleanupE2EData } from './utils/cleanup';

/**
 * E2E Tests for Presentation Mode with REAL ChurchTools Integration
 *
 * Tests the multi-window functionality of the translator's presentation mode,
 * including window opening, translation propagation, and pause/resume behavior.
 *
 * IMPORTANT: These tests use a REAL ChurchTools instance
 * - Azure SDK: Mocked (stable, no costs, fast)
 * - ChurchTools: Real API calls (tests auth, persistence, API compatibility)
 */

test.describe('Presentation Mode - Split Screen', () => {
  test.beforeEach(async ({ extensionPage }) => {
    await authenticateChurchTools(extensionPage);
    // Navigate to extension
    await extensionPage.goto('/');
    await extensionPage.waitForLoadState('networkidle');

    // Setup API credentials via UI (save to real KV store)
    await extensionPage.getByTestId('tab-settings').click();
    await extensionPage.getByTestId('input-api-key').fill('mock-api-key-12345');
    await extensionPage.getByTestId('input-api-region').fill('westeurope');
    await extensionPage.getByTestId('button-save-settings').click();
    await extensionPage.waitForTimeout(1000);

    // Navigate to Translate tab
    const translateTab = extensionPage.getByTestId('tab-translate');
    await translateTab.click();
    await extensionPage.waitForTimeout(500);
  });

  // Cleanup after all tests in this block
  test.afterAll(async ({ extensionPage }) => {
    await cleanupE2EData(extensionPage);
  });

  test('opens split presentation window with configured languages', async ({
    extensionPage,
    windowHelper,
  }) => {
    // Click the Presentation button
    const presentationButton = extensionPage.getByTestId('button-presentation');
    await expect(presentationButton).toBeVisible();

    // Wait for a new window to open
    const windowPromise = windowHelper.waitForWindow();
    await presentationButton.click();

    const presentationWindow = await windowPromise;
    await presentationWindow.waitForLoadState('networkidle');

    // Verify presentation window opened
    expect(windowHelper.getWindowCount()).toBe(1);

    // Verify window has presentation content
    const splitView = presentationWindow.getByTestId('split-view-container');
    await expect(splitView).toBeVisible();
  });

  test('propagates translations via localStorage', async ({
    extensionPage,
    windowHelper,
    localStorage,
  }) => {
    // Start presentation mode
    const presentationButton = extensionPage.getByTestId('button-presentation');
    const windowPromise = windowHelper.waitForWindow();
    await presentationButton.click();

    const presentationWindow = await windowPromise;
    await presentationWindow.waitForLoadState('networkidle');

    // Get the session ID from localStorage (generated when presentation starts)
    const settingsKeys = await localStorage.keys();
    const sessionKey = settingsKeys.find((key) =>
      key.startsWith('translator_settings_'),
    );
    expect(sessionKey).toBeDefined();

    const sessionId = sessionKey!.replace('translator_settings_', '');

    // Simulate a translation by setting localStorage
    await localStorage.setItem(`translator_presentation_${sessionId}`, {
      translations: { 'en-US': 'Hello World', 'de-DE': 'Hallo Welt' },
      finalized: { 'en-US': [], 'de-DE': [] },
      isLive: true,
    });

    // Wait for the presentation window to react to storage event
    await presentationWindow.waitForTimeout(500);

    // Check if presentation window displays the live translations
    const liveTranslationEN = presentationWindow.getByTestId(
      'live-translation-en-US',
    );
    const liveTranslationDE = presentationWindow.getByTestId(
      'live-translation-de-DE',
    );

    await expect(liveTranslationEN).toContainText('Hello World');
    await expect(liveTranslationDE).toContainText('Hallo Welt');
  });

  test('clears display when paused', async ({
    extensionPage,
    windowHelper,
    localStorage,
  }) => {
    // Start presentation mode
    const presentationButton = extensionPage.getByTestId('button-presentation');
    const windowPromise = windowHelper.waitForWindow();
    await presentationButton.click();

    const presentationWindow = await windowPromise;
    await presentationWindow.waitForLoadState('networkidle');

    // Get session ID
    const settingsKeys = await localStorage.keys();
    const sessionKey = settingsKeys.find((key) =>
      key.startsWith('translator_settings_'),
    );
    const sessionId = sessionKey!.replace('translator_settings_', '');

    // Add some content first
    await localStorage.setItem(`translator_presentation_${sessionId}`, {
      translations: { 'en-US': 'Test content' },
      finalized: { 'en-US': ['Finalized paragraph'] },
      isLive: true,
    });

    await presentationWindow.waitForTimeout(300);

    // Verify content is visible
    const liveTranslation = presentationWindow.getByTestId(
      'live-translation-en-US',
    );
    await expect(liveTranslation).toBeVisible();

    // Click pause button in main window
    // First need to start recording (presentation must be started)
    const startRecordingButton = extensionPage.getByTestId(
      'button-start-recording',
    );
    await startRecordingButton.click();
    await extensionPage.waitForTimeout(300);

    // Now pause
    const pauseButton = extensionPage.getByTestId('button-pause');
    await pauseButton.click();
    await presentationWindow.waitForTimeout(300);

    // Verify presentation window is cleared
    await expect(liveTranslation).not.toBeVisible();
  });

  test('handles window closing gracefully', async ({
    extensionPage,
    windowHelper,
  }) => {
    // Start presentation
    const presentationButton = extensionPage.getByTestId('button-presentation');
    const windowPromise = windowHelper.waitForWindow();
    await presentationButton.click();

    const presentationWindow = await windowPromise;
    await presentationWindow.waitForLoadState('networkidle');

    // Close the presentation window
    await presentationWindow.close();

    // Verify the window is closed
    expect(presentationWindow.isClosed()).toBeTruthy();

    // Main window should still be functional and show stopped state
    await extensionPage.waitForTimeout(500);
    const translateTab = extensionPage.getByTestId('tab-translate');
    await expect(translateTab).toBeVisible();

    // Presentation button should be enabled again (not disabled)
    const presentationButtonAfter = extensionPage.getByTestId(
      'button-presentation',
    );
    await expect(presentationButtonAfter).toBeEnabled();
  });
});

test.describe('Presentation Mode - Multi-Window', () => {
  test.beforeEach(async ({ extensionPage, localStorage }) => {
    await authenticateChurchTools(extensionPage);
    await localStorage.setItem('translator_api_settings', {
      azureApiKey: 'mock-api-key-12345',
      azureRegion: 'westeurope',
    });

    // Set settings with multi-window mode enabled
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
  });

  test('opens one window per language', async ({
    extensionPage,
    windowHelper,
  }) => {
    // Start presentation - should open 2 windows (for de-DE and fr-FR)
    const presentationButton = extensionPage.getByTestId('button-presentation');

    // Wait for multiple windows
    const windowsPromise = windowHelper.waitForWindows(2);
    await presentationButton.click();

    const windows = await windowsPromise;

    // Verify we have 2 presentation windows
    expect(windows.length).toBe(2);
    expect(windowHelper.getWindowCount()).toBe(2);

    // Each window should have loaded
    for (const win of windows) {
      await win.waitForLoadState('networkidle');
      await expect(win.getByTestId('single-language-container')).toBeVisible();
    }
  });

  test('each window shows only its assigned language', async ({
    extensionPage,
    windowHelper,
    localStorage,
  }) => {
    // Start presentation
    const presentationButton = extensionPage.getByTestId('button-presentation');
    const windowsPromise = windowHelper.waitForWindows(2);
    await presentationButton.click();

    const windows = await windowsPromise;

    // Get session ID
    const settingsKeys = await localStorage.keys();
    const sessionKey = settingsKeys.find((key) =>
      key.startsWith('translator_settings_'),
    );
    const sessionId = sessionKey!.replace('translator_settings_', '');

    // Add translations for all languages
    await localStorage.setItem(`translator_presentation_${sessionId}`, {
      translations: {
        'de-DE': 'Hallo Welt',
        'fr-FR': 'Bonjour le monde',
      },
      finalized: { 'de-DE': [], 'fr-FR': [] },
      isLive: true,
    });

    await extensionPage.waitForTimeout(500);

    // Check each window only shows its language
    // Window URLs should have ?lang=de-DE or ?lang=fr-FR
    const deWindow = await windowHelper.findWindowsByUrl('lang=de-DE');
    const frWindow = await windowHelper.findWindowsByUrl('lang=fr-FR');

    expect(deWindow.length).toBe(1);
    expect(frWindow.length).toBe(1);

    // Verify German window shows only German
    await expect(deWindow[0].getByTestId('live-translation')).toContainText(
      'Hallo Welt',
    );

    // Verify French window shows only French
    await expect(frWindow[0].getByTestId('live-translation')).toContainText(
      'Bonjour le monde',
    );
  });
});
