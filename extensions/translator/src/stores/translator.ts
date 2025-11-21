import { defineStore } from 'pinia';
import { ref } from 'vue';
import {
  PersistanceCategory,
  type CategoryValue,
} from '@churchtools-extensions/persistance';
import { KEY } from '../config';
import {
  SessionLogger,
  type TranslationSession,
} from '../services/sessionLogger';

export interface TranslatorSettings {
  // Azure Configuration
  azureApiKey?: string;
  azureRegion?: string;

  // Translation Options
  inputLanguage: { name: string; code: string };
  outputLanguage: { name: string; code: string };
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

export interface UsageStats {
  userId: number;
  userEmail: string;
  userName: string;
  totalMinutes: number;
  sessionCount: number;
  lastUsed: string;
  sessions: { date: string; minutes: number }[];
}

const DEFAULT_SETTINGS: TranslatorSettings = {
  inputLanguage: { name: 'German', code: 'de-DE' },
  outputLanguage: { name: 'English', code: 'en' },
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
  // Settings
  const settings = ref<TranslatorSettings>({ ...DEFAULT_SETTINGS });
  const settingsLoading = ref(false);
  const settingsSaving = ref(false);

  // Sessions
  const sessions = ref<CategoryValue<TranslationSession>[]>([]);
  const sessionsLoading = ref(false);
  const sessionsSaving = ref(false);

  // Current session
  const currentSessionId = ref<number | null>(null);
  const currentSession = ref<TranslationSession | null>(null);

  // Error handling
  const error = ref<string | null>(null);

  // Categories
  let settingsCategory: PersistanceCategory<TranslatorSettings> | null = null;
  let sessionsCategory: PersistanceCategory<TranslationSession> | null = null;

  /**
   * Initialize categories
   */
  async function ensureCategories() {
    if (!settingsCategory) {
      settingsCategory = await PersistanceCategory.init({
        extensionkey: KEY,
        categoryShorty: 'settings',
        categoryName: 'Translator Settings',
      });
    }
    if (!sessionsCategory) {
      sessionsCategory = await PersistanceCategory.init({
        extensionkey: KEY,
        categoryShorty: 'sessions',
        categoryName: 'Translation Sessions',
      });
    }
  }

  /**
   * Load settings from persistence
   */
  async function loadSettings() {
    settingsLoading.value = true;
    error.value = null;
    try {
      await ensureCategories();
      if (!settingsCategory) return;

      const list = await settingsCategory.list<TranslatorSettings>();
      if (list.length > 0) {
        // Use first settings record
        settings.value = { ...DEFAULT_SETTINGS, ...list[0].value };
      } else {
        // No settings yet, use defaults
        settings.value = { ...DEFAULT_SETTINGS };
      }
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to load settings';
      console.error('loadSettings failed', e);
    } finally {
      settingsLoading.value = false;
    }
  }

  /**
   * Save settings to persistence
   */
  async function saveSettings(newSettings: TranslatorSettings) {
    settingsSaving.value = true;
    error.value = null;
    try {
      await ensureCategories();
      if (!settingsCategory) return;

      const list = await settingsCategory.list<TranslatorSettings>();

      if (list.length > 0) {
        // Update existing settings
        await settingsCategory.update(list[0].id, newSettings);
      } else {
        // Create new settings record
        await settingsCategory.create(newSettings);
      }

      settings.value = { ...newSettings };
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to save settings';
      console.error('saveSettings failed', e);
      throw e;
    } finally {
      settingsSaving.value = false;
    }
  }

  /**
   * Reset settings to defaults
   */
  async function resetSettings() {
    // Preserve Azure credentials when resetting
    const preservedSettings = {
      ...DEFAULT_SETTINGS,
      azureApiKey: settings.value.azureApiKey,
      azureRegion: settings.value.azureRegion,
    };
    await saveSettings(preservedSettings);
  }

  /**
   * Start a new translation session
   */
  async function startSession(sessionData: TranslationSession) {
    sessionsSaving.value = true;
    error.value = null;
    try {
      await ensureCategories();
      if (!sessionsCategory) return;

      const { id } = await sessionsCategory.create(sessionData);
      currentSessionId.value = id;
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

      const existing = sessions.value.find(
        (s: CategoryValue<TranslationSession>) => s.id === sessionId,
      );
      if (!existing) {
        // If not in cache, we still need to update it
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
      } else {
        const merged: TranslationSession = {
          ...existing.value,
          ...updates,
        };
        await sessionsCategory.update(sessionId, merged);
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
   */
  async function updateHeartbeat(sessionId: number) {
    // Non-blocking update - don't throw errors to avoid disrupting translation
    try {
      if (!sessionsCategory) await ensureCategories();
      if (!sessionsCategory) return;

      const allSessions = await sessionsCategory.list<TranslationSession>();
      const found = allSessions.find(
        (s: CategoryValue<TranslationSession>) => s.id === sessionId,
      );
      if (!found) return;

      const updated: TranslationSession = {
        ...found.value,
        lastHeartbeat: new Date().toISOString(),
      };

      await sessionsCategory.update(sessionId, updated);
    } catch (e) {
      // Silent fail - log but don't disrupt translation
      console.warn('Failed to update heartbeat (non-critical):', e);
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
            sessionCount: 0,
            lastUsed: session.startTime,
            sessions: [],
          });
        }

        const stats = userMap.get(userId)!;
        stats.sessionCount++;

        // Use smart duration calculation that handles abandoned sessions
        const duration =
          session.durationMinutes ||
          SessionLogger.calculateSessionDuration(session);
        stats.totalMinutes += duration;

        // Update last used if this session is more recent
        if (new Date(session.startTime) > new Date(stats.lastUsed)) {
          stats.lastUsed = session.startTime;
        }

        // Add to per-day breakdown
        const date = session.startTime.split('T')[0]; // Get YYYY-MM-DD
        const existingDay = stats.sessions.find((s) => s.date === date);
        if (existingDay) {
          existingDay.minutes += duration;
        } else {
          stats.sessions.push({
            date,
            minutes: duration,
          });
        }
      },
    );

    // Sort sessions by date
    userMap.forEach((stats) => {
      stats.sessions.sort((a, b) => b.date.localeCompare(a.date));
    });

    return Array.from(userMap.values()).sort(
      (a, b) => b.totalMinutes - a.totalMinutes,
    );
  }

  return {
    // State
    settings,
    settingsLoading,
    settingsSaving,
    sessions,
    sessionsLoading,
    sessionsSaving,
    currentSessionId,
    currentSession,
    error,

    // Settings methods
    loadSettings,
    saveSettings,
    resetSettings,

    // Session methods
    startSession,
    endSession,
    updateHeartbeat,
    fetchSessions,
    getUsageStats,
  };
});
