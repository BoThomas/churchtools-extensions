import { test, expect } from './fixtures/extensionFixture';
import { authenticateChurchTools } from './utils/auth';
import { cleanupE2EData } from './utils/cleanup';
import {
  configureTranslationSettings,
  openPresentationWindows,
  openTestPresentationWindows,
  startTestTranslation,
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

  test('real split-screen end-to-end (uses Azure SDK mock)', async ({
    extensionPage,
    windowHelper,
  }) => {
    // Configure 2+ output languages to enable split view
    // Use same config as test-mode to match mock scenario
    await configureTranslationSettings(extensionPage, {
      inputLang: '🇬🇧 English (United Kingdom)',
      outputLangs: ['🇩🇪 German', '🇫🇷 French'],
    });

    // Start presentation window
    const presentationButton = extensionPage.getByTestId('button-presentation');
    const windowPromise = windowHelper.waitForWindow();
    await presentationButton.click();

    const presentationWindow = await windowPromise;
    await presentationWindow.waitForLoadState('networkidle');

    // Verify split view is present
    const splitView = presentationWindow.getByTestId('split-view-container');
    await expect(splitView).toBeVisible();

    // Verify waiting overlay is visible with correct message
    const waitingOverlay = presentationWindow.getByTestId('waiting-overlay');
    await expect(waitingOverlay).toBeVisible();
    const overlayText = await waitingOverlay.textContent();
    expect(overlayText).toContain('Start Translation');
    expect(overlayText).toContain('control panel');

    // Fullscreen instructions should be visible initially
    const fullscreenHint = presentationWindow.getByTestId(
      'fullscreen-instructions',
    );
    await expect(fullscreenHint).toBeVisible();

    // Start translation to trigger Azure SDK mock outputs
    const startTranslationButton = extensionPage.getByTestId(
      'button-start-translation',
    );
    await startTranslationButton.click();
    // Verify waiting overlay disappears after starting translation
    await expect(waitingOverlay).not.toBeVisible();

    // Verify fullscreen hint also disappears when translation starts
    await expect(fullscreenHint).not.toBeVisible();

    // Wait for mocked Azure SDK to produce translations
    await extensionPage.waitForTimeout(1500);

    // Check for expected mocked translations in split view columns
    // Mock 'basic' scenario produces: "Hello world" → de: "Hallo Welt", fr: "Bonjour le monde"
    // Content may be in live translation or finalized paragraph depending on timing
    const germanPane = presentationWindow.getByTestId('language-pane-de');
    const frenchPane = presentationWindow.getByTestId('language-pane-fr');

    await expect(germanPane).toBeVisible();
    const germanContent = await germanPane.textContent();
    expect(germanContent).toContain('Hallo');

    await expect(frenchPane).toBeVisible();
    const frenchContent = await frenchPane.textContent();
    expect(frenchContent).toContain('Bonjour');

    // Pause to verify clearing behavior
    const pauseButton = extensionPage.getByTestId('button-pause');
    await pauseButton.click();
    await presentationWindow.waitForTimeout(300);

    // After pause, content should be cleared
    const germanContentAfterPause = await germanPane.textContent();
    const frenchContentAfterPause = await frenchPane.textContent();
    expect(germanContentAfterPause).not.toContain('Hallo');
    expect(frenchContentAfterPause).not.toContain('Bonjour');

    // Resume to verify content reappears
    const resumeButton = extensionPage.getByTestId('button-resume');
    await resumeButton.click();
    await extensionPage.waitForTimeout(1500);

    // Verify content reappears after resume
    const germanContentAfterResume = await germanPane.textContent();
    const frenchContentAfterResume = await frenchPane.textContent();
    expect(germanContentAfterResume).toContain('Hallo');
    expect(frenchContentAfterResume).toContain('Bonjour');

    // Close window and verify main window remains functional
    await presentationWindow.close();
    expect(presentationWindow.isClosed()).toBeTruthy();
    await extensionPage.waitForTimeout(300);
    const presentationButtonAfter = extensionPage.getByTestId(
      'button-presentation',
    );
    await expect(presentationButtonAfter).toBeEnabled();
  });

  test('stop button closes split-screen window with confirm', async ({
    extensionPage,
    windowHelper,
  }) => {
    // Configure 2+ output languages to enable split view
    await configureTranslationSettings(extensionPage, {
      inputLang: '🇬🇧 English (United Kingdom)',
      outputLangs: ['🇩🇪 German', '🇫🇷 French'],
    });

    // Start presentation window
    const presentationButton = extensionPage.getByTestId('button-presentation');
    const windowPromise = windowHelper.waitForWindow();
    await presentationButton.click();

    const presentationWindow = await windowPromise;
    await presentationWindow.waitForLoadState('networkidle');

    // Verify split view is present
    const splitView = presentationWindow.getByTestId('split-view-container');
    await expect(splitView).toBeVisible();

    // Start translation
    const startTranslationButton = extensionPage.getByTestId(
      'button-start-translation',
    );
    await startTranslationButton.click();
    // Wait for mocked Azure SDK to produce translations
    await extensionPage.waitForTimeout(1500);

    // Verify content is present
    const germanPane = presentationWindow.getByTestId('language-pane-de');
    await expect(germanPane).toBeVisible();
    const germanContent = await germanPane.textContent();
    expect(germanContent).toContain('Hallo');

    // Click stop button to trigger confirm dialog
    const stopButton = extensionPage.getByTestId('button-stop');
    await stopButton.click();

    // Wait for PrimeVue confirm dialog to appear
    const confirmDialog = extensionPage.locator('[role="alertdialog"]');
    await expect(confirmDialog).toBeVisible();

    // Verify dialog content
    await expect(confirmDialog).toContainText('stop');

    // Click the "Stop" button in the dialog
    const dialogStopButton = confirmDialog.getByRole('button', {
      name: /stop/i,
    });

    // Set up close listener before clicking to catch fast closure
    const closePromise = presentationWindow.waitForEvent('close', {
      timeout: 5000,
    });
    await dialogStopButton.click();

    // Wait for window to close after confirmation
    await closePromise;
    expect(presentationWindow.isClosed()).toBeTruthy();

    // Verify translation has stopped
    await extensionPage.waitForTimeout(300);
    await expect(stopButton).toBeDisabled();
    const presentationButtonAfter = extensionPage.getByTestId(
      'button-presentation',
    );
    await expect(presentationButtonAfter).toBeEnabled();
  });

  test('test split-screen end-to-end (lorem ipsum)', async ({
    extensionPage,
    windowHelper,
  }) => {
    // Configure 2+ languages for split view
    await configureTranslationSettings(extensionPage, {
      inputLang: '🇬🇧 English (United Kingdom)',
      outputLangs: ['🇩🇪 German', '🇫🇷 French'],
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

    // Verify waiting overlay is visible with "Start Test" message
    const waitingOverlay = testWindow.getByTestId('waiting-overlay');
    await expect(waitingOverlay).toBeVisible();
    const overlayText = await waitingOverlay.textContent();
    expect(overlayText).toContain('Start Test');
    expect(overlayText).toContain('control panel');

    // Fullscreen instructions should be visible initially
    const fullscreenHint = testWindow.getByTestId('fullscreen-instructions');
    await expect(fullscreenHint).toBeVisible();

    // Start lorem ipsum generation
    await startTestTranslation(extensionPage);

    // Verify waiting overlay disappears after starting test
    await expect(waitingOverlay).not.toBeVisible();

    // Verify fullscreen hint also disappears when test starts
    await expect(fullscreenHint).not.toBeVisible();

    // Wait for lorem ipsum generation
    await extensionPage.waitForTimeout(3000);

    // Verify content appears in test window
    const germanPane = testWindow.getByTestId('language-pane-de');
    const frenchPane = testWindow.getByTestId('language-pane-fr');

    await expect(germanPane).toBeVisible();
    const germanContent = await germanPane.textContent();
    expect(germanContent).toBeTruthy();
    expect(germanContent!.length).toBeGreaterThan(0);

    await expect(frenchPane).toBeVisible();
    const frenchContent = await frenchPane.textContent();
    expect(frenchContent).toBeTruthy();
    expect(frenchContent!.length).toBeGreaterThan(0);

    // Pause to verify clearing behavior
    const pauseButton = extensionPage.getByTestId('button-pause');
    await pauseButton.click();
    await testWindow.waitForTimeout(300);

    // After pause, content should be cleared
    const germanContentAfterPause = await germanPane.textContent();
    const frenchContentAfterPause = await frenchPane.textContent();
    expect(germanContentAfterPause?.length || 0).toBeLessThan(
      germanContent!.length,
    );
    expect(frenchContentAfterPause?.length || 0).toBeLessThan(
      frenchContent!.length,
    );

    // Resume to verify content reappears
    const resumeButton = extensionPage.getByTestId('button-resume');
    await resumeButton.click();
    await extensionPage.waitForTimeout(2000);

    // Verify content reappears after resume
    const germanContentAfterResume = await germanPane.textContent();
    const frenchContentAfterResume = await frenchPane.textContent();
    expect(germanContentAfterResume!.length).toBeGreaterThan(
      germanContentAfterPause?.length || 0,
    );
    expect(frenchContentAfterResume!.length).toBeGreaterThan(
      frenchContentAfterPause?.length || 0,
    );

    // Close test window and ensure button is enabled again
    await testWindow.close();
    expect(testWindow.isClosed()).toBeTruthy();
    const testPresentationButton = extensionPage.getByTestId(
      'button-test-presentation',
    );
    await expect(testPresentationButton).toBeEnabled();
  });
});

test.describe('Presentation Mode - Multi-Window', () => {
  test.beforeEach(async ({ extensionPage }) => {
    await authenticateChurchTools(extensionPage);
    await cleanupE2EData(extensionPage);

    // Navigate to extension
    await extensionPage.goto('/');
    await extensionPage.waitForLoadState('networkidle');

    // Setup API credentials via UI (save to real KV store)
    await configureApiCredentials(extensionPage);
  });

  test('real multi-window end-to-end (uses Azure SDK mock)', async ({
    extensionPage,
    windowHelper,
  }) => {
    // Configure for multi-window mode with 3 output languages
    await configureTranslationSettings(extensionPage, {
      inputLang: '🇬🇧 English (United Kingdom)',
      outputLangs: ['🇩🇪 German', '🇫🇷 French', '🇪🇸 Spanish'],
      presentationMode: 'Multi-window',
    });

    // Open presentation windows - one per output language
    const windows = await openPresentationWindows(
      extensionPage,
      windowHelper,
      3,
    );

    // Verify correct number of windows opened
    expect(windows.length).toBe(3);
    expect(windowHelper.getWindowCount()).toBe(3);

    // Verify each window has unique language parameter in URL
    const langParams = extractLanguageParams(windows);
    expect(new Set(langParams).size).toBe(3); // All unique
    expect(langParams).toContain('de');
    expect(langParams).toContain('fr');
    expect(langParams).toContain('es');

    // Identify windows by their language parameter
    const deWindowIndex = langParams.indexOf('de');
    const frWindowIndex = langParams.indexOf('fr');
    const deWindow = windows[deWindowIndex];
    const frWindow = windows[frWindowIndex];

    // Verify waiting overlay is visible in German window with language name
    const deWaitingOverlay = deWindow.getByTestId('waiting-overlay');
    await expect(deWaitingOverlay).toBeVisible();
    const deOverlayText = await deWaitingOverlay.textContent();
    expect(deOverlayText).toContain('German');
    expect(deOverlayText).toContain('Start Translation');
    expect(deOverlayText).toContain('control panel');

    // Verify waiting overlay is visible in French window with language name
    const frWaitingOverlay = frWindow.getByTestId('waiting-overlay');
    await expect(frWaitingOverlay).toBeVisible();
    const frOverlayText = await frWaitingOverlay.textContent();
    expect(frOverlayText).toContain('French');
    expect(frOverlayText).toContain('Start Translation');
    expect(frOverlayText).toContain('control panel');

    // Fullscreen instructions should be visible initially in all windows
    const deFullscreenHint = deWindow.getByTestId('fullscreen-instructions');
    const frFullscreenHint = frWindow.getByTestId('fullscreen-instructions');
    await expect(deFullscreenHint).toBeVisible();
    await expect(frFullscreenHint).toBeVisible();

    // Start translation to trigger Azure SDK mock outputs
    const startTranslationButton = extensionPage.getByTestId(
      'button-start-translation',
    );
    await startTranslationButton.click();
    // Verify waiting overlays disappear in all windows after starting translation
    await expect(deWaitingOverlay).not.toBeVisible();
    await expect(frWaitingOverlay).not.toBeVisible();

    // Verify fullscreen hints also disappear when translation starts
    await expect(deFullscreenHint).not.toBeVisible();
    await expect(frFullscreenHint).not.toBeVisible();

    // Wait for mocked Azure SDK to produce translations
    // Mock 'basic' scenario produces: "Hello world" → de: "Hallo Welt", fr: "Bonjour le monde"
    await extensionPage.waitForTimeout(1500);

    // Verify German window shows only German content
    const deContainer = deWindow.getByTestId('single-language-container');
    await expect(deContainer).toBeVisible();
    const deContent = await deContainer.textContent();
    expect(deContent).toContain('Hallo Welt');

    // Verify French window shows only French content
    const frContainer = frWindow.getByTestId('single-language-container');
    await expect(frContainer).toBeVisible();
    const frContent = await frContainer.textContent();
    expect(frContent).toContain('Bonjour le monde');

    // Verify translation is active
    const stopButton = extensionPage.getByTestId('button-stop');
    await expect(stopButton).toBeEnabled();

    // Pause to verify clearing behavior
    const pauseButton = extensionPage.getByTestId('button-pause');
    await pauseButton.click();
    await deWindow.waitForTimeout(300);

    // After pause, content should be cleared in all windows
    const deContentAfterPause = await deContainer.textContent();
    const frContentAfterPause = await frContainer.textContent();
    expect(deContentAfterPause).not.toContain('Hallo Welt');
    expect(frContentAfterPause).not.toContain('Bonjour le monde');

    // Resume to verify content reappears
    const resumeButton = extensionPage.getByTestId('button-resume');
    await resumeButton.click();
    await extensionPage.waitForTimeout(1500);

    // Verify content reappears after resume in all windows
    const deContentAfterResume = await deContainer.textContent();
    const frContentAfterResume = await frContainer.textContent();
    expect(deContentAfterResume).toContain('Hallo Welt');
    expect(frContentAfterResume).toContain('Bonjour le monde');

    // Close one window - should close all windows and stop translation
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

    // Verify translation has stopped and button is enabled again
    const presentationButton = extensionPage.getByTestId('button-presentation');
    await expect(presentationButton).toBeEnabled();
    await expect(stopButton).toBeDisabled();
  });

  test('stop button closes all multi-windows with confirm', async ({
    extensionPage,
    windowHelper,
  }) => {
    // Configure for multi-window mode with 3 output languages
    await configureTranslationSettings(extensionPage, {
      inputLang: '🇬🇧 English (United Kingdom)',
      outputLangs: ['🇩🇪 German', '🇫🇷 French', '🇪🇸 Spanish'],
      presentationMode: 'Multi-window',
    });

    // Open presentation windows - one per output language
    const windows = await openPresentationWindows(
      extensionPage,
      windowHelper,
      3,
    );

    // Verify correct number of windows opened
    expect(windows.length).toBe(3);
    expect(windowHelper.getWindowCount()).toBe(3);

    // Start translation
    const startTranslationButton = extensionPage.getByTestId(
      'button-start-translation',
    );
    await startTranslationButton.click();
    // Wait for mocked Azure SDK to produce translations
    await extensionPage.waitForTimeout(1500);

    // Verify content is present in at least one window
    const langParams = extractLanguageParams(windows);
    const deWindowIndex = langParams.indexOf('de');
    const deWindow = windows[deWindowIndex];
    const deContainer = deWindow.getByTestId('single-language-container');
    await expect(deContainer).toBeVisible();
    const deContent = await deContainer.textContent();
    expect(deContent).toContain('Hallo Welt');

    // Click stop button to trigger confirm dialog
    const stopButton = extensionPage.getByTestId('button-stop');
    await stopButton.click();

    // Wait for PrimeVue confirm dialog to appear
    const confirmDialog = extensionPage.locator('[role="alertdialog"]');
    await expect(confirmDialog).toBeVisible();

    // Verify dialog content
    await expect(confirmDialog).toContainText('stop');

    // Click the "Stop" button in the dialog
    const dialogStopButton = confirmDialog.getByRole('button', {
      name: /stop/i,
    });

    // Set up close listeners before clicking to catch fast closures
    const closePromises = windows.map((w) =>
      w.waitForEvent('close', { timeout: 5000 }).catch(() => {}),
    );
    await dialogStopButton.click();

    // Wait for all windows to close after confirmation
    await Promise.all(closePromises);

    // Verify ALL windows are now closed
    expect(windows[0].isClosed()).toBeTruthy();
    expect(windows[1].isClosed()).toBeTruthy();
    expect(windows[2].isClosed()).toBeTruthy();

    // Verify translation has stopped
    await extensionPage.waitForTimeout(300);
    await expect(stopButton).toBeDisabled();
    const presentationButton = extensionPage.getByTestId('button-presentation');
    await expect(presentationButton).toBeEnabled();
  });

  test('test multi-window end-to-end (lorem ipsum)', async ({
    extensionPage,
    windowHelper,
  }) => {
    // Configure for multi-window mode with 3 output languages
    await configureTranslationSettings(extensionPage, {
      inputLang: '🇬🇧 English (United Kingdom)',
      outputLangs: ['🇩🇪 German', '🇫🇷 French', '🇪🇸 Spanish'],
      presentationMode: 'Multi-window',
    });

    // Open test presentation windows
    const windows = await openTestPresentationWindows(
      extensionPage,
      windowHelper,
      3,
    );

    // Verify correct number of windows opened
    expect(windows.length).toBe(3);
    expect(windowHelper.getWindowCount()).toBe(3);

    // Verify each window has unique language parameter in URL
    const langParams = extractLanguageParams(windows);
    expect(new Set(langParams).size).toBe(3); // All unique
    expect(langParams).toContain('de');
    expect(langParams).toContain('fr');
    expect(langParams).toContain('es');

    // Verify waiting overlay is visible in all windows with "Start Test" message
    const deWindowIndex = langParams.indexOf('de');
    const deWindow = windows[deWindowIndex];
    const deWaitingOverlay = deWindow.getByTestId('waiting-overlay');
    await expect(deWaitingOverlay).toBeVisible();
    const deOverlayText = await deWaitingOverlay.textContent();
    expect(deOverlayText).toContain('German');
    expect(deOverlayText).toContain('Start Test');
    expect(deOverlayText).toContain('control panel');

    const frWindowIndex = langParams.indexOf('fr');
    const frWindow = windows[frWindowIndex];
    const frWaitingOverlay = frWindow.getByTestId('waiting-overlay');
    await expect(frWaitingOverlay).toBeVisible();
    const frOverlayText = await frWaitingOverlay.textContent();
    expect(frOverlayText).toContain('French');
    expect(frOverlayText).toContain('Start Test');
    expect(frOverlayText).toContain('control panel');

    // Fullscreen instructions should be visible initially in all windows
    const deFullscreenHint = deWindow.getByTestId('fullscreen-instructions');
    const frFullscreenHint = frWindow.getByTestId('fullscreen-instructions');
    await expect(deFullscreenHint).toBeVisible();
    await expect(frFullscreenHint).toBeVisible();

    // Start lorem ipsum generation
    await startTestTranslation(extensionPage);

    // Verify waiting overlays disappear in all windows after starting test
    await expect(deWaitingOverlay).not.toBeVisible();
    await expect(frWaitingOverlay).not.toBeVisible();

    // Verify fullscreen hints also disappear when test starts
    await expect(deFullscreenHint).not.toBeVisible();
    await expect(frFullscreenHint).not.toBeVisible();

    // Wait for lorem ipsum content to be generated
    await extensionPage.waitForTimeout(3000);

    // Verify content appears in all test windows and store containers
    const containers = [];
    const contentsBefore = [];
    for (const testWindow of windows) {
      const container = testWindow.getByTestId('single-language-container');
      await expect(container).toBeVisible();
      const content = await container.textContent();
      expect(content).toBeTruthy();
      expect(content!.length).toBeGreaterThan(0);
      containers.push(container);
      contentsBefore.push(content!);
    }

    // Verify test is running
    const stopButton = extensionPage.getByTestId('button-stop');
    await expect(stopButton).toBeEnabled();

    // Pause to verify clearing behavior
    const pauseButton = extensionPage.getByTestId('button-pause');
    await pauseButton.click();
    await windows[0].waitForTimeout(300);

    // After pause, content should be cleared in all windows
    for (let i = 0; i < containers.length; i++) {
      const contentAfterPause = await containers[i].textContent();
      expect(contentAfterPause?.length || 0).toBeLessThan(
        contentsBefore[i].length,
      );
    }

    // Resume to verify content reappears
    const resumeButton = extensionPage.getByTestId('button-resume');
    await resumeButton.click();
    await extensionPage.waitForTimeout(2000);

    // Verify content reappears after resume in all windows
    for (const container of containers) {
      const contentAfterResume = await container.textContent();
      expect(contentAfterResume).toBeTruthy();
      expect(contentAfterResume!.length).toBeGreaterThan(0);
    }

    // Close one window - should close all windows and stop test
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

    // Verify test has stopped and button is enabled again
    const testPresentationButton = extensionPage.getByTestId(
      'button-test-presentation',
    );
    await expect(testPresentationButton).toBeEnabled();
    await expect(stopButton).toBeDisabled();
  });
});
