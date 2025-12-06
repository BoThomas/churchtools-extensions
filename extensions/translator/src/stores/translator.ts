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

export interface ApiSettings {
  azureApiKey: string;
  azureRegion: string;
}

export interface TranslatorSettings {
  // Translation Options
  inputLanguage: string; // Language code (e.g., 'de-DE')
  outputLanguage: string; // Language code (e.g., 'en')
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
  outputLanguage: 'en',
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
  },
};

export const useTranslatorStore = defineStore('translator', () => {
  // Initial loading state
  const initializing = ref(true);

  // API Settings
  const apiSettings = ref<ApiSettings>({ azureApiKey: '', azureRegion: '' });
  const apiSettingsLoading = ref(false);
  const apiSettingsSaving = ref(false);

  // Settings
  const settings = ref<TranslatorSettings>({ ...DEFAULT_SETTINGS });
  const settingsLoading = ref(false);
  const settingsSaving = ref(false);

  // Setting Variants
  const settingVariants = ref<CategoryValue<SettingVariant>[]>([]);
  const selectedVariantId = ref<number | null>(null);
  const hasUnsavedChanges = ref(false);
  const selectingVariant = ref(false);

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
  let userPreferencesCategory: PersistanceCategory<{
    lastVariantId: number;
  }> | null = null;

  // Track initialization to prevent duplicate category creation during parallel calls
  let categoriesInitializing: Promise<void> | null = null;

  /**
   * Migrate old settings format (object with name/code) to new format (code string only)
   */
  function migrateSettings(settings: any): TranslatorSettings {
    const migrated = { ...settings };

    // Migrate inputLanguage if it's an object
    if (
      typeof settings.inputLanguage === 'object' &&
      settings.inputLanguage?.code
    ) {
      migrated.inputLanguage = settings.inputLanguage.code;
    }

    // Migrate outputLanguage if it's an object
    if (
      typeof settings.outputLanguage === 'object' &&
      settings.outputLanguage?.code
    ) {
      migrated.outputLanguage = settings.outputLanguage.code;
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
      userPreferencesCategory
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
      if (!userPreferencesCategory) {
        userPreferencesCategory = await PersistanceCategory.init({
          extensionkey: KEY,
          categoryShorty: 'user-prefs',
          categoryName: 'User Preferences',
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
      } else {
        // Load user's last selected variant
        let lastVariantId: number | null = null;

        if (userId) {
          const userPrefs =
            await userPreferencesCategory.list<
              Record<string, { lastVariantId: number }>
            >();
          if (userPrefs.length > 0) {
            const userPref = userPrefs[0].value[userId.toString()];
            lastVariantId = userPref?.lastVariantId || null;
          }
        }

        // Try to load the last selected variant
        const variantToLoad = lastVariantId
          ? list.find((v) => v.id === lastVariantId) || list[0]
          : list[0];

        selectedVariantId.value = variantToLoad.id;
        // Migrate settings if they're in old format
        settings.value = migrateSettings(
          JSON.parse(JSON.stringify(variantToLoad.value.settings)),
        );
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
   * Save current settings to the selected variant (or create new)
   */
  async function saveCurrentVariant(variantName?: string, userId?: number) {
    settingsSaving.value = true;
    error.value = null;
    try {
      await ensureCategories();
      if (!settingsCategory) return;

      const currentVariant = settingVariants.value.find(
        (v) => v.id === selectedVariantId.value,
      );

      // If saving to "Default" with changes, or no variant name and creating new
      if (variantName) {
        // Create new variant
        const newVariant: SettingVariant = {
          name: variantName,
          settings: { ...settings.value },
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
          settings: { ...settings.value },
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
    if (!settingsCategory) return;

    const list = await settingsCategory.list<SettingVariant>();
    settingVariants.value = list;

    const variant = list.find((v) => v.id === variantId);
    if (!variant) {
      selectingVariant.value = false;
      return;
    }

    selectedVariantId.value = variantId;
    // Deep clone to ensure no shared references
    settings.value = JSON.parse(JSON.stringify(variant.value.settings));
    hasUnsavedChanges.value = false;

    // Wait for Vue to process watchers before clearing the flag
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
   */
  function markSettingsChanged() {
    hasUnsavedChanges.value = true;
  }

  /**
   * Start a new translation session
   * Stores session in memory for optimistic updates
   */
  async function startSession(sessionData: TranslationSession) {
    sessionsSaving.value = true;
    error.value = null;
    try {
      await ensureCategories();
      if (!sessionsCategory) return;

      const { id } = await sessionsCategory.create(sessionData);
      currentSessionId.value = id;
      // Store complete session for optimistic updates
      currentSession.value = { ...sessionData, id };
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
          // Updates are complete, use optimistic update
          await sessionsCategory.update(
            sessionId,
            updates as TranslationSession,
          );
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
          await sessionsCategory.update(sessionId, merged);
        }
      }

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
    } catch (e) {
      // Silent fail - log but don't disrupt translation
      console.warn('Failed to update heartbeat (non-critical):', e);
    }
  }

  /**
   * Pause the current session (stops accumulating active time)
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
    } catch (e) {
      console.warn('Failed to pause session (non-critical):', e);
    }
  }

  /**
   * Resume the current session (starts accumulating active time again)
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

        // Add to per-day breakdown (using active duration for charts)
        const date = session.startTime.split('T')[0]; // Get YYYY-MM-DD
        const existingDay = stats.sessions.find((s) => s.date === date);
        if (existingDay) {
          existingDay.activeMinutes += activeDuration;
          existingDay.pausedMinutes += pausedDuration;
        } else {
          stats.sessions.push({
            date,
            activeMinutes: activeDuration,
            pausedMinutes: pausedDuration,
          });
        }
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
        { id: 1, name: 'Alice Example', email: 'alice@example.com' },
        { id: 2, name: 'Bob Example', email: 'bob@example.com' },
        { id: 3, name: 'Charlie Example', email: 'charlie@example.com' },
        { id: 4, name: 'Dana Example', email: 'dana@example.com' },
        { id: 5, name: 'Eve Example', email: 'eve@example.com' },
      ];

      const modes: TranslationSession['mode'][] = ['presentation', 'test'];
      const languages = [
        { in: 'de-DE', out: 'en' },
        { in: 'en', out: 'de-DE' },
        { in: 'es', out: 'en' },
        { in: 'fr', out: 'en' },
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
          outputLanguage: lang.out,
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

  return {
    // State
    initializing,
    apiSettings,
    apiSettingsLoading,
    apiSettingsSaving,
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

    // Settings methods
    loadSettingVariants,
    saveCurrentVariant,
    selectVariant,
    deleteVariant,
    markSettingsChanged,

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
  };
});
