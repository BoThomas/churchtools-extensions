import { test, expect } from './fixtures/extensionFixture';
import { authenticateChurchTools } from './utils/auth';
import { cleanupE2EData } from './utils/cleanup';
import {
  configureTranslationSettings,
  openPresentationWindows,
  openTestPresentationWindows,
  startTestRecording,
  extractLanguageParams,
  navigateToTab,
  configureApiCredentials,
} from './utils/testHelpers';

/**
 * E2E Tests for Presentation Modes with REAL ChurchTools Integration
 *
 * Tests all presentation modes: Split-screen and Multi-window
 * Includes both real Azure translation mode and test mode with lorem ipsum
 *
 * IMPORTANT: These tests use a REAL ChurchTools instance
 * - Azure SDK: Mocked (stable, no costs, fast)
 * - ChurchTools: Real API calls (tests auth, persistence, API compatibility)
 */

test.describe('Presentation Mode - Split Screen', () => {
  test.beforeEach(async ({ extensionPage }) => {
    await authenticateChurchTools(extensionPage);
    await cleanupE2EData(extensionPage);

    // Navigate to extension
    await extensionPage.goto('/');
    await extensionPage.waitForLoadState('networkidle');

    // Setup API credentials via UI (save to real KV store)
    await configureApiCredentials(extensionPage);
  });

  test('opens split presentation window with multiple languages', async ({
    extensionPage,
    windowHelper,
  }) => {
    // Configure 2+ output languages to enable split view
    await configureTranslationSettings(extensionPage, {
      inputLang: '🇩🇪 German (Germany)',
      outputLangs: ['🇬🇧 English', '🇫🇷 French'],
    });

    const presentationButton = extensionPage.getByTestId('button-presentation');
    const windowPromise = windowHelper.waitForWindow();
    await presentationButton.click();

    const presentationWindow = await windowPromise;
    await presentationWindow.waitForLoadState('networkidle');

    // Verify presentation window opened
    expect(windowHelper.getWindowCount()).toBe(1);

    // Verify window has split-view presentation content (2+ languages)
    const splitView = presentationWindow.getByTestId('split-view-container');
    await expect(splitView).toBeVisible();
  });

  test('propagates translations via localStorage', async ({
    extensionPage,
    windowHelper,
    localStorage,
  }) => {
    // Configure 2+ languages for split view
    await configureTranslationSettings(extensionPage, {
      inputLang: '🇩🇪 German (Germany)',
      outputLangs: ['🇬🇧 English', '🇫🇷 French'],
    });

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

    // Simulate translations for both languages
    await localStorage.setItem(`translator_presentation_${sessionId}`, {
      translations: { en: 'Hello World', fr: 'Bonjour le monde' },
      finalized: { en: [], fr: [] },
      isLive: true,
    });

    // Wait for the presentation window to react to storage event
    await presentationWindow.waitForTimeout(500);

    // Check if presentation window displays the live translations
    const liveTranslationEN = presentationWindow.getByTestId(
      'live-translation-en',
    );
    await expect(liveTranslationEN).toContainText('Hello World');

    const liveTranslationFR = presentationWindow.getByTestId(
      'live-translation-fr',
    );
    await expect(liveTranslationFR).toContainText('Bonjour le monde');
  });

  test('clears display when paused', async ({
    extensionPage,
    windowHelper,
    localStorage,
  }) => {
    await navigateToTab(extensionPage, 'translate');

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

    // Start recording first
    const startRecordingButton = extensionPage.getByTestId(
      'button-start-recording',
    );
    await startRecordingButton.click();
    await extensionPage.waitForTimeout(300);

    // Add some content
    await localStorage.setItem(`translator_presentation_${sessionId}`, {
      translations: { en: 'Test content' },
      finalized: { en: ['Finalized paragraph'] },
      isLive: true,
    });

    await presentationWindow.waitForTimeout(300);

    // Verify content is visible
    const liveTranslation = presentationWindow.getByTestId('live-translation');
    await expect(liveTranslation).toBeVisible();

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
    await navigateToTab(extensionPage, 'translate');

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

    // Main window should still be functional
    await extensionPage.waitForTimeout(500);
    const translateTab = extensionPage.getByTestId('tab-translate');
    await expect(translateTab).toBeVisible();

    // Presentation button should be enabled again
    const presentationButtonAfter = extensionPage.getByTestId(
      'button-presentation',
    );
    await expect(presentationButtonAfter).toBeEnabled();
  });
});

