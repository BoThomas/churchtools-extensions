import { test, expect } from './fixtures/extensionFixture';
import { authenticateChurchTools } from './utils/auth';
import { cleanupE2EData } from './utils/cleanup';
import {
  navigateToTab,
  configureApiCredentials,
  createVariant,
  configureTranslationSettings,
} from './utils/testHelpers';

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

    const apiKeyInput = extensionPage.getByTestId('input-api-key');
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
      .getByTestId('input-api-key')
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
    const presentationOptionsButton = extensionPage.getByRole('button', {
      name: /Presentation Options/i,
    });
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

  test.skip('configures presentation styling options (font, colors, background, etc.)', async ({
    extensionPage,
  }) => {
    // TODO: Implement comprehensive test for presentation styling options
    // This test should verify that all presentation options apply correctly:
    // - Font family selection
    // - Font size
    // - Paragraph margin
    // - Text color
    // - Live text color
    // - Background (color, image, gradient)
    //
    // Test approach:
    // 1. Configure various presentation styling options
    // 2. Save the configuration
    // 3. Open test presentation window
    // 4. Verify styles are applied in presentation view by:
    //    - Reading computed styles from presentation window elements
    //    - Checking CSS properties match configured values
    //
    // Note: This requires inspecting the presentation window's DOM
    // and computed styles to verify the settings are applied correctly.
  });
});
