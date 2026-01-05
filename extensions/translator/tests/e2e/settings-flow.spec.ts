import { test, expect } from './fixtures/extensionFixture';
import { authenticateChurchTools } from './utils/auth';
import { cleanupE2EData } from './utils/cleanup';
import {
  navigateToTab,
  configureApiCredentials,
  createVariant,
  configureTranslationSettings,
  configurePresentationStyling,
  openTestPresentationWindows,
  startTestTranslation,
} from './utils/testHelpers';

const MOCK_WEBPUBSUB_URL = 'https://mock-webpubsub.local/api/negotiate';

/**
 * E2E Tests for Settings Flow with REAL ChurchTools Integration
 *
 * Tests the complete user flow for configuring the translator extension,
 * including API settings, variants, and preferences.
 *
 * IMPORTANT: These tests use a REAL ChurchTools instance for authentic testing
 * - Azure SDK: Mocked (stable, no costs, fast)
 * - ChurchTools: Real API calls to test instance (tests auth, persistence, API compatibility)
 */

test.describe('Settings Flow - First Time User', () => {
  test.beforeEach(async ({ extensionPage }) => {
    await authenticateChurchTools(extensionPage);
    // Clean up both KV store and localStorage BEFORE navigation
    await cleanupE2EData(extensionPage);

    // Navigate to extension
    await extensionPage.goto('/');
    await extensionPage.waitForLoadState('networkidle');
  });

  // Cleanup after each test
  test.afterEach(async ({ extensionPage }) => {
    await cleanupE2EData(extensionPage, false);
  });

  test('complete first-time user flow: API credentials setup, persistence, and default variant creation', async ({
    extensionPage,
  }) => {
    await extensionPage.waitForLoadState('networkidle');

    // Step 1: Navigate to Translate tab - verify warning is shown
    await navigateToTab(extensionPage, 'translate');

    const warningMessage = extensionPage.getByText(
      /configure.*azure.*api.*credentials/i,
    );
    await expect(warningMessage).toBeVisible();

    // Step 2: Navigate to Settings tab and enter credentials
    await navigateToTab(extensionPage, 'settings');

    const apiKeyInput = extensionPage.locator('#api-key input');
    await apiKeyInput.fill('test-api-key-12345');

    const regionInput = extensionPage.getByTestId('input-api-region');
    await regionInput.fill('westeurope');

    const saveButton = extensionPage.getByTestId('button-save-settings');
    await saveButton.click();

    // Wait for save to complete (real API call)
    await extensionPage.waitForTimeout(1000);

    // Step 3: Navigate to Translate tab - verify warning disappeared
    await navigateToTab(extensionPage, 'translate', 500);
    await expect(warningMessage).not.toBeVisible();

    // Step 4: Verify default variant was created
    const variantSelect = extensionPage.getByTestId('select-variant');
    await expect(variantSelect).toBeVisible();

    const saveAsButton = extensionPage.getByTestId('button-save-as-variant');
    await expect(saveAsButton).toBeVisible();

    // Step 5: Verify settings are persisted by reloading the page
    await extensionPage.reload();
    await extensionPage.waitForLoadState('networkidle');

    // Navigate to Translate tab - verify warning is still hidden after reload
    await expect(warningMessage).not.toBeVisible();

    // Verify variant controls still visible
    await expect(variantSelect).toBeVisible();

    // Step 6: Navigate to settings to verify the saved credentials
    await navigateToTab(extensionPage, 'settings', 0);

    const savedApiKey = await extensionPage
      .locator('#api-key input')
      .inputValue();
    const savedRegion = await extensionPage
      .getByTestId('input-api-region')
      .inputValue();

    expect(savedApiKey).toBe('test-api-key-12345');
    expect(savedRegion).toBe('westeurope');
  });
});

