import { test, expect } from './fixtures/extensionFixture';
import { authenticateChurchTools } from './utils/auth';
import { cleanupE2EData } from './utils/cleanup';
import {
  configureTranslationSettings,
  configureApiCredentials,
  navigateToTab,
  configureWebPubSub,
} from './utils/testHelpers';

/**
 * E2E Tests for Resumable Sessions with REAL ChurchTools Integration
 *
 * Tests session crash recovery and resumption functionality
 * Uses sequential flows within test blocks to minimize test runtime
 *
 * IMPORTANT: These tests use a REAL ChurchTools instance
 * - Azure SDK: Mocked (stable, no costs, fast)
 * - ChurchTools: Real API calls (tests auth, persistence, API compatibility)
 */

const MOCK_WEBPUBSUB_URL = 'https://mock-webpubsub.local/api/negotiate';

test.describe('Resumable Sessions - Complete Flows', () => {
  test.beforeEach(async ({ extensionPage }) => {
    await authenticateChurchTools(extensionPage);
    await cleanupE2EData(extensionPage);

    // Navigate to extension
    await extensionPage.goto('/');
    await extensionPage.waitForLoadState('networkidle');

    // Mock Azure Function validation endpoint for WebPubSub
    await extensionPage.route('**/api/negotiate', async (route) => {
      const postData = route.request().postData();
      let parsed: any = {};
      if (postData) {
        try {
          parsed = JSON.parse(postData);
        } catch {
          parsed = {};
        }
      }

      const secret: string = parsed?.secret ?? '';
      const role = secret.includes('operator') ? 'operator' : 'reader';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          url: 'wss://mock-webpubsub.local/client',
          role,
        }),
      });
    });

    // Mock WebSocket connection
    await extensionPage.routeWebSocket(
      'wss://mock-webpubsub.local/client',
      (ws) => {
        // Accept the connection and keep it open
        ws.onMessage((message) => {
          // Echo back any messages or handle as needed
          console.log('WebSocket message received:', message);
        });
      },
    );

    // Setup API credentials via UI (save to real KV store)
    await configureApiCredentials(extensionPage);

    // Setup WebPubSub for streamed sessions (required for session persistence)
    // This also reloads the page to ensure settings are loaded
    await configureWebPubSub(extensionPage);
  });

  test('Complete Resume Flow - Presentation Mode', async ({
    extensionPage,
    windowHelper,
  }) => {
    // ==========================================
    // Step 1: Configure settings and prepare session
    // ==========================================
    await configureTranslationSettings(extensionPage, {
      inputLang: '🇩🇪 German',
      outputLangs: ['🇬🇧 English'],
    });

    // Enable presentation mode
    const presentationToggle = extensionPage.getByTestId(
      'toggle-presentation-enabled',
    );
    if (await presentationToggle.isVisible()) {
      await presentationToggle.check();
    }

    // Expand Session Options to access streamed session toggle
    const sessionOptionsButton = extensionPage
      .getByTestId('fieldset-session-options')
      .locator('[data-pc-section="togglebutton"]');
    const sessionOptionsExpanded =
      (await sessionOptionsButton.getAttribute('aria-expanded')) === 'true';
    if (!sessionOptionsExpanded) {
      await sessionOptionsButton.click();
      await extensionPage.waitForTimeout(300);
    }

    // Enable streamed session mode by clicking the "On" button
    const sessionFieldset = extensionPage.getByTestId(
      'fieldset-session-options',
    );
    const enableButton = sessionFieldset
      .locator('[data-pc-name="pctogglebutton"]')
      .filter({ hasText: 'On' });
    await enableButton.click();
    await extensionPage.waitForTimeout(300);

    // Click "Prepare Live Translation"
    const prepareButton = extensionPage.getByTestId('button-presentation');
    await expect(prepareButton).toBeVisible();

    const windowPromise = windowHelper.waitForWindow();
    await prepareButton.click();

    const presentationWindow = await windowPromise;
    await presentationWindow.waitForLoadState('networkidle');

    // Verify waiting overlay is visible (confirms presentation window opened)
    const waitingOverlay = presentationWindow.getByTestId('waiting-overlay');
    await expect(waitingOverlay).toBeVisible();

    // Start translation to create a session
    const startButton = extensionPage.getByTestId('button-start-translation');
    await expect(startButton).toBeVisible();
    await startButton.click();

    // Wait for session to be fully created and persisted
    await extensionPage.waitForTimeout(2000);

    // Verify the waiting overlay disappears (indicates translation started)
    await expect(waitingOverlay).not.toBeVisible();

    // ==========================================
    // Step 2: Simulate crash (reload page)
    // ==========================================
    await extensionPage.reload();
    await extensionPage.waitForLoadState('networkidle');

    // ==========================================
    // Step 3: Assert resume dialog appears
    // ==========================================
    const resumeDialog = extensionPage.getByRole('dialog');
    await expect(resumeDialog).toBeVisible();

    const dialogHeader = resumeDialog.getByText('Active Session Found');
    await expect(dialogHeader).toBeVisible();

    const dialogContent = await resumeDialog.textContent();
    expect(dialogContent).toContain('Session started');
    expect(dialogContent).toContain('paused');

    // ==========================================
    // Step 4: Click resume
    // ==========================================
    const resumeButton = resumeDialog.getByRole('button', { name: 'Resume' });
    await resumeButton.click();

    // Wait for session restoration
    await extensionPage.waitForTimeout(500);

    // ==========================================
    // Step 5: Assert presentation windows reopen
    // ==========================================
    // Note: After reload, we need to wait for the new presentation window
    const newPresentationWindow = await windowHelper.waitForWindow();
    await newPresentationWindow.waitForLoadState('networkidle');

    const newWaitingOverlay =
      newPresentationWindow.getByTestId('waiting-overlay');
    await expect(newWaitingOverlay).toBeVisible();

    // ==========================================
    // Step 6: Assert UI in "prepared" state
    // ==========================================
    // Verify Start Translation button is visible (prepared state)
    const startTranslationButton = extensionPage.getByTestId(
      'button-start-translation',
    );
    await expect(startTranslationButton).toBeVisible();

    // Verify status shows paused/prepared
    const statusText = await extensionPage
      .getByTestId('translation-status')
      .textContent();
    expect(statusText?.toLowerCase()).toContain('paused');

    // ==========================================
    // Step 7: Click start translation
    // ==========================================
    await startTranslationButton.click();

    // Wait for translation to start
    await extensionPage.waitForTimeout(500);

    // ==========================================
    // Step 8: Assert translation starts
    // ==========================================
    // Waiting overlay should disappear
    await expect(newWaitingOverlay).not.toBeVisible();

    // Status should change to running
    const runningStatusText = await extensionPage
      .getByTestId('translation-status')
      .textContent();
    expect(runningStatusText?.toLowerCase()).toContain('running');

    // ==========================================
    // Step 9: Click stop and verify cleanup
    // ==========================================
    const stopButton = extensionPage.getByTestId('button-stop');
    await stopButton.click();

    // Confirm stop dialog
    const confirmDialog = extensionPage.getByRole('dialog');
    await expect(confirmDialog).toBeVisible();

    const confirmButton = confirmDialog.getByRole('button', { name: 'Stop' });
    await confirmButton.click();

    // Wait for cleanup
    await extensionPage.waitForTimeout(500);

    // ==========================================
    // Step 10: Verify no resume dialog after proper cleanup
    // ==========================================
    await extensionPage.reload();
    await extensionPage.waitForLoadState('networkidle');

    // Should NOT see resume dialog
    const resumeDialogAfterCleanup = extensionPage.getByText(
      'Active Session Found',
    );
    await expect(resumeDialogAfterCleanup).not.toBeVisible();
  });

  test('Combined Features & Edge Cases', async ({
    extensionPage,
    windowHelper,
  }) => {
    // ==========================================
    // Flow A: Resume with both presentation and streamed session
    // ==========================================

    // Configure settings with both modes enabled
    await configureTranslationSettings(extensionPage, {
      inputLang: '🇩🇪 German',
      outputLangs: ['🇬🇧 English', '🇫🇷 French'],
    });

    // Enable both presentation and streamed session
    const presentationToggle = extensionPage.getByTestId(
      'toggle-presentation-enabled',
    );
    if (await presentationToggle.isVisible()) {
      await presentationToggle.check();
    }

    // Expand Session Options to access streamed session toggle
    const sessionOptionsButton = extensionPage
      .getByTestId('fieldset-session-options')
      .locator('[data-pc-section="togglebutton"]');
    const sessionOptionsExpanded =
      (await sessionOptionsButton.getAttribute('aria-expanded')) === 'true';
    if (!sessionOptionsExpanded) {
      await sessionOptionsButton.click();
      await extensionPage.waitForTimeout(300);
    }

    // Enable streamed session mode by clicking the "On" button
    const sessionFieldset = extensionPage.getByTestId(
      'fieldset-session-options',
    );
    const enableButton = sessionFieldset
      .locator('[data-pc-name="pctogglebutton"]')
      .filter({ hasText: 'On' });
    await enableButton.click();
    await extensionPage.waitForTimeout(300);

    // Prepare session
    const prepareButton = extensionPage.getByTestId('button-presentation');
    const windowPromise = windowHelper.waitForWindow();
    await prepareButton.click();

    const presentationWindow = await windowPromise;
    await presentationWindow.waitForLoadState('networkidle');

    // Verify both features active (presentation window + streamed session)
    await expect(
      presentationWindow.getByTestId('split-view-container'),
    ).toBeVisible();

    // Verify streamed session is created (check for session indicator)
    const sessionIndicator = extensionPage.getByTestId(
      'streamed-session-status',
    );
    if (await sessionIndicator.isVisible()) {
      const sessionStatus = await sessionIndicator.textContent();
      expect(sessionStatus?.toLowerCase()).toContain('running');
    }

    // Start translation to create a session
    const startBtn = extensionPage.getByTestId('button-start-translation');
    await expect(startBtn).toBeVisible();
    await startBtn.click();
    await extensionPage.waitForTimeout(500);

    // Simulate crash
    await extensionPage.reload();
    await extensionPage.waitForLoadState('networkidle');

    // Resume dialog should appear
    const resumeDialog = extensionPage.getByRole('dialog');
    await expect(resumeDialog).toBeVisible();

    // Click resume
    const resumeButton = resumeDialog.getByRole('button', { name: 'Resume' });
    await resumeButton.click();

    await extensionPage.waitForTimeout(500);

    // Assert both features restored
    const newPresentationWindow = await windowHelper.waitForWindow();
    await newPresentationWindow.waitForLoadState('networkidle');
    await expect(
      newPresentationWindow.getByTestId('split-view-container'),
    ).toBeVisible();

    // Start and stop to cleanup
    const startButton = extensionPage.getByTestId('button-start-translation');
    await startButton.click();
    await extensionPage.waitForTimeout(500);

    const stopButton = extensionPage.getByTestId('button-stop');
    await stopButton.click();

    const confirmDialog = extensionPage.getByRole('dialog');
    if (await confirmDialog.isVisible()) {
      await confirmDialog.getByRole('button', { name: 'Stop' }).click();
    }

    await extensionPage.waitForTimeout(500);

    // ==========================================
    // Flow B: Abort instead of resume
    // ==========================================

    // Prepare new session
    await configureTranslationSettings(extensionPage, {
      inputLang: '🇩🇪 German',
      outputLangs: ['🇬🇧 English'],
    });

    // Expand Session Options to access streamed session toggle
    const sessionOptionsButton2 = extensionPage
      .getByTestId('fieldset-session-options')
      .locator('[data-pc-section="togglebutton"]');
    const sessionOptionsExpanded2 =
      (await sessionOptionsButton2.getAttribute('aria-expanded')) === 'true';
    if (!sessionOptionsExpanded2) {
      await sessionOptionsButton2.click();
      await extensionPage.waitForTimeout(300);
    }

    // Enable streamed session mode by clicking the "On" button
    const sessionFieldset2 = extensionPage.getByTestId(
      'fieldset-session-options',
    );
    const enableButton2 = sessionFieldset2
      .locator('[data-pc-name="pctogglebutton"]')
      .filter({ hasText: 'On' });
    await enableButton2.click();
    await extensionPage.waitForTimeout(300);

    const prepareButton2 = extensionPage.getByTestId('button-presentation');
    const windowPromise2 = windowHelper.waitForWindow();
    await prepareButton2.click();

    const presentationWindow2 = await windowPromise2;
    await presentationWindow2.waitForLoadState('networkidle');

    // Start translation to create a session
    const startBtn2 = extensionPage.getByTestId('button-start-translation');
    await expect(startBtn2).toBeVisible();
    await startBtn2.click();
    await extensionPage.waitForTimeout(500);

    // Simulate crash
    await extensionPage.reload();
    await extensionPage.waitForLoadState('networkidle');

    // Resume dialog appears
    const resumeDialog2 = extensionPage.getByRole('dialog');
    await expect(resumeDialog2).toBeVisible();

    // Click "End Session" instead of Resume
    const endSessionButton = resumeDialog2.getByRole('button', {
      name: 'End Session',
    });
    await endSessionButton.click();

    await extensionPage.waitForTimeout(500);

    // Verify session properly ended - no resume dialog after reload
    await extensionPage.reload();
    await extensionPage.waitForLoadState('networkidle');

    const resumeDialogAfterEnd = extensionPage.getByText(
      'Active Session Found',
    );
    await expect(resumeDialogAfterEnd).not.toBeVisible();

    // ==========================================
    // Flow C: Settings preservation
    // ==========================================

    // Start session with specific settings
    await configureTranslationSettings(extensionPage, {
      inputLang: '🇬🇧 English (United Kingdom)',
      outputLangs: ['🇩🇪 German', '🇫🇷 French'],
    });

    // Set presentation mode to multi-window
    await extensionPage
      .getByTestId('select-presentation-mode')
      .selectOption('multi-window');

    // Expand Session Options to access streamed session toggle
    const sessionOptionsButton3 = extensionPage
      .getByTestId('fieldset-session-options')
      .locator('[data-pc-section="togglebutton"]');
    const sessionOptionsExpanded3 =
      (await sessionOptionsButton3.getAttribute('aria-expanded')) === 'true';
    if (!sessionOptionsExpanded3) {
      await sessionOptionsButton3.click();
      await extensionPage.waitForTimeout(300);
    }

    // Enable streamed session mode by clicking the "On" button
    const sessionFieldset3 = extensionPage.getByTestId(
      'fieldset-session-options',
    );
    const enableButton3 = sessionFieldset3
      .locator('[data-pc-name="pctogglebutton"]')
      .filter({ hasText: 'On' });
    await enableButton3.click();
    await extensionPage.waitForTimeout(300);

    const prepareButton3 = extensionPage.getByTestId('button-presentation');
    await prepareButton3.click();

    // Wait for multi-window to open
    await extensionPage.waitForTimeout(1000);

    // Start translation to create a session
    const startBtn3 = extensionPage.getByTestId('button-start-translation');
    await expect(startBtn3).toBeVisible();
    await startBtn3.click();
    await extensionPage.waitForTimeout(500);

    // Change settings on page (different from session settings)
    await navigateToTab(extensionPage, 'settings');
    await configureTranslationSettings(extensionPage, {
      inputLang: '🇫🇷 French',
      outputLangs: ['🇮🇹 Italian'],
    });

    // Navigate back to translate tab

    // Simulate crash
    await extensionPage.reload();
    await extensionPage.waitForLoadState('networkidle');

    // Resume dialog appears
    const resumeDialog3 = extensionPage.getByRole('dialog');
    await expect(resumeDialog3).toBeVisible();

    // Click resume
    await resumeDialog3.getByRole('button', { name: 'Resume' }).click();
    await extensionPage.waitForTimeout(500);

    // Assert restored session uses ORIGINAL settings
    // Check that input language is restored to English
    const inputLangDisplay = await extensionPage
      .getByTestId('input-language-display')
      .textContent();
    expect(inputLangDisplay).toContain('English');

    // Check output languages restored
    const outputLangsDisplay = await extensionPage
      .getByTestId('output-languages-display')
      .textContent();
    expect(outputLangsDisplay).toContain('German');
    expect(outputLangsDisplay).toContain('French');

    // Cleanup
    const stopButton2 = extensionPage.getByTestId('button-stop');
    await stopButton2.click();

    const confirmDialog2 = extensionPage.getByRole('dialog');
    if (await confirmDialog2.isVisible()) {
      await confirmDialog2.getByRole('button', { name: 'Stop' }).click();
    }

    await extensionPage.waitForTimeout(500);
  });
});