test.describe('Presentation Mode - Split Screen Test', () => {
  test.beforeEach(async ({ extensionPage }) => {
    await authenticateChurchTools(extensionPage);
    await cleanupE2EData(extensionPage);

    await extensionPage.goto('/');
    await extensionPage.waitForLoadState('networkidle');

    // Setup API credentials
    await configureApiCredentials(extensionPage);
  });

  test('opens split test window with lorem ipsum', async ({
    extensionPage,
    windowHelper,
  }) => {
    // Configure 2+ languages for split view
    await configureTranslationSettings(extensionPage, {
      inputLang: '🇩🇪 German (Germany)',
      outputLangs: ['🇬🇧 English', '🇫🇷 French'],
    });

    const windows = await openTestPresentationWindows(
      extensionPage,
      windowHelper,
      1,
    );
    const testWindow = windows[0];

    // Verify split-view container is present (2+ languages)
    const splitView = testWindow.getByTestId('split-view-container');
    await expect(splitView).toBeVisible();
  });

  test('generates lorem ipsum content in split test mode', async ({
    extensionPage,
    windowHelper,
  }) => {
    // Configure 2+ languages for split view
    await configureTranslationSettings(extensionPage, {
      inputLang: '🇩🇪 German (Germany)',
      outputLangs: ['🇬🇧 English', '🇫🇷 French'],
    });

    const windows = await openTestPresentationWindows(
      extensionPage,
      windowHelper,
      1,
    );
    const testWindow = windows[0];

    // Start test generation
    await startTestRecording(extensionPage);

    // Wait for lorem ipsum generation
    await extensionPage.waitForTimeout(3000);

    // Verify content appears in test window
    const content = await testWindow.locator('body').textContent();
    expect(content).toBeTruthy();
    expect(content!.length).toBeGreaterThan(0);
  });
});

test.describe('Presentation Mode - Multi-Window', () => {
  test.beforeEach(async ({ extensionPage }) => {
    await authenticateChurchTools(extensionPage);
    await cleanupE2EData(extensionPage);

    await extensionPage.goto('/');
    await extensionPage.waitForLoadState('networkidle');

    // Setup API credentials
    await configureApiCredentials(extensionPage);
  });

  test('opens multiple windows for multiple languages', async ({
    extensionPage,
    windowHelper,
  }) => {
    await configureTranslationSettings(extensionPage, {
      inputLang: '🇬🇧 English (United Kingdom)',
      outputLangs: ['🇩🇪 German', '🇫🇷 French', '🇪🇸 Spanish'],
      presentationMode: 'Multi-window',
    });

    const windows = await openPresentationWindows(
      extensionPage,
      windowHelper,
      3,
    );

    // Verify 3 windows opened (one per output language)
    expect(windows.length).toBe(3);
    expect(windowHelper.getWindowCount()).toBe(3);

    // Verify each has language parameter
    for (const win of windows) {
      const url = win.url();
      expect(url).toMatch(/[?&]lang=[a-z]{2}(-[A-Z]{2})?/);
    }
  });

  test('windows have unique URLs with language parameters', async ({
    extensionPage,
    windowHelper,
  }) => {
    await configureTranslationSettings(extensionPage, {
      inputLang: '🇬🇧 English (United Kingdom)',
      outputLangs: ['🇩🇪 German', '🇫🇷 French'],
      presentationMode: 'Multi-window',
    });

    const windows = await openPresentationWindows(
      extensionPage,
      windowHelper,
      2,
    );

    // Extract language parameters from URLs
    const langParams = extractLanguageParams(windows);

    // Each should have unique language parameter
    expect(langParams[0]).not.toBe(langParams[1]);
    expect(langParams).toContain('de');
    expect(langParams).toContain('fr');
  });

  test('each window shows only its assigned language', async ({
    extensionPage,
    windowHelper,
    localStorage,
  }) => {
    await configureTranslationSettings(extensionPage, {
      inputLang: '🇬🇧 English (United Kingdom)',
      outputLangs: ['🇩🇪 German', '🇫🇷 French'],
      presentationMode: 'Multi-window',
    });

    const windows = await openPresentationWindows(
      extensionPage,
      windowHelper,
      2,
    );

    // Get session ID
    const settingsKeys = await localStorage.keys();
    const sessionKey = settingsKeys.find((key) =>
      key.startsWith('translator_settings_'),
    );
    const sessionId = sessionKey!.replace('translator_settings_', '');

    // Add translations for all languages
    await localStorage.setItem(`translator_presentation_${sessionId}`, {
      translations: {
        de: 'Hallo Welt',
        fr: 'Bonjour le monde',
      },
      finalized: { de: [], fr: [] },
      isLive: true,
    });

    await extensionPage.waitForTimeout(500);

    // Extract language parameters to identify windows
    const langParams = extractLanguageParams(windows);
    const deWindowIndex = langParams.indexOf('de');
    const frWindowIndex = langParams.indexOf('fr');

    // Verify German window shows only German
    await expect(
      windows[deWindowIndex].getByTestId('live-translation'),
    ).toContainText('Hallo Welt');

    // Verify French window shows only French
    await expect(
      windows[frWindowIndex].getByTestId('live-translation'),
    ).toContainText('Bonjour le monde');
  });

  test('closing one window closes all windows and stops recording', async ({
    extensionPage,
    windowHelper,
  }) => {
    await configureTranslationSettings(extensionPage, {
      inputLang: '🇬🇧 English (United Kingdom)',
      outputLangs: ['🇩🇪 German', '🇫🇷 French', '🇪🇸 Spanish'],
      presentationMode: 'Multi-window',
    });

    const windows = await openPresentationWindows(
      extensionPage,
      windowHelper,
      3,
    );

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

    // Verify recording is active
    const stopButton = extensionPage.getByTestId('button-stop');
    await expect(stopButton).toBeEnabled();

    // Close one window
    await windows[1].close();

    // Wait for cleanup and cross-window communication
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

    // Verify recording has stopped
    const presentationButton = extensionPage.getByTestId('button-presentation');
    await expect(presentationButton).toBeEnabled();
    await expect(stopButton).toBeDisabled();
  });
});

