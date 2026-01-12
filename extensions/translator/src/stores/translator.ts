import { defineStore } from 'pinia';
import { ref, nextTick } from 'vue';
import {
  PersistanceCategory,
  type CategoryValue,
} from '@churchtools-extensions/persistance';
import { KEY } from '../config';
import {
  SessionLogger,
  type TranslationSession,
} from '../services/sessionLogger';
import type {
  StreamedSessionMetadata,
  ActiveSessionReference,
} from '../types/streamedSession';
import { generateSessionDisplayName } from '../types/streamedSession';

export interface ApiSettings {
  azureApiKey: string;
  azureRegion: string;
}

export interface OperatorSecret {
  secret: string;
}

export interface ReaderConfig {
  enabled: boolean;
  authFunctionUrl: string;
  readerSecret: string;
}

export interface TranslatorSettings {
  // Translation Options
  inputLanguage: string; // Language code (e.g., 'de-DE')
  outputLanguages: string[]; // Array of language codes (e.g., ['en', 'es'])
  profanityOption: 'raw' | 'remove' | 'mask';
  stablePartialResultThreshold: string;
  phraseList: string;

  // Presentation Options
  presentation: {
    font: string;
    fontSize: string;
    margin: string;
    color: string;
    liveColor: string;
    background: string;
    mode: 'split' | 'multi-window'; // Split-screen or multiple windows
    showInputLanguage: boolean; // Show input language transcription in presentation
  };

  // Session Options (WebPubSub)
  session?: {
    displayName?: string; // Optional user-provided session name (auto-generated if empty)
    maxClients?: number; // Optional max client count (undefined = unlimited)
    hidden: boolean; // Whether to hide this session from the session overview
  };

  // Output mode enabled states (track which modes are active per variant)
  outputModes?: {
    presentationEnabled: boolean;
    streamedSessionEnabled: boolean;
  };
}

export interface SettingVariant {
  name: string;
  settings: TranslatorSettings;
}

export interface UsageStats {
  userId: number;
  userEmail: string;
  userName: string;
  totalMinutes: number;
  activeMinutes: number;
  pausedMinutes: number;
  sessionCount: number;
  lastUsed: string;
  sessions: { date: string; activeMinutes: number; pausedMinutes: number }[];
}

const DEFAULT_SETTINGS: TranslatorSettings = {
  inputLanguage: 'de-DE',
  outputLanguages: ['en'],
  profanityOption: 'raw',
  stablePartialResultThreshold: '5',
  phraseList: '',
  presentation: {
    font: 'Arial',
    fontSize: '2em',
    margin: '1em 2em',
    color: 'white',
    liveColor: '#999',
    background: 'black',
    mode: 'split',
    showInputLanguage: false,
  },
  session: {
    hidden: false,
  },
  outputModes: {
    presentationEnabled: true,
    streamedSessionEnabled: false,
  },
};

