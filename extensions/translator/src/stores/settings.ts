import { defineStore } from 'pinia';
import { ref, nextTick } from 'vue';
import type { CategoryValue } from '@churchtools-extensions/persistance';
import type {
  ApiSettings,
  OperatorSecret,
  ReaderConfig,
  SettingVariant,
  TranslatorSettings,
} from '../types/translator';
import { TranslatorSettingsService } from '../services/translatorSettingsService';
import {
  DEFAULT_TRANSLATOR_SETTINGS,
  TranslatorVariantService,
} from '../services/translatorVariantService';
import { WebPubSubService } from '../services/webPubSubService';

export const useSettingsStore = defineStore('settings', () => {
  const settingsService = new TranslatorSettingsService();
  const variantService = new TranslatorVariantService();
  const webPubSubService = new WebPubSubService();

  // Initial loading state
  const initializing = ref(true);

  // API Settings
  const apiSettings = ref<ApiSettings>({ azureApiKey: '', azureRegion: '' });
  const apiSettingsLoading = ref(false);
  const apiSettingsSaving = ref(false);

  // WebPubSub Operator Secret
  const operatorSecret = ref<OperatorSecret>({ secret: '' });
  const operatorSecretLoading = ref(false);
  const operatorSecretSaving = ref(false);

  // WebPubSub Reader Config
  const readerConfig = ref<ReaderConfig>({
    enabled: false,
    authFunctionUrl: '',
    readerSecret: '',
  });
  const readerConfigLoading = ref(false);
  const readerConfigSaving = ref(false);

  // Settings
  const settings = ref<TranslatorSettings>({
    ...DEFAULT_TRANSLATOR_SETTINGS,
  });
  const settingsLoading = ref(false);
  const settingsSaving = ref(false);

  // Setting Variants
  const settingVariants = ref<CategoryValue<SettingVariant>[]>([]);
  const selectedVariantId = ref<number | null>(null);
  const hasUnsavedChanges = ref(false);
  const selectingVariant = ref(false);
  // Track the last saved/clean state of settings for change detection
  let cleanSettingsState = JSON.stringify(settings.value);

  // Error handling
  const error = ref<string | null>(null);

  /**
   * Load API settings from persistence
   */
  async function loadApiSettings() {
    apiSettingsLoading.value = true;
    error.value = null;
    try {
      apiSettings.value = await settingsService.loadApiSettings();
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to load API settings';
      console.error('loadApiSettings failed', e);
    } finally {
      apiSettingsLoading.value = false;
    }
  }

  /**
   * Save API settings to persistence
   */
  async function saveApiSettings(newApiSettings: ApiSettings) {
    apiSettingsSaving.value = true;
    error.value = null;
    try {
      await settingsService.saveApiSettings(newApiSettings);
      apiSettings.value = { ...newApiSettings };
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to save API settings';
      console.error('saveApiSettings failed', e);
      throw e;
    } finally {
      apiSettingsSaving.value = false;
    }
  }

  /**
   * Load operator secret from persistence
   */
  async function loadOperatorSecret() {
    operatorSecretLoading.value = true;
    error.value = null;
    try {
      operatorSecret.value = await settingsService.loadOperatorSecret();
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to load operator secret';
      console.error('loadOperatorSecret failed', e);
    } finally {
      operatorSecretLoading.value = false;
    }
  }

  /**
   * Save operator secret to persistence
   */
  async function saveOperatorSecret(newOperatorSecret: OperatorSecret) {
    operatorSecretSaving.value = true;
    error.value = null;
    try {
      await settingsService.saveOperatorSecret(newOperatorSecret);
      operatorSecret.value = { ...newOperatorSecret };
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to save operator secret';
      console.error('saveOperatorSecret failed', e);
      throw e;
    } finally {
      operatorSecretSaving.value = false;
    }
  }

  /**
   * Load reader config from persistence
   */
  async function loadReaderConfig() {
    readerConfigLoading.value = true;
    error.value = null;
    try {
      readerConfig.value = await settingsService.loadReaderConfig();
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to load reader config';
      console.error('loadReaderConfig failed', e);
    } finally {
      readerConfigLoading.value = false;
    }
  }

  /**
   * Save reader config to persistence
   */
  async function saveReaderConfig(newReaderConfig: ReaderConfig) {
    readerConfigSaving.value = true;
    error.value = null;
    try {
      await settingsService.saveReaderConfig(newReaderConfig);
      readerConfig.value = { ...newReaderConfig };
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to save reader config';
      console.error('saveReaderConfig failed', e);
      throw e;
    } finally {
      readerConfigSaving.value = false;
    }
  }

  /**
   * Validate WebPubSub configuration by testing both secrets with the Azure function
   * @returns Object with validation result and error message if failed
   */
  async function validateWebPubSubConfig(config: {
    authFunctionUrl: string;
    operatorSecret: string;
    readerSecret: string;
  }): Promise<{ valid: boolean; error?: string }> {
    return webPubSubService.validateConfig(config);
  }

  /**
   * Load all setting variants and user's last selected variant
   */
  async function loadSettingVariants(userId?: number) {
    settingsLoading.value = true;
    error.value = null;
    try {
      // Load all variants
      const list = await settingsService.listSettingVariants();
      settingVariants.value = list;

      // If no variants exist, create a default one
      if (list.length === 0) {
        const defaultVariant = variantService.createDefaultVariant();
        const id = await settingsService.createSettingVariant(defaultVariant);
        settingVariants.value = [{ id, value: defaultVariant, raw: {} as any }];
        selectedVariantId.value = id;
        settings.value = { ...DEFAULT_TRANSLATOR_SETTINGS };
        // Update clean state to match default settings
        cleanSettingsState = JSON.stringify(settings.value);
      } else {
        const { value: userPrefs } =
          await settingsService.loadUserPreferences();
        const lastVariantId = variantService.resolveLastVariantId(
          userPrefs,
          userId,
        );

        // Try to load the last selected variant
        const variantToLoad = lastVariantId
          ? list.find((v) => v.id === lastVariantId) || list[0]
          : list[0];

        selectedVariantId.value = variantToLoad.id;
        // Migrate settings if they're in old format
        const migratedSettings = variantService.migrateSettings(
          structuredClone(variantToLoad.value.settings),
        );
        settings.value = migratedSettings;
        // Update clean state to match loaded settings
        cleanSettingsState = JSON.stringify(migratedSettings);
      }

      hasUnsavedChanges.value = false;
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to load setting variants';
      console.error('loadSettingVariants failed', e);
    } finally {
      settingsLoading.value = false;
      initializing.value = false;
    }
  }

  /**
   * Save current settings to the selected variant (or create new)
   */
  async function saveCurrentVariant(variantName?: string, userId?: number) {
    settingsSaving.value = true;
    error.value = null;
    try {
      // Normalize settings before persisting to ensure defaults are present
      const normalizedSettings = variantService.migrateSettings(settings.value);
      settings.value = normalizedSettings;

      const currentVariant = settingVariants.value.find(
        (v) => v.id === selectedVariantId.value,
      );

      // If saving to "Default" with changes, or no variant name and creating new
      if (variantName) {
        // Trim the variant name
        const trimmedName = variantName.trim();

        // Check for duplicate names (check ALL variants since we're creating a new one)
        const isDuplicate = settingVariants.value.some(
          (v) => v.value.name === trimmedName,
        );

        if (isDuplicate) {
          throw new Error(`A variant named "${trimmedName}" already exists`);
        }

        // Create new variant
        const newVariant: SettingVariant = {
          name: trimmedName,
          settings: { ...normalizedSettings },
        };
        const id = await settingsService.createSettingVariant(newVariant);
        settingVariants.value.push({ id, value: newVariant, raw: {} as any });
        selectedVariantId.value = id;
        hasUnsavedChanges.value = false;

        // Save user preference for the new variant
        if (userId) {
          await settingsService.saveUserPreference(id, userId);
        }
      } else if (selectedVariantId.value && currentVariant) {
        // Update existing variant
        const updatedVariant: SettingVariant = {
          name: currentVariant.value.name,
          settings: { ...normalizedSettings },
        };
        await settingsService.updateSettingVariant(
          selectedVariantId.value,
          updatedVariant,
        );
        currentVariant.value = updatedVariant;
        hasUnsavedChanges.value = false;
      }

      // Update clean state after successful save
      cleanSettingsState = JSON.stringify(normalizedSettings);
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to save settings';
      console.error('saveCurrentVariant failed', e);
      throw e;
    } finally {
      settingsSaving.value = false;
    }
  }

  /**
   * Select a different variant
   */
  async function selectVariant(variantId: number, userId?: number) {
    selectingVariant.value = true;

    // Reload variants from database to ensure fresh data
    const list = await settingsService.listSettingVariants();
    settingVariants.value = list;

    const variant = list.find((v) => v.id === variantId);
    if (!variant) {
      selectingVariant.value = false;
      return;
    }

    selectedVariantId.value = variantId;
    // Deep clone to ensure no shared references and migrate if needed
    const migratedSettings = variantService.migrateSettings(
      JSON.parse(JSON.stringify(variant.value.settings)),
    );
    // Update clean state BEFORE reactive assignment to prevent watcher from firing
    cleanSettingsState = JSON.stringify(migratedSettings);
    settings.value = migratedSettings;
    hasUnsavedChanges.value = false;

    // Wait for Vue to process before clearing selecting flag
    await nextTick();
    selectingVariant.value = false;

    // Save user preference
    if (userId) {
      await settingsService.saveUserPreference(variantId, userId);
    }
  }

  /**
   * Delete a variant
   */
  async function deleteVariant(variantId: number) {
    try {
      // Prevent deletion of Default variant
      const variant = settingVariants.value.find((v) => v.id === variantId);
      if (variant?.value.name === 'Default') {
        throw new Error('Cannot delete the Default variant');
      }

      await settingsService.deleteSettingVariant(variantId);
      settingVariants.value = settingVariants.value.filter(
        (v) => v.id !== variantId,
      );

      // If we deleted the selected variant, switch to the first available
      if (
        selectedVariantId.value === variantId &&
        settingVariants.value.length > 0
      ) {
        await selectVariant(settingVariants.value[0].id);
      }
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to delete variant';
      console.error('deleteVariant failed', e);
      throw e;
    }
  }

  /**
   * Mark settings as modified
   * @internal Used primarily for testing
   */
  function markSettingsChanged() {
    hasUnsavedChanges.value = true;
  }

  /**
   * Update the clean state after saving (called after variant save)
   */
  function updateCleanSettingsState() {
    cleanSettingsState = JSON.stringify(settings.value);
  }

  /**
   * Check if current settings differ from the clean/saved state
   */
  function hasSettingsChanged(): boolean {
    return JSON.stringify(settings.value) !== cleanSettingsState;
  }

  return {
    // State
    initializing,
    apiSettings,
    apiSettingsLoading,
    apiSettingsSaving,
    operatorSecret,
    operatorSecretLoading,
    operatorSecretSaving,
    readerConfig,
    readerConfigLoading,
    readerConfigSaving,
    settings,
    settingsLoading,
    settingsSaving,
    settingVariants,
    selectedVariantId,
    hasUnsavedChanges,
    selectingVariant,
    error,

    // Actions
    loadApiSettings,
    saveApiSettings,
    loadOperatorSecret,
    saveOperatorSecret,
    loadReaderConfig,
    saveReaderConfig,
    validateWebPubSubConfig,
    loadSettingVariants,
    saveCurrentVariant,
    selectVariant,
    deleteVariant,
    markSettingsChanged,
    updateCleanSettingsState,
    hasSettingsChanged,
  };
});