test.describe('Presentation Mode - Multi-Window Test', () => {
  test.beforeEach(async ({ extensionPage }) => {
    await authenticateChurchTools(extensionPage);
    await cleanupE2EData(extensionPage);

    await extensionPage.goto('/');
    await extensionPage.waitForLoadState('networkidle');

    // Setup API credentials
    await configureApiCredentials(extensionPage);
  });

  test('opens multiple test windows with lorem ipsum', async ({
    extensionPage,
    windowHelper,
  }) => {
    await configureTranslationSettings(extensionPage, {
      inputLang: '🇬🇧 English (United Kingdom)',
      outputLangs: ['🇩🇪 German', '🇫🇷 French', '🇪🇸 Spanish'],
      presentationMode: 'Multi-window',
    });

    const windows = await openTestPresentationWindows(
      extensionPage,
      windowHelper,
      3,
    );

    // Verify 3 windows opened
    expect(windows.length).toBe(3);
    expect(windowHelper.getWindowCount()).toBe(3);

    // Verify each has language parameter
    for (const win of windows) {
      const url = win.url();
      expect(url).toMatch(/[?&]lang=[a-z]{2}(-[A-Z]{2})?/);
    }
  });

  test('test windows have unique language parameters', async ({
    extensionPage,
    windowHelper,
  }) => {
    await configureTranslationSettings(extensionPage, {
      inputLang: '🇬🇧 English (United Kingdom)',
      outputLangs: ['🇩🇪 German', '🇫🇷 French'],
      presentationMode: 'Multi-window',
    });

    const windows = await openTestPresentationWindows(
      extensionPage,
      windowHelper,
      2,
    );

    // Extract language parameters from URLs
    const langParams = extractLanguageParams(windows);

    // Each should have unique language parameter
    expect(langParams[0]).not.toBe(langParams[1]);
    expect(langParams).toContain('de');
    expect(langParams).toContain('fr');
  });

  test('generates lorem ipsum content in multi-window test mode', async ({
    extensionPage,
    windowHelper,
  }) => {
    await configureTranslationSettings(extensionPage, {
      inputLang: '🇬🇧 English (United Kingdom)',
      outputLangs: ['🇩🇪 German'],
      presentationMode: 'Multi-window',
    });

    const windows = await openTestPresentationWindows(
      extensionPage,
      windowHelper,
      1,
    );
    const testWindow = windows[0];

    // Start test generation
    await startTestRecording(extensionPage);

    // Wait for lorem ipsum generation
    await extensionPage.waitForTimeout(3000);

    // Verify content appears in test window
    const content = await testWindow.locator('body').textContent();
    expect(content).toBeTruthy();
    expect(content!.length).toBeGreaterThan(0);
  });

  test('closing one test window closes all test windows', async ({
    extensionPage,
    windowHelper,
  }) => {
    await configureTranslationSettings(extensionPage, {
      inputLang: '🇬🇧 English (United Kingdom)',
      outputLangs: ['🇩🇪 German', '🇫🇷 French', '🇪🇸 Spanish'],
      presentationMode: 'Multi-window',
    });

    const windows = await openTestPresentationWindows(
      extensionPage,
      windowHelper,
      3,
    );

    // Verify all 3 windows are open
    expect(windows[0].isClosed()).toBeFalsy();
    expect(windows[1].isClosed()).toBeFalsy();
    expect(windows[2].isClosed()).toBeFalsy();

    // Start test generation
    await startTestRecording(extensionPage);
    await extensionPage.waitForTimeout(500);

    // Verify test is running
    const stopButton = extensionPage.getByTestId('button-stop');
    await expect(stopButton).toBeEnabled();

    // Close one window
    await windows[1].close();

    // Wait for cleanup and cross-window communication
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

    // Verify test has stopped
    const testPresentationButton = extensionPage.getByTestId(
      'button-test-presentation',
    );
    await expect(testPresentationButton).toBeEnabled();
    await expect(stopButton).toBeDisabled();
  });
});