test.describe('Settings Flow - Configuration Management', () => {
  test.beforeEach(async ({ extensionPage }) => {
    await authenticateChurchTools(extensionPage);
    await cleanupE2EData(extensionPage);

    // Navigate to extension
    await extensionPage.goto('/');
    await extensionPage.waitForLoadState('networkidle');

    // Setup API credentials via UI (save to real KV store)
    await configureApiCredentials(extensionPage);

    // Navigate to Translate tab
    await navigateToTab(extensionPage, 'translate');
  });

  test('configures presentation mode based on language count and show input language setting', async ({
    extensionPage,
  }) => {
    await extensionPage.waitForLoadState('networkidle');

    // Expand Presentation Options
    const presentationOptionsButton = extensionPage
      .getByTestId('fieldset-presentation-options')
      .locator('[data-pc-section="togglebutton"]');
    const presentationOptionsExpanded =
      (await presentationOptionsButton.getAttribute('aria-expanded')) ===
      'true';
    if (!presentationOptionsExpanded) {
      await presentationOptionsButton.click();
      await extensionPage.waitForTimeout(300);
    }

    const presentationModeSelect = extensionPage.locator('#presentation-mode');

    // Step 1: With only 1 output language, presentation mode should be disabled
    await configureTranslationSettings(extensionPage, {
      inputLang: '🇬🇧 English (United Kingdom)',
      outputLangs: ['🇩🇪 German'],
    });

    await extensionPage.waitForTimeout(500);
    // PrimeVue Select uses data-p attribute with "disabled" value when disabled
    await expect(presentationModeSelect).toHaveAttribute('data-p', 'disabled');

    // Step 2: Add second output language - presentation mode should be enabled
    await configureTranslationSettings(extensionPage, {
      inputLang: '🇬🇧 English (United Kingdom)',
      outputLangs: ['🇩🇪 German', '🇫🇷 French'],
    });

    await extensionPage.waitForTimeout(500);
    // PrimeVue Select - when enabled, data-p attribute should not be "disabled"
    await expect(presentationModeSelect).not.toHaveAttribute(
      'data-p',
      'disabled',
    );

    // Step 3: Change to split-screen mode
    await presentationModeSelect.click();
    await extensionPage.waitForTimeout(300);
    await extensionPage.getByRole('option', { name: /Split-screen/i }).click();
    await extensionPage.waitForTimeout(300);

    // Verify the selection by checking the displayed text
    await expect(presentationModeSelect).toContainText('Split-screen');

    // Step 4: Change to multi-window mode
    await presentationModeSelect.click();
    await extensionPage.waitForTimeout(300);
    await extensionPage.getByRole('option', { name: /Multi-window/i }).click();
    await extensionPage.waitForTimeout(300);

    // Verify the selection by checking the displayed text
    await expect(presentationModeSelect).toContainText('Multi-window');

    // Step 5: Test interaction with "Show Input Language" checkbox
    // Expand presentation options again if collapsed
    const showInputLangCheckbox = extensionPage.locator('#show-input-language');
    // PrimeVue Checkbox - check if not already checked, then click
    const isChecked =
      await showInputLangCheckbox.getAttribute('data-p-checked');
    if (isChecked !== 'true') {
      await showInputLangCheckbox.click();
    }
    await extensionPage.waitForTimeout(300);

    // Verify presentation mode is still enabled with 2 output + 1 input = 3 languages
    await expect(presentationModeSelect).not.toHaveAttribute(
      'data-p',
      'disabled',
    );

    // Step 6: Switch back to split-screen mode to test language limit warning
    await presentationModeSelect.click();
    await extensionPage.waitForTimeout(300);
    await extensionPage.getByRole('option', { name: /Split-screen/i }).click();
    await extensionPage.waitForTimeout(300);

    // Step 7: Add 4 more output languages (total 6 output + 1 input = 7) and verify warning
    await configureTranslationSettings(extensionPage, {
      inputLang: '🇬🇧 English (United Kingdom)',
      outputLangs: [
        '🇩🇪 German',
        '🇫🇷 French',
        '🇪🇸 Spanish',
        '🇮🇹 Italian',
        '🇵🇹 Portuguese',
        '🇳🇱 Dutch',
      ],
    });

    // Check for the warning about too many languages for split mode (with input language)
    const tooManyLanguagesWithInputWarning = extensionPage.getByText(
      /Split-screen presentation mode supports up to 6 languages total.*1 input/i,
    );
    await expect(tooManyLanguagesWithInputWarning).toBeVisible();

    // Step 8: Uncheck "Show Input Language" - warning should disappear
    // (6 output languages without input = exactly at the limit, not exceeding)
    // PrimeVue Checkbox - click if currently checked to uncheck it
    const isStillChecked =
      await showInputLangCheckbox.getAttribute('data-p-checked');
    if (isStillChecked === 'true') {
      await showInputLangCheckbox.click();
    }
    await extensionPage.waitForTimeout(300);

    // Warning should disappear (6 output languages is exactly the limit, not over)
    await expect(tooManyLanguagesWithInputWarning).not.toBeVisible();

    // Step 9: Add one more language to exceed the limit without input language
    await configureTranslationSettings(extensionPage, {
      inputLang: '🇬🇧 English (United Kingdom)',
      outputLangs: [
        '🇩🇪 German',
        '🇫🇷 French',
        '🇪🇸 Spanish',
        '🇮🇹 Italian',
        '🇵🇹 Portuguese',
        '🇳🇱 Dutch',
        '🇷🇺 Russian',
      ],
    });

    // Check for different warning message (without input language)
    const tooManyOutputLanguagesWarning = extensionPage.getByText(
      /Split-screen presentation mode supports up to 6 output languages.*You have 7 selected/i,
    );
    await expect(tooManyOutputLanguagesWarning).toBeVisible();

    // Step 10: Switch to multi-window mode - warning should disappear
    await presentationModeSelect.click();
    await extensionPage.waitForTimeout(300);
    await extensionPage.getByRole('option', { name: /Multi-window/i }).click();
    await extensionPage.waitForTimeout(300);

    await expect(tooManyOutputLanguagesWarning).not.toBeVisible();
  });

  test('manages variants: create, modify, save, switch, and delete', async ({
    extensionPage,
  }) => {
    await extensionPage.waitForLoadState('networkidle');

    // Step 1: Verify default variant exists and delete button is disabled
    const variantSelect = extensionPage.getByTestId('select-variant');
    await expect(variantSelect).toBeVisible();

    const deleteButton = extensionPage.getByTestId('button-delete-variant');
    await expect(deleteButton).toBeDisabled(); // Can't delete the only/default variant

    // Step 2: Create first custom variant "Sunday Service"
    await createVariant(extensionPage, 'Sunday Service');

    // Verify the variant was created and is now selected
    await extensionPage.waitForTimeout(500);
    const selectedVariantText = await variantSelect.textContent();
    expect(selectedVariantText).toContain('Sunday Service');

    // Step 3: Make changes to trigger unsaved state
    await configureTranslationSettings(extensionPage, {
      inputLang: '🇩🇪 German (Germany)',
      outputLangs: ['🇬🇧 English', '🇫🇷 French'],
    });

    // Verify unsaved changes warning appears
    const unsavedWarning = extensionPage.getByText(/you have unsaved changes/i);
    await expect(unsavedWarning).toBeVisible();

    // Step 4: Save the changes
    const saveButton = extensionPage.getByTestId('button-save-variant');
    await expect(saveButton).toBeEnabled();
    await saveButton.click();
    await extensionPage.waitForTimeout(1000); // Wait for save

    // Verify unsaved warning disappears
    await expect(unsavedWarning).not.toBeVisible();

    // Step 5: Create second custom variant "Wednesday Evening"
    await createVariant(extensionPage, 'Wednesday Evening');

    // Verify the variant was created and is now selected
    await extensionPage.waitForTimeout(500);
    const selectedWednesdayText = await variantSelect.textContent();
    expect(selectedWednesdayText).toContain('Wednesday Evening');

    // Configure different settings for this variant
    await configureTranslationSettings(extensionPage, {
      inputLang: '🇬🇧 English (United Kingdom)',
      outputLangs: ['🇩🇪 German', '🇪🇸 Spanish'],
    });

    // Save it
    await saveButton.click();
    await extensionPage.waitForTimeout(1000);

    // Step 6: Switch between variants
    // Click variant selector and select "Sunday Service"
    await variantSelect.click();
    await extensionPage.waitForTimeout(300);

    // Verify "Sunday Service" option exists in the listbox
    const sundayServiceOption = extensionPage
      .locator('[role="listbox"]')
      .getByText('Sunday Service');
    await expect(sundayServiceOption).toBeVisible();

    await sundayServiceOption.click();
    await extensionPage.waitForTimeout(500);

    // Step 7: Delete the "Sunday Service" variant
    await expect(deleteButton).toBeEnabled(); // Should be enabled now
    await deleteButton.click();

    // Wait for PrimeVue ConfirmDialog to appear - it uses a portal with role="alertdialog"
    await extensionPage.waitForTimeout(500);

    // PrimeVue ConfirmDialog uses role="alertdialog" not "dialog"
    const confirmDialog = extensionPage.locator('[role="alertdialog"]');
    await confirmDialog.waitFor({ state: 'visible', timeout: 10000 });

    // Find and click the delete/accept button in the dialog
    const confirmButton = confirmDialog.getByRole('button', {
      name: /delete/i,
    });
    await confirmButton.click();
    await extensionPage.waitForTimeout(1000);

    // Step 8: Switch to "Wednesday Evening" variant
    await variantSelect.click();
    await extensionPage.waitForTimeout(300);
    await extensionPage
      .locator('[role="listbox"]')
      .getByText('Wednesday Evening')
      .click();
    await extensionPage.waitForTimeout(500);

    // Step 9: Delete the "Wednesday Evening" variant
    await deleteButton.click();
    await extensionPage.waitForTimeout(500);
    const secondConfirmDialog = extensionPage.locator('[role="alertdialog"]');
    await secondConfirmDialog.waitFor({ state: 'visible', timeout: 10000 });
    const secondConfirmButton = secondConfirmDialog.getByRole('button', {
      name: /delete/i,
    });
    await secondConfirmButton.click();
    await extensionPage.waitForTimeout(1000);

    // Step 10: Verify we're back to default variant and delete is disabled
    await expect(deleteButton).toBeDisabled(); // Can't delete last variant
  });

  test('configures presentation styling options (font, colors, background, etc.)', async ({
    extensionPage,
    windowHelper,
  }) => {
    await extensionPage.waitForLoadState('networkidle');

    // Step 1: Create a custom variant for testing presentation styles
    await createVariant(extensionPage, 'Styling Test Variant');
    await extensionPage.waitForTimeout(500);

    // Step 2: Configure specific presentation styling options
    await configurePresentationStyling(extensionPage, {
      font: 'Times New Roman',
      fontSize: '3em',
      margin: '2em 3em',
      color: '#00ff00',
      liveColor: '#ffff00',
      background: 'linear-gradient(to bottom, #000080, #000000)',
    });

    // Step 3: Save the variant
    const saveButton = extensionPage.getByTestId('button-save-variant');
    await expect(saveButton).toBeEnabled();
    await saveButton.click();
    await extensionPage.waitForTimeout(1000);

    // Step 4: Open test presentation window
    const windows = await openTestPresentationWindows(
      extensionPage,
      windowHelper,
      1,
    );
    const testWindow = windows[0];
    await testWindow.waitForLoadState('networkidle');

    // Step 5: Verify styles are applied in the presentation window
    // Get the root presentation element
    const presentationRoot = testWindow.locator(
      '.translator-presentation-root',
    );
    await expect(presentationRoot).toBeVisible();

    // Verify CSS custom properties are set correctly
    const rootStyles = await presentationRoot.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        background: styles.getPropertyValue('background'),
        color: styles.getPropertyValue('color'),
        fontFamily: styles.getPropertyValue('font-family'),
        fontSize: styles.getPropertyValue('font-size'),
        // Get CSS variables
        presentationBackground: styles
          .getPropertyValue('--presentation-background')
          .trim(),
        presentationColor: styles
          .getPropertyValue('--presentation-color')
          .trim(),
        presentationFont: styles.getPropertyValue('--presentation-font').trim(),
        presentationFontSize: styles
          .getPropertyValue('--presentation-font-size')
          .trim(),
        presentationMargin: styles
          .getPropertyValue('--presentation-margin')
          .trim(),
        presentationLiveColor: styles
          .getPropertyValue('--presentation-live-color')
          .trim(),
      };
    });

    // Verify CSS variables match configured values
    expect(rootStyles.presentationFont).toBe('Times New Roman');
    expect(rootStyles.presentationFontSize).toBe('3em');
    expect(rootStyles.presentationMargin).toBe('2em 3em');
    expect(rootStyles.presentationColor).toBe('#00ff00');
    expect(rootStyles.presentationLiveColor).toBe('#ffff00');
    expect(rootStyles.presentationBackground).toBe(
      'linear-gradient(to bottom, #000080, #000000)',
    );

    // Verify that the computed styles apply the CSS variables
    // Font family should include Times New Roman (plus the Twemoji Country Flags fallback)
    expect(rootStyles.fontFamily).toContain('Times New Roman');

    // Color should be the configured color (may be in rgb format)
    // #00ff00 = rgb(0, 255, 0) = lime green
    expect(rootStyles.color).toMatch(/rgb\(0,\s*255,\s*0\)|#00ff00|lime/i);

    // Background should contain the gradient
    // #000080 = rgb(0, 0, 128) = navy blue
    // #000000 = rgb(0, 0, 0) = black
    expect(rootStyles.background).toContain('linear-gradient');
    expect(rootStyles.background).toMatch(/rgb\(0,\s*0,\s*128\)|000080/i); // Dark blue
    expect(rootStyles.background).toMatch(/rgb\(0,\s*0,\s*0\)|000000/i); // Black

    // Step 6: Start test generation to verify live text color
    await startTestTranslation(extensionPage);
    await testWindow.waitForTimeout(2000); // Wait for lorem ipsum generation

    // Check if live translation element exists and has correct color
    const liveTranslation = testWindow.locator('.live-translation').first();
    if ((await liveTranslation.count()) > 0) {
      const liveStyles = await liveTranslation.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          color: styles.getPropertyValue('color'),
        };
      });

      // Live color should be yellow (#ffff00 = rgb(255, 255, 0))
      expect(liveStyles.color).toMatch(
        /rgb\(255,\s*255,\s*0\)|#ffff00|yellow/i,
      );
    }

    // Step 7: Stop test generation (this will close the test window automatically)
    const stopButton = extensionPage.getByTestId('button-stop');
    await expect(stopButton).toBeEnabled();
    await stopButton.click();
    await extensionPage.waitForTimeout(1000); // Wait for window cleanup

    // Step 8: Test with different styling - color background
    // Configure different presentation styles with a color background
    await configurePresentationStyling(extensionPage, {
      font: 'Palatino',
      fontSize: '24px',
      margin: '10px 20px',
      color: 'white',
      liveColor: '#cccccc',
      background: '#333333',
    });

    // Save the changes
    await saveButton.click();
    await extensionPage.waitForTimeout(1000);

    // Open new test presentation window
    const windows2 = await openTestPresentationWindows(
      extensionPage,
      windowHelper,
      1,
    );
    const testWindow2 = windows2[0];
    await testWindow2.waitForLoadState('networkidle');

    // Verify the new styles
    const presentationRoot2 = testWindow2.locator(
      '.translator-presentation-root',
    );
    await expect(presentationRoot2).toBeVisible();

    const rootStyles2 = await presentationRoot2.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        presentationBackground: styles
          .getPropertyValue('--presentation-background')
          .trim(),
        presentationColor: styles
          .getPropertyValue('--presentation-color')
          .trim(),
        presentationFont: styles.getPropertyValue('--presentation-font').trim(),
        presentationFontSize: styles
          .getPropertyValue('--presentation-font-size')
          .trim(),
        presentationMargin: styles
          .getPropertyValue('--presentation-margin')
          .trim(),
        presentationLiveColor: styles
          .getPropertyValue('--presentation-live-color')
          .trim(),
        color: styles.getPropertyValue('color'),
        fontFamily: styles.getPropertyValue('font-family'),
      };
    });

    expect(rootStyles2.presentationFont).toBe('Palatino');
    expect(rootStyles2.presentationFontSize).toBe('24px');
    expect(rootStyles2.presentationMargin).toBe('10px 20px');
    expect(rootStyles2.presentationColor).toBe('white');
    expect(rootStyles2.presentationLiveColor).toBe('#cccccc');
    expect(rootStyles2.presentationBackground).toBe('#333333');

    // Verify computed styles
    expect(rootStyles2.fontFamily).toContain('Palatino');
    expect(rootStyles2.color).toMatch(/rgb\(255,\s*255,\s*255\)|white/i);
  });
});

