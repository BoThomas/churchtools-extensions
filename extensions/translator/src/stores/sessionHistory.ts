import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { CategoryValue } from '@churchtools-extensions/persistance';
import {
  SessionLogger,
  type TranslationSession,
} from '../services/sessionLogger';
import {
  ensureTranslatorPersistance,
  getSessionsCategory,
  resetTranslatorPersistance,
} from '../services/translatorPersistance';
import type { UsageStats } from '../types/translator';

export const useSessionHistoryStore = defineStore('sessionHistory', () => {
  // Sessions
  const sessions = ref<CategoryValue<TranslationSession>[]>([]);
  const sessionsLoading = ref(false);
  const sessionsSaving = ref(false);

  // Error handling
  const error = ref<string | null>(null);

  // Category
  async function ensureSessionsCategory() {
    await ensureTranslatorPersistance();
  }

  /**
   * Fetch all sessions
   */
  async function fetchSessions() {
    sessionsLoading.value = true;
    error.value = null;
    try {
      const sessionsCategory = await getSessionsCategory();
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
      await ensureSessionsCategory();
      const sessionsCategory = await getSessionsCategory();
      if (!sessionsCategory) return;

      // Delete the entire category
      await sessionsCategory.deleteCategory();

      // Reset shared category instance so ensureSessionsCategory recreates it
      resetTranslatorPersistance();

      // Recreate the category
      await ensureSessionsCategory();

      // Clear local state
      sessions.value = [];
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
  async function generateDummySessions(count: number = 50) {
    sessionsSaving.value = true;
    error.value = null;
    try {
      await ensureSessionsCategory();
      const sessionsCategory = await getSessionsCategory();
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
        await Promise.all(chunk.map((s) => sessionsCategory.create(s)));
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
    sessions,
    sessionsLoading,
    sessionsSaving,
    error,

    // Actions
    fetchSessions,
    getUsageStats,
    clearAllSessions,
    generateDummySessions,
  };
});
