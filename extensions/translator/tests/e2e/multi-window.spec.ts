import { test, expect } from './fixtures/extensionFixture';
import { authenticateChurchTools } from './utils/auth';
import { cleanupE2EData } from './utils/cleanup';
import {
  configureTranslationSettings,
  openPresentationWindows,
  openTestPresentationWindows,
  startTestRecording,
  extractLanguageParams,
} from './utils/translatorHelpers';

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

    // Each should have unique language parameter (accepts both "de" and "de-DE" formats)
    expect(langParams[0]).not.toBe(langParams[1]);
    expect(langParams).toContain('de');
    expect(langParams).toContain('fr');
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
    const presentationButton = extensionPage.getByTestId('button-presentation');
    await expect(presentationButton).toBeEnabled();
    await expect(stopButton).toBeDisabled();
  });
});

test.describe('Multi-Window Mode - Test Presentation', () => {
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

    // Verify 3 windows opened (one per output language)
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

  test('generates lorem ipsum content in test mode', async ({
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

    // Start test recording to generate lorem ipsum
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

    // Start test to begin lorem ipsum generation
    await startTestRecording(extensionPage);
    await extensionPage.waitForTimeout(500);

    // Verify test is running (stop button should be enabled)
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

    // Verify test has stopped (test presentation button should be enabled again)
    const testPresentationButton = extensionPage.getByTestId(
      'button-test-presentation',
    );
    await expect(testPresentationButton).toBeEnabled();
    await expect(stopButton).toBeDisabled();
  });
});