test.describe('WebPubSub Configuration', () => {
  test.beforeEach(async ({ extensionPage }) => {
    await authenticateChurchTools(extensionPage);
    await cleanupE2EData(extensionPage);

    await extensionPage.goto('/');
    await extensionPage.waitForLoadState('networkidle');

    // Mock Azure Function validation endpoint used by WebPubSub settings
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
  });

  test.afterEach(async ({ extensionPage }) => {
    await cleanupE2EData(extensionPage, false);
  });

  test('should save and persist WebPubSub configuration', async ({
    extensionPage,
  }) => {
    // Navigate to Settings tab
    await navigateToTab(extensionPage, 'settings');

    // Enable WebPubSub feature
    const enableCheckbox = extensionPage.getByTestId(
      'checkbox-webpubsub-enabled',
    );
    await enableCheckbox.click();
    await extensionPage.waitForTimeout(300);

    // Fill in operator secret
    const operatorSecretInput = extensionPage
      .getByTestId('input-operator-secret')
      .locator('input');
    await operatorSecretInput.fill('test-operator-secret-123');

    // Fill in reader secret
    const readerSecretInput = extensionPage
      .getByTestId('input-reader-secret')
      .locator('input');
    await readerSecretInput.fill('test-reader-secret-456');

    // Fill in auth function URL
    const authFunctionUrlInput = extensionPage.getByTestId(
      'input-auth-function-url',
    );
    await authFunctionUrlInput.fill(MOCK_WEBPUBSUB_URL);

    // Save button should be enabled (there are unsaved changes)
    const saveButton = extensionPage.getByTestId('button-save-webpubsub');
    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    // Wait for save to complete
    await extensionPage.waitForTimeout(1000);

    // Verify success message
    const successMessage = extensionPage.getByText(
      /WebPubSub settings saved successfully/i,
    );
    await expect(successMessage).toBeVisible();

    // Reload the page
    await extensionPage.reload();
    await extensionPage.waitForLoadState('networkidle');

    // Navigate back to settings
    await navigateToTab(extensionPage, 'settings', 0);

    // Verify the checkbox is still enabled
    const savedCheckbox = extensionPage.getByTestId(
      'checkbox-webpubsub-enabled',
    );
    await expect(savedCheckbox).toHaveAttribute('data-p-checked', 'true');

    // Verify the values are still present (they should be masked in password fields)
    // Note: Password fields won't show the value directly, but we can verify they're filled
    const savedOperatorSecret = await extensionPage
      .getByTestId('input-operator-secret')
      .locator('input');
    const savedReaderSecret = await extensionPage
      .getByTestId('input-reader-secret')
      .locator('input');
    const savedAuthUrl = await extensionPage
      .getByTestId('input-auth-function-url')
      .inputValue();

    // Password fields should have values (even if masked)
    expect(await savedOperatorSecret.inputValue()).toBe(
      'test-operator-secret-123',
    );
    expect(await savedReaderSecret.inputValue()).toBe('test-reader-secret-456');
    expect(savedAuthUrl).toBe(MOCK_WEBPUBSUB_URL);
  });

  test('should reload WebPubSub configuration', async ({ extensionPage }) => {
    // Navigate to Settings tab
    await navigateToTab(extensionPage, 'settings');

    // Enable WebPubSub feature
    const enableCheckbox = extensionPage.getByTestId(
      'checkbox-webpubsub-enabled',
    );
    await enableCheckbox.click();
    await extensionPage.waitForTimeout(300);

    // Pre-populate and save
    await extensionPage
      .getByTestId('input-operator-secret')
      .locator('input')
      .fill('initial-operator-secret');
    await extensionPage
      .getByTestId('input-reader-secret')
      .locator('input')
      .fill('initial-reader-secret');
    await extensionPage
      .getByTestId('input-auth-function-url')
      .fill(MOCK_WEBPUBSUB_URL);

    // Save button should be visible due to changes
    const saveButton = extensionPage.getByTestId('button-save-webpubsub');
    await expect(saveButton).toBeEnabled();
    await saveButton.click();
    await extensionPage.waitForTimeout(1000);

    // After save, save button should be disabled (no unsaved changes)
    await expect(saveButton).toBeDisabled();

    // Modify the values locally (without saving)
    await extensionPage
      .getByTestId('input-operator-secret')
      .locator('input')
      .fill('modified-operator-secret');
    await extensionPage
      .getByTestId('input-reader-secret')
      .locator('input')
      .fill('modified-reader-secret');
    await extensionPage
      .getByTestId('input-auth-function-url')
      .fill(`${MOCK_WEBPUBSUB_URL}?modified=1`);

    // Save button should be enabled again (there are unsaved changes)
    await expect(saveButton).toBeEnabled();

    // Click reload button
    const reloadButton = extensionPage.getByTestId('button-reload-webpubsub');
    await reloadButton.click();
    await extensionPage.waitForTimeout(500);

    // Verify values are restored to saved state
    expect(
      await extensionPage
        .getByTestId('input-operator-secret')
        .locator('input')
        .inputValue(),
    ).toBe('initial-operator-secret');
    expect(
      await extensionPage
        .getByTestId('input-reader-secret')
        .locator('input')
        .inputValue(),
    ).toBe('initial-reader-secret');
    expect(
      await extensionPage.getByTestId('input-auth-function-url').inputValue(),
    ).toBe(MOCK_WEBPUBSUB_URL);

    // After reload, save button should be disabled again (no unsaved changes)
    await expect(saveButton).toBeDisabled();
  });

  test('should require all WebPubSub fields to be filled when enabled', async ({
    extensionPage,
  }) => {
    await navigateToTab(extensionPage, 'settings');

    // Save button should be visible but disabled initially (no changes, feature disabled)
    const saveButton = extensionPage.getByTestId('button-save-webpubsub');
    await expect(saveButton).toBeVisible();
    await expect(saveButton).toBeDisabled();

    // Enable WebPubSub feature
    const enableCheckbox = extensionPage.getByTestId(
      'checkbox-webpubsub-enabled',
    );
    await enableCheckbox.click();
    await extensionPage.waitForTimeout(300);

    // After enabling, save button should still be disabled (all fields empty)
    await expect(saveButton).toBeDisabled();

    // Fill only operator secret
    await extensionPage
      .getByTestId('input-operator-secret')
      .locator('input')
      .fill('test-secret');
    await expect(saveButton).toBeDisabled();

    // Fill reader secret too
    await extensionPage
      .getByTestId('input-reader-secret')
      .locator('input')
      .fill('test-reader');
    await expect(saveButton).toBeDisabled();

    // Fill auth function URL - now button should be enabled
    await extensionPage
      .getByTestId('input-auth-function-url')
      .fill(MOCK_WEBPUBSUB_URL);
    await expect(saveButton).toBeEnabled();
  });
});