export const useTranslatorStore = defineStore('translator', () => {
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
  const settings = ref<TranslatorSettings>({ ...DEFAULT_SETTINGS });
  const settingsLoading = ref(false);
  const settingsSaving = ref(false);

  // Setting Variants
  const settingVariants = ref<CategoryValue<SettingVariant>[]>([]);
  const selectedVariantId = ref<number | null>(null);
  const hasUnsavedChanges = ref(false);
  const selectingVariant = ref(false);
  // Track the last saved/clean state of settings for change detection
  let cleanSettingsState = JSON.stringify(settings.value);

  // Sessions
  const sessions = ref<CategoryValue<TranslationSession>[]>([]);
  const sessionsLoading = ref(false);
  const sessionsSaving = ref(false);

  // Current session (tracked for optimistic updates)
  const currentSessionId = ref<number | null>(null);
  const currentSession = ref<TranslationSession | null>(null);

  // Error handling
  const error = ref<string | null>(null);

  // Categories
  let apiSettingsCategory: PersistanceCategory<ApiSettings> | null = null;
  let settingsCategory: PersistanceCategory<SettingVariant> | null = null;
  let sessionsCategory: PersistanceCategory<TranslationSession> | null = null;
  let streamedSessionsCategory: PersistanceCategory<StreamedSessionMetadata> | null =
    null;
  let userPreferencesCategory: PersistanceCategory<{
    lastVariantId: number;
  }> | null = null;
  let operatorSecretCategory: PersistanceCategory<OperatorSecret> | null = null;
  let readerConfigCategory: PersistanceCategory<ReaderConfig> | null = null;

  // Track initialization to prevent duplicate category creation during parallel calls
  let categoriesInitializing: Promise<void> | null = null;

  /**
   * Migrate old settings format (object with name/code) to new format (code string only)
   * Also migrates single outputLanguage to outputLanguages array
   */
  function migrateSettings(settings: any): TranslatorSettings {
    const migrated = JSON.parse(JSON.stringify(settings ?? {}));

    // Migrate inputLanguage if it's an object
    if (
      typeof settings.inputLanguage === 'object' &&
      settings.inputLanguage?.code
    ) {
      migrated.inputLanguage = settings.inputLanguage.code;
    }

    // Migrate old outputLanguage (string) to new outputLanguages (array)
    if (settings.outputLanguage && !settings.outputLanguages) {
      // Old format: single language as string or object
      if (typeof settings.outputLanguage === 'string') {
        migrated.outputLanguages = [settings.outputLanguage];
      } else if (settings.outputLanguage?.code) {
        migrated.outputLanguages = [settings.outputLanguage.code];
      }
      delete migrated.outputLanguage;
    } else if (
      settings.outputLanguages &&
      !Array.isArray(settings.outputLanguages)
    ) {
      // Ensure outputLanguages is always an array
      migrated.outputLanguages = [settings.outputLanguages];
    } else if (!settings.outputLanguages) {
      // No output language set at all, use default
      migrated.outputLanguages = ['en'];
    }

    // Ensure presentation.mode exists (default to 'split')
    if (migrated.presentation && !migrated.presentation.mode) {
      migrated.presentation.mode = 'split';
    }

    // Ensure presentation.showInputLanguage exists (default to false)
    if (
      migrated.presentation &&
      migrated.presentation.showInputLanguage === undefined
    ) {
      migrated.presentation.showInputLanguage = false;
    }

    // Ensure presentation object exists with defaults
    migrated.presentation = {
      ...DEFAULT_SETTINGS.presentation,
      ...(migrated.presentation || {}),
    };

    // Ensure outputModes exists with defaults
    if (!migrated.outputModes) {
      migrated.outputModes = {
        presentationEnabled: true,
        streamedSessionEnabled: false,
      };
    } else {
      // Ensure both keys are booleans
      migrated.outputModes.presentationEnabled =
        !!migrated.outputModes.presentationEnabled;
      migrated.outputModes.streamedSessionEnabled =
        !!migrated.outputModes.streamedSessionEnabled;
    }

    // Ensure session exists with defaults
    if (!migrated.session) {
      migrated.session = {
        hidden: false,
      };
    } else {
      // Ensure hidden is a boolean
      if (typeof migrated.session.hidden !== 'boolean') {
        migrated.session.hidden = false;
      }
      // Ensure maxClients is a number or undefined
      if (
        migrated.session.maxClients !== undefined &&
        typeof migrated.session.maxClients !== 'number'
      ) {
        migrated.session.maxClients = undefined;
      }
    }

    // Fill other defaults if missing
    if (!migrated.inputLanguage) {
      migrated.inputLanguage = DEFAULT_SETTINGS.inputLanguage;
    }

    if (!migrated.profanityOption) {
      migrated.profanityOption = DEFAULT_SETTINGS.profanityOption;
    }

    if (!migrated.stablePartialResultThreshold) {
      migrated.stablePartialResultThreshold =
        DEFAULT_SETTINGS.stablePartialResultThreshold;
    }

    if (migrated.phraseList === undefined) {
      migrated.phraseList = '';
    }

    return migrated as TranslatorSettings;
  }

  /**
   * Initialize categories
   */
  async function ensureCategories() {
    // If already initializing, wait for that to complete
    if (categoriesInitializing) {
      await categoriesInitializing;
      return;
    }

    // If all categories are already initialized, return early
    if (
      apiSettingsCategory &&
      settingsCategory &&
      sessionsCategory &&
      streamedSessionsCategory &&
      userPreferencesCategory &&
      operatorSecretCategory &&
      readerConfigCategory
    ) {
      return;
    }

    // Start initialization
    categoriesInitializing = (async () => {
      if (!apiSettingsCategory) {
        apiSettingsCategory = await PersistanceCategory.init({
          extensionkey: KEY,
          categoryShorty: 'api-settings',
          categoryName: 'API Configuration',
        });
      }
      if (!settingsCategory) {
        settingsCategory = await PersistanceCategory.init({
          extensionkey: KEY,
          categoryShorty: 'setting-variants',
          categoryName: 'Setting Variants',
        });
      }
      if (!sessionsCategory) {
        sessionsCategory = await PersistanceCategory.init({
          extensionkey: KEY,
          categoryShorty: 'sessions',
          categoryName: 'Translation Sessions',
        });
      }
      if (!streamedSessionsCategory) {
        streamedSessionsCategory = await PersistanceCategory.init({
          extensionkey: KEY,
          categoryShorty: 'streamed-sessions',
          categoryName: 'Active Streamed Sessions',
        });
      }
      if (!userPreferencesCategory) {
        userPreferencesCategory = await PersistanceCategory.init({
          extensionkey: KEY,
          categoryShorty: 'user-prefs',
          categoryName: 'User Preferences',
        });
      }
      if (!operatorSecretCategory) {
        operatorSecretCategory = await PersistanceCategory.init({
          extensionkey: KEY,
          categoryShorty: 'operator-secret',
          categoryName: 'WebPubSub Operator Secret',
        });
      }
      if (!readerConfigCategory) {
        readerConfigCategory = await PersistanceCategory.init({
          extensionkey: KEY,
          categoryShorty: 'reader-config',
          categoryName: 'WebPubSub Reader Configuration',
        });
      }
    })();

    await categoriesInitializing;
    categoriesInitializing = null;
  }

  /**
   * Load API settings from persistence
   */
  async function loadApiSettings() {
    apiSettingsLoading.value = true;
    error.value = null;
    try {
      await ensureCategories();
      if (!apiSettingsCategory) return;

      const list = await apiSettingsCategory.list<ApiSettings>();
      if (list.length > 0) {
        // Use first API settings record
        apiSettings.value = { ...list[0].value };
      } else {
        // No API settings yet, use empty defaults
        apiSettings.value = { azureApiKey: '', azureRegion: '' };
      }
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to load API settings';
      console.error('loadApiSettings failed', e);
    } finally {
      apiSettingsLoading.value = false;
    }
  }

  /**
   * Load all setting variants and user's last selected variant
   */
  async function loadSettingVariants(userId?: number) {
    settingsLoading.value = true;
    error.value = null;
    try {
      await ensureCategories();
      if (!settingsCategory || !userPreferencesCategory) return;

      // Load all variants
      const list = await settingsCategory.list<SettingVariant>();
      settingVariants.value = list;

      // If no variants exist, create a default one
      if (list.length === 0) {
        const defaultVariant: SettingVariant = {
          name: 'Default',
          settings: { ...DEFAULT_SETTINGS },
        };
        const { id } = await settingsCategory.create(defaultVariant);
        settingVariants.value = [{ id, value: defaultVariant, raw: {} as any }];
        selectedVariantId.value = id;
        settings.value = { ...DEFAULT_SETTINGS };
        // Update clean state to match default settings
        cleanSettingsState = JSON.stringify(settings.value);
      } else {
        // Load user preferences (first available when userId not provided)
        const userPrefsList =
          await userPreferencesCategory.list<
            Record<string, { lastVariantId: number }>
          >();
        const userPrefs = userPrefsList[0]?.value || {};

        let lastVariantId: number | null = null;

        if (userId && userPrefs[userId.toString()]) {
          lastVariantId = userPrefs[userId.toString()].lastVariantId || null;
        } else if (!userId) {
          const firstPref = Object.values(userPrefs)[0];
          lastVariantId = firstPref?.lastVariantId || null;
        }

        // Try to load the last selected variant
        const variantToLoad = lastVariantId
          ? list.find((v) => v.id === lastVariantId) || list[0]
          : list[0];

        selectedVariantId.value = variantToLoad.id;
        // Migrate settings if they're in old format
        const migratedSettings = migrateSettings(
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
   * Save API settings to persistence
   */
  async function saveApiSettings(newApiSettings: ApiSettings) {
    apiSettingsSaving.value = true;
    error.value = null;
    try {
      await ensureCategories();
      if (!apiSettingsCategory) return;

      const list = await apiSettingsCategory.list<ApiSettings>();

      if (list.length > 0) {
        // Update existing API settings
        await apiSettingsCategory.update(list[0].id, newApiSettings);
      } else {
        // Create new API settings record
        await apiSettingsCategory.create(newApiSettings);
      }

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
      await ensureCategories();
      if (!operatorSecretCategory) return;

      const list = await operatorSecretCategory.list<OperatorSecret>();
      if (list.length > 0) {
        operatorSecret.value = { ...list[0].value };
      } else {
        operatorSecret.value = { secret: '' };
      }
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
      await ensureCategories();
      if (!operatorSecretCategory) return;

      const list = await operatorSecretCategory.list<OperatorSecret>();

      if (list.length > 0) {
        await operatorSecretCategory.update(list[0].id, newOperatorSecret);
      } else {
        await operatorSecretCategory.create(newOperatorSecret);
      }

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
      await ensureCategories();
      if (!readerConfigCategory) return;

      const list = await readerConfigCategory.list<ReaderConfig>();
      if (list.length > 0) {
        readerConfig.value = {
          enabled: list[0].value.enabled ?? false,
          authFunctionUrl: list[0].value.authFunctionUrl || '',
          readerSecret: list[0].value.readerSecret || '',
        };
      } else {
        readerConfig.value = {
          enabled: false,
          authFunctionUrl: '',
          readerSecret: '',
        };
      }
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
      await ensureCategories();
      if (!readerConfigCategory) return;

      const list = await readerConfigCategory.list<ReaderConfig>();

      if (list.length > 0) {
        await readerConfigCategory.update(list[0].id, newReaderConfig);
      } else {
        await readerConfigCategory.create(newReaderConfig);
      }

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
    const { authFunctionUrl, operatorSecret, readerSecret } = config;

    // Validate URL format
    try {
      new URL(authFunctionUrl);
    } catch {
      return { valid: false, error: 'Invalid Auth Function URL format' };
    }

    // Test with a validation room ID
    const testRoomId = `validation-${Date.now()}`;

    try {
      // Test operator secret
      const operatorResponse = await fetch(authFunctionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: operatorSecret,
          roomId: testRoomId,
          userId: 'validation-operator',
        }),
      });

      if (!operatorResponse.ok) {
        const errorData = await operatorResponse.json().catch(() => ({}));
        return {
          valid: false,
          error: `Operator secret validation failed: ${
            errorData.error || operatorResponse.statusText
          }`,
        };
      }

      const operatorData = await operatorResponse.json();
      if (!operatorData.url || operatorData.role !== 'operator') {
        return {
          valid: false,
          error: 'Invalid operator token response from Azure function',
        };
      }

      // Test reader secret
      const readerResponse = await fetch(authFunctionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: readerSecret,
          roomId: testRoomId,
          userId: 'validation-reader',
        }),
      });

      if (!readerResponse.ok) {
        const errorData = await readerResponse.json().catch(() => ({}));
        return {
          valid: false,
          error: `Reader secret validation failed: ${
            errorData.error || readerResponse.statusText
          }`,
        };
      }

      const readerData = await readerResponse.json();
      if (!readerData.url || readerData.role !== 'reader') {
        return {
          valid: false,
          error: 'Invalid reader token response from Azure function',
        };
      }

      // Both secrets validated successfully
      return { valid: true };
    } catch (e: any) {
      return {
        valid: false,
        error: `Network error: ${e.message || 'Failed to connect to Azure function'}`,
      };
    }
  }

  /**
   * Save current settings to the selected variant (or create new)
   */
  async function saveCurrentVariant(variantName?: string, userId?: number) {
    settingsSaving.value = true;
    error.value = null;
    try {
      await ensureCategories();
      if (!settingsCategory) return;

      // Normalize settings before persisting to ensure defaults are present
      const normalizedSettings = migrateSettings(settings.value);
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
        const { id } = await settingsCategory.create(newVariant);
        settingVariants.value.push({ id, value: newVariant, raw: {} as any });
        selectedVariantId.value = id;
        hasUnsavedChanges.value = false;

        // Save user preference for the new variant
        if (userId) {
          await saveUserPreference(id, userId);
        }
      } else if (selectedVariantId.value && currentVariant) {
        // Update existing variant
        const updatedVariant: SettingVariant = {
          name: currentVariant.value.name,
          settings: { ...normalizedSettings },
        };
        await settingsCategory.update(selectedVariantId.value, updatedVariant);
        currentVariant.value = updatedVariant;
        hasUnsavedChanges.value = false;
      }
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
    await ensureCategories();
    if (!settingsCategory) {
      selectingVariant.value = false;
      return;
    }

    const list = await settingsCategory.list<SettingVariant>();
    settingVariants.value = list;

    const variant = list.find((v) => v.id === variantId);
    if (!variant) {
      selectingVariant.value = false;
      return;
    }

    selectedVariantId.value = variantId;
    // Deep clone to ensure no shared references and migrate if needed
    const migratedSettings = migrateSettings(
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
      await saveUserPreference(variantId, userId);
    }
  }

  /**
   * Delete a variant
   */
  async function deleteVariant(variantId: number) {
    try {
      await ensureCategories();
      if (!settingsCategory) return;

      // Prevent deletion of Default variant
      const variant = settingVariants.value.find((v) => v.id === variantId);
      if (variant?.value.name === 'Default') {
        throw new Error('Cannot delete the Default variant');
      }

      await settingsCategory.delete(variantId);
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
   * Save user's last selected variant preference
   */
  async function saveUserPreference(variantId: number, userId: number) {
    try {
      await ensureCategories();
      if (!userPreferencesCategory) return;

      const prefs =
        await userPreferencesCategory.list<
          Record<string, { lastVariantId: number }>
        >();

      let allUserPrefs: Record<string, { lastVariantId: number }> = {};

      // Load existing preferences for all users
      if (prefs.length > 0) {
        allUserPrefs = { ...prefs[0].value };
      }

      // Update this user's preference
      allUserPrefs[userId.toString()] = { lastVariantId: variantId };

      if (prefs.length > 0) {
        await userPreferencesCategory.update(prefs[0].id, allUserPrefs);
      } else {
        await userPreferencesCategory.create(allUserPrefs);
      }
    } catch (e: any) {
      // Non-critical, just log
      console.warn('Failed to save user preference:', e);
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

  /**
   * Start a new translation session
   * If streaming is enabled, also creates streamed session metadata for reader discovery
   * @param sessionData - Full session data for 'sessions' category
   * @param streamingConfig - Optional streaming configuration (creates entry in 'streamed-sessions')
   */
  async function startSession(
    sessionData: TranslationSession,
    streamingConfig?: {
      displayName?: string;
      maxClients?: number;
      hidden?: boolean;
    },
  ) {
    sessionsSaving.value = true;
    error.value = null;

    try {
      await ensureCategories();
      if (!sessionsCategory)
        throw new Error('Sessions category not initialized');

      // 1. Create full session in 'sessions' category
      const { id } = await sessionsCategory.create(sessionData);
      currentSessionId.value = id;
      currentSession.value = { ...sessionData, id };

      // 2. If streaming enabled and not hidden, create streamed session metadata
      if (
        streamingConfig &&
        !streamingConfig.hidden &&
        streamedSessionsCategory
      ) {
        const roomId = crypto.randomUUID();

        // Auto-generate display name if not provided
        const displayName = streamingConfig.displayName?.trim()
          ? streamingConfig.displayName.trim()
          : generateSessionDisplayName(id);

        // TODO: Test WebPubSub connection before creating streamed session
        // const connection = await connectToWebPubSub(roomId);
        // if (!connection) {
        //   await sessionsCategory.delete(id);
        //   throw new Error('Failed to connect to WebPubSub');
        // }

        const streamedMetadata: StreamedSessionMetadata = {
          sessionId: id,
          webPubSubRoomId: roomId,
          displayName: displayName,
          inputLanguage: sessionData.inputLanguage,
          outputLanguages: sessionData.outputLanguages || [],
          operatorName: sessionData.userName,
          startTime: sessionData.startTime,
          lastHeartbeat: sessionData.startTime, // Initialize with startTime
          maxClients: streamingConfig.maxClients,
          currentClients: 0,
          status: 'running',
        };

        try {
          await streamedSessionsCategory.create(streamedMetadata);

          // Store reference in localStorage for crash recovery
          const sessionRef: ActiveSessionReference = {
            sessionId: id,
            webPubSubRoomId: roomId,
            startTime: sessionData.startTime,
          };
          localStorage.setItem(
            'translator_active_session',
            JSON.stringify(sessionRef),
          );
        } catch (streamError: any) {
          // Rollback: delete the main session we just created
          await sessionsCategory.delete(id);
          throw new Error(
            `Failed to create streaming session: ${streamError.message}`,
          );
        }
      }

      return id;
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to start session';
      console.error('startSession failed', e);
      throw e;
    } finally {
      sessionsSaving.value = false;
    }
  }

  /**
   * End the current session
   * Also removes from streamed-sessions if it was streaming
   */
  async function endSession(
    sessionId: number,
    updates: Partial<TranslationSession>,
  ) {
    sessionsSaving.value = true;
    error.value = null;
    try {
      if (!sessionsCategory) await ensureCategories();
      if (!sessionsCategory) return;

      // 1. Update full session in 'sessions' category
      // Optimistic update: use cached session if available
      const existing = sessions.value.find(
        (s: CategoryValue<TranslationSession>) => s.id === sessionId,
      );

      if (existing) {
        // Cache hit - merge and update directly
        const merged: TranslationSession = {
          ...existing.value,
          ...updates,
        };

        // Calculate duration if endTime is provided
        if (merged.endTime && merged.startTime) {
          const start = new Date(merged.startTime).getTime();
          const end = new Date(merged.endTime).getTime();
          merged.durationMinutes = Math.round((end - start) / (1000 * 60));
        }

        await sessionsCategory.update(sessionId, merged);
      } else {
        // Cache miss - check if updates contain all required fields
        const hasRequiredFields =
          updates.userId &&
          updates.startTime &&
          updates.inputLanguage &&
          updates.outputLanguage &&
          updates.mode &&
          updates.status;

        if (hasRequiredFields) {
          // Calculate duration if endTime is provided
          const merged = updates as TranslationSession;
          if (merged.endTime && merged.startTime) {
            const start = new Date(merged.startTime).getTime();
            const end = new Date(merged.endTime).getTime();
            merged.durationMinutes = Math.round((end - start) / (1000 * 60));
          }

          // Updates are complete, use optimistic update
          await sessionsCategory.update(sessionId, merged);
        } else {
          // Need to fetch to get complete session data
          const allSessions = await sessionsCategory.list<TranslationSession>();
          const found = allSessions.find(
            (s: CategoryValue<TranslationSession>) => s.id === sessionId,
          );
          if (!found) throw new Error('Session not found');

          const merged: TranslationSession = {
            ...found.value,
            ...updates,
          };

          // Calculate duration if endTime is provided
          if (merged.endTime && merged.startTime) {
            const start = new Date(merged.startTime).getTime();
            const end = new Date(merged.endTime).getTime();
            merged.durationMinutes = Math.round((end - start) / (1000 * 60));
          }

          await sessionsCategory.update(sessionId, merged);
        }
      }

      // 2. Remove from streamed-sessions category if it exists
      if (streamedSessionsCategory) {
        try {
          const streamedSessions =
            await streamedSessionsCategory.list<StreamedSessionMetadata>();
          const streamedSession = streamedSessions.find(
            (s) => s.value.sessionId === sessionId,
          );

          if (streamedSession) {
            // TODO: Send "session ended" message to WebPubSub room before deleting
            // await webPubSubClient.sendToRoom(streamedSession.value.webPubSubRoomId, {
            //   type: 'session-ended',
            //   message: 'The operator has ended this session'
            // });
            // TODO: Close WebPubSub room
            // await webPubSubClient.closeRoom(streamedSession.value.webPubSubRoomId);

            await streamedSessionsCategory.delete(streamedSession.id);
          }
        } catch (e) {
          console.warn('Failed to cleanup streamed session (non-critical):', e);
        }
      }

      // 3. Clear localStorage reference
      localStorage.removeItem('translator_active_session');

      currentSessionId.value = null;
      currentSession.value = null;
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to end session';
      console.error('endSession failed', e);
      throw e;
    } finally {
      sessionsSaving.value = false;
    }
  }

  /**
   * Update session heartbeat (non-blocking, silent errors)
   * Uses optimistic update to avoid fetching all sessions
   * Auto-recovers from abandoned state when heartbeat resumes
   * Also updates heartbeat in streamed session if exists
   */
  async function updateHeartbeat(sessionId: number) {
    // Non-blocking update - don't throw errors to avoid disrupting translation
    try {
      if (!sessionsCategory) await ensureCategories();
      if (!sessionsCategory) return;

      // Optimistic approach: use cached session or current session
      let baseSession: TranslationSession | undefined;

      // Try cache first
      const cached = sessions.value.find(
        (s: CategoryValue<TranslationSession>) => s.id === sessionId,
      );
      if (cached) {
        baseSession = cached.value;
      } else if (
        currentSession.value &&
        currentSession.value.id === sessionId
      ) {
        // Use tracked current session
        baseSession = currentSession.value;
      }

      if (baseSession) {
        // Use SessionLogger to update heartbeat (handles auto-recovery from abandoned)
        const sessionLogger = new SessionLogger();
        const updated = sessionLogger.updateHeartbeat(baseSession);

        await sessionsCategory.update(sessionId, updated);

        // Update current session in memory if it matches
        if (currentSession.value && currentSession.value.id === sessionId) {
          currentSession.value = updated;
        }
      } else {
        // Fallback: fetch if we have no session data (shouldn't happen in normal flow)
        console.warn(
          'Heartbeat update without cached session data, fetching...',
        );
        const allSessions = await sessionsCategory.list<TranslationSession>();
        const found = allSessions.find(
          (s: CategoryValue<TranslationSession>) => s.id === sessionId,
        );
        if (!found) return;

        const sessionLogger = new SessionLogger();
        const updated = sessionLogger.updateHeartbeat(found.value);
        await sessionsCategory.update(sessionId, updated);
      }

      // Update heartbeat in streamed session (if exists)
      if (streamedSessionsCategory) {
        try {
          const streamedSessions =
            await streamedSessionsCategory.list<StreamedSessionMetadata>();
          const streamedSession = streamedSessions.find(
            (s) => s.value.sessionId === sessionId,
          );

          if (streamedSession) {
            await streamedSessionsCategory.update(streamedSession.id, {
              ...streamedSession.value,
              lastHeartbeat: new Date().toISOString(),
            });
          }
        } catch (e) {
          console.warn(
            'Failed to update streamed session heartbeat (non-critical):',
            e,
          );
        }
      }
    } catch (e) {
      // Silent fail - log but don't disrupt translation
      console.warn('Failed to update heartbeat (non-critical):', e);
    }
  }

  /**
   * Pause the current session (stops accumulating active time)
   * Also updates status in streamed session if exists
   */
  async function pauseSession(sessionId: number) {
    try {
      if (!sessionsCategory) await ensureCategories();
      if (!sessionsCategory) return;

      if (currentSession.value && currentSession.value.id === sessionId) {
        const sessionLogger = new SessionLogger();
        const updated = sessionLogger.pauseSession(currentSession.value);
        await sessionsCategory.update(sessionId, updated);
        currentSession.value = updated;
      }

      // Update streamed session status
      if (streamedSessionsCategory) {
        const streamedSessions =
          await streamedSessionsCategory.list<StreamedSessionMetadata>();
        const streamedSession = streamedSessions.find(
          (s) => s.value.sessionId === sessionId,
        );

        if (streamedSession) {
          await streamedSessionsCategory.update(streamedSession.id, {
            ...streamedSession.value,
            status: 'paused',
          });
        }
      }
    } catch (e) {
      console.warn('Failed to pause session (non-critical):', e);
    }
  }

  /**
   * Resume the current session (starts accumulating active time again)
   * Also updates status and heartbeat in streamed session if exists
   */
  async function resumeSession(sessionId: number) {
    try {
      if (!sessionsCategory) await ensureCategories();
      if (!sessionsCategory) return;

      if (currentSession.value && currentSession.value.id === sessionId) {
        const sessionLogger = new SessionLogger();
        const updated = sessionLogger.resumeSession(currentSession.value);
        await sessionsCategory.update(sessionId, updated);
        currentSession.value = updated;
      }

      // Update streamed session status and heartbeat
      if (streamedSessionsCategory) {
        const streamedSessions =
          await streamedSessionsCategory.list<StreamedSessionMetadata>();
        const streamedSession = streamedSessions.find(
          (s) => s.value.sessionId === sessionId,
        );

        if (streamedSession) {
          await streamedSessionsCategory.update(streamedSession.id, {
            ...streamedSession.value,
            status: 'running',
            lastHeartbeat: new Date().toISOString(),
          });
        }
      }
    } catch (e) {
      console.warn('Failed to resume session (non-critical):', e);
    }
  }

  /**
   * Fetch all sessions
   */
  async function fetchSessions() {
    sessionsLoading.value = true;
    error.value = null;
    try {
      await ensureCategories();
      if (!sessionsCategory) return;

      const list = await sessionsCategory.list<TranslationSession>();
      sessions.value = list;
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to fetch sessions';
      console.error('fetchSessions failed', e);
    } finally {
      sessionsLoading.value = false;
    }
  }

  /**
   * Get usage statistics aggregated by user
   */
  async function getUsageStats(): Promise<UsageStats[]> {
    await fetchSessions();

    const userMap = new Map<number, UsageStats>();

    sessions.value.forEach(
      (sessionWrapper: CategoryValue<TranslationSession>) => {
        const session = sessionWrapper.value;
        const userId = session.userId;

        if (!userMap.has(userId)) {
          userMap.set(userId, {
            userId: session.userId,
            userEmail: session.userEmail,
            userName: session.userName,
            totalMinutes: 0,
            activeMinutes: 0,
            pausedMinutes: 0,
            sessionCount: 0,
            lastUsed: session.startTime,
            sessions: [],
          });
        }

        const stats = userMap.get(userId)!;
        stats.sessionCount++;

        // Calculate durations using smart duration calculation
        const totalDuration =
          session.durationMinutes ||
          SessionLogger.calculateSessionDuration(session);
        const activeDuration = SessionLogger.calculateActiveDuration(session);
        const pausedDuration = session.pausedDurationMinutes || 0;

        stats.totalMinutes += totalDuration;
        stats.activeMinutes += activeDuration;
        stats.pausedMinutes += pausedDuration;

        // Update last used if this session is more recent
        if (new Date(session.startTime) > new Date(stats.lastUsed)) {
          stats.lastUsed = session.startTime;
        }

        // Add per-session breakdown (use exact startTime for uniqueness)
        stats.sessions.push({
          date: session.startTime,
          activeMinutes: activeDuration,
          pausedMinutes: pausedDuration,
        });
      },
    );

    // Sort sessions by date
    userMap.forEach((stats) => {
      stats.sessions.sort((a, b) => b.date.localeCompare(a.date));
    });

    return Array.from(userMap.values()).sort(
      (a, b) => b.activeMinutes - a.activeMinutes,
    );
  }

  /**
   * Clear all session records by deleting and recreating the category
   */
  async function clearAllSessions() {
    sessionsSaving.value = true;
    error.value = null;
    try {
      await ensureCategories();
      if (!sessionsCategory) return;

      // Delete the entire category
      await sessionsCategory.deleteCategory();

      // Reset the category reference so ensureCategories will recreate it
      sessionsCategory = null;

      // Recreate the category
      await ensureCategories();

      // Clear local state
      sessions.value = [];
      currentSessionId.value = null;
      currentSession.value = null;
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to clear sessions';
      console.error('clearAllSessions failed', e);
      throw e;
    } finally {
      sessionsSaving.value = false;
    }
  }

  /**
   * Generate dummy sessions for testing/reporting
   * Creates the given amount of random sessions and persists them.
   */
  // TODO: remove later
  async function generateDummySessions(count: number = 50) {
    sessionsSaving.value = true;
    error.value = null;
    try {
      await ensureCategories();
      if (!sessionsCategory) return;

      const users = [
        // Use negative IDs so dummy users can never collide with real ChurchTools user IDs
        { id: -1001, name: 'Dummy Alice', email: 'dummy-alice@example.com' },
        { id: -1002, name: 'Dummy Bob', email: 'dummy-bob@example.com' },
        {
          id: -1003,
          name: 'Dummy Charlie',
          email: 'dummy-charlie@example.com',
        },
        { id: -1004, name: 'Dummy Dana', email: 'dummy-dana@example.com' },
        { id: -1005, name: 'Dummy Eve', email: 'dummy-eve@example.com' },
      ];

      const modes: TranslationSession['mode'][] = ['presentation', 'test'];
      const languages = [
        { in: 'de-DE', out: ['en'] },
        { in: 'en-GB', out: ['de'] },
        { in: 'es-ES', out: ['en'] },
        { in: 'fr-FR', out: ['en', 'de'] },
        { in: 'de-DE', out: ['en', 'es'] },
        { in: 'en-US', out: ['de', 'fr', 'es'] },
      ];

      const now = new Date();

      const sessionPayloads: TranslationSession[] = [];

      for (let i = 0; i < count; i++) {
        const user = users[Math.floor(Math.random() * users.length)];
        const lang = languages[Math.floor(Math.random() * languages.length)];
        const mode = modes[Math.floor(Math.random() * modes.length)];

        // Spread across the last 6 years
        const daysAgo = Math.floor(Math.random() * 6 * 365);
        const dayStart = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - daysAgo,
          0,
          0,
          0,
          0,
        );
        const startOffsetMinutes = Math.floor(Math.random() * 24 * 60);
        const durationMinutes = Math.max(5, Math.floor(Math.random() * 180));

        const start = new Date(
          dayStart.getTime() + startOffsetMinutes * 60 * 1000,
        );
        const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

        const statuses: TranslationSession['status'][] = [
          'completed',
          'completed',
          'completed',
          'running',
          'paused',
          'error',
        ];
        const status = statuses[Math.floor(Math.random() * statuses.length)];

        // Simulate some sessions with pauses (30% chance for completed, always for paused)
        const hasPaused = status === 'paused' || Math.random() < 0.3;
        const pausedDurationMinutes = hasPaused
          ? Math.floor(Math.random() * Math.min(durationMinutes * 0.4, 30))
          : 0;

        // Currently paused sessions should have pausedAt timestamp
        const isPaused = status === 'paused';

        const session: TranslationSession = {
          userId: user.id,
          userEmail: user.email,
          userName: user.name,
          startTime: start.toISOString(),
          endTime: status === 'completed' ? end.toISOString() : undefined,
          lastHeartbeat:
            status === 'running' || status === 'paused'
              ? new Date(
                  start.getTime() + (durationMinutes - 1) * 60 * 1000,
                ).toISOString()
              : undefined,
          pausedAt: isPaused
            ? new Date(
                start.getTime() + (durationMinutes - 5) * 60 * 1000,
              ).toISOString()
            : undefined,
          pausedDurationMinutes:
            pausedDurationMinutes > 0 ? pausedDurationMinutes : undefined,
          durationMinutes: status === 'completed' ? durationMinutes : undefined,
          inputLanguage: lang.in,
          outputLanguages: lang.out,
          mode,
          status,
        };

        sessionPayloads.push(session);
      }

      // Persist in small chunks with delays to avoid rate limiting
      const chunkSize = 10;
      for (let i = 0; i < sessionPayloads.length; i += chunkSize) {
        const chunk = sessionPayloads.slice(i, i + chunkSize);
        await Promise.all(chunk.map((s) => sessionsCategory!.create(s)));
        // Small delay between chunks to avoid HTTP 429
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // Refresh local cache
      const list = await sessionsCategory.list<TranslationSession>();
      sessions.value = list;
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to generate dummy sessions';
      console.error('generateDummySessions failed', e);
      throw e;
    } finally {
      sessionsSaving.value = false;
    }
  }

  /**
   * Check localStorage for active session reference
   * Returns session data if found and still active, null otherwise
   */
  async function checkForActiveSession(): Promise<{
    session: TranslationSession;
    reference: ActiveSessionReference;
  } | null> {
    try {
      const refString = localStorage.getItem('translator_active_session');
      if (!refString) return null;

      const ref = JSON.parse(refString) as ActiveSessionReference;

      // Check if session still exists and is running
      await ensureCategories();
      if (!sessionsCategory) return null;

      const sessionWrapper = await sessionsCategory.getById(ref.sessionId);
      if (!sessionWrapper) {
        // Session doesn't exist, cleanup localStorage
        localStorage.removeItem('translator_active_session');
        return null;
      }

      const session = sessionWrapper.value;

      if (session.status !== 'running' && session.status !== 'paused') {
        // Session already ended, cleanup localStorage
        localStorage.removeItem('translator_active_session');
        return null;
      }

      return { session, reference: ref };
    } catch (e) {
      console.error('Failed to check for active session:', e);
      return null;
    }
  }

  /**
   * Resume a session after browser refresh/crash
   * Updates heartbeat immediately and restarts heartbeat interval
   */
  async function resumeSessionFromCrash(
    sessionId: number,
    status: 'running' | 'paused' | 'completed' | 'error' | 'abandoned',
  ): Promise<void> {
    try {
      // Immediately update heartbeat
      await updateHeartbeat(sessionId);

      // update session to paused if its not already
      if (status !== 'paused') await pauseSession(sessionId);

      // TODO: Reconnect to WebPubSub
      // const ref = JSON.parse(localStorage.getItem('translator_active_session')!);
      // await webPubSubClient.reconnect(ref.webPubSubRoomId);

      // TODO: Restart Presentation mode if enabled

      // TODO: Set UI to paused, so operator can start translation again

      console.log(`Resumed session ${sessionId} after crash recovery`);
    } catch (e) {
      console.error('Failed to resume session from crash:', e);
      throw e;
    }
  }

  /**
   * Get active sessions available for reader discovery
   * Reads from streamed-sessions category (reader-accessible)
   */
  async function getDiscoverableSessions(): Promise<StreamedSessionMetadata[]> {
    try {
      await ensureCategories();
      if (!streamedSessionsCategory) return [];

      const sessions =
        await streamedSessionsCategory.list<StreamedSessionMetadata>();

      // Return all sessions in this category
      // They're already filtered (only active, non-hidden sessions are added)
      return sessions.map((s) => s.value);
    } catch (e: any) {
      console.error('Failed to fetch discoverable sessions:', e);
      return [];
    }
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
    sessions,
    sessionsLoading,
    sessionsSaving,
    currentSessionId,
    currentSession,
    error,

    // API Settings methods
    loadApiSettings,
    saveApiSettings,

    // WebPubSub methods
    loadOperatorSecret,
    saveOperatorSecret,
    loadReaderConfig,
    saveReaderConfig,
    validateWebPubSubConfig,

    // Settings methods
    loadSettingVariants,
    saveCurrentVariant,
    selectVariant,
    deleteVariant,
    markSettingsChanged,
    updateCleanSettingsState,
    hasSettingsChanged,

    // Session methods
    startSession,
    endSession,
    updateHeartbeat,
    pauseSession,
    resumeSession,
    fetchSessions,
    getUsageStats,
    clearAllSessions,
    generateDummySessions,

    // Session recovery
    checkForActiveSession,
    resumeSessionFromCrash,

    // Reader discovery
    getDiscoverableSessions,
  };
});
