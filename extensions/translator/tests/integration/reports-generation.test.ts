import { describe, it, expect, beforeEach } from 'vitest';
import { useTranslatorStore } from '../../src/stores/translator';
import {
  SessionLogger,
  type TranslationSession,
} from '../../src/services/sessionLogger';

/**
 * Integration Tests: Reports Generation
 *
 * Tests usage statistics, session aggregation, and report generation
 * across multiple users and time periods.
 */
describe('Reports Generation Integration', () => {
  let store: ReturnType<typeof useTranslatorStore>;
  let sessionLogger: SessionLogger;

  beforeEach(async () => {
    store = useTranslatorStore();
    sessionLogger = new SessionLogger();
    await store.loadApiSettings();
    await store.loadSettingVariants();
  });

  describe('Fetching Sessions', () => {
    it('should fetch all sessions from persistence', async () => {
      // Create multiple sessions
      for (let i = 0; i < 3; i++) {
        const session = sessionLogger.createSession({
          userId: 1,
          userEmail: 'user@test.com',
          userName: 'User',
          inputLanguage: 'de-DE',
          outputLanguages: ['en'],
          mode: 'test',
        });
        await store.startSession(session);
        await store.endSession(store.currentSessionId!, {
          status: 'completed',
          endTime: new Date().toISOString(),
        });
      }

      await store.fetchSessions();

      expect(store.sessions.length).toBeGreaterThanOrEqual(3);
    });

    it('should include session details', async () => {
      const session = sessionLogger.createSession({
        userId: 42,
        userEmail: 'detail@test.com',
        userName: 'Detail User',
        inputLanguage: 'fr-FR',
        outputLanguages: ['en', 'de'],
        mode: 'presentation',
      });

      await store.startSession(session);
      await store.fetchSessions();

      const savedSession = store.sessions.find((s) => s.value.userId === 42);
      expect(savedSession).toBeDefined();
      expect(savedSession?.value.userEmail).toBe('detail@test.com');
      expect(savedSession?.value.inputLanguage).toBe('fr-FR');
      expect(savedSession?.value.outputLanguages).toEqual(['en', 'de']);
    });
  });

  describe('Usage Statistics', () => {
    it('should aggregate sessions by user', async () => {
      // User 1 sessions
      for (let i = 0; i < 2; i++) {
        const session = sessionLogger.createSession({
          userId: 1,
          userEmail: 'user1@test.com',
          userName: 'User 1',
          inputLanguage: 'de-DE',
          outputLanguages: ['en'],
          mode: 'test',
        });
        await store.startSession(session);
        await store.endSession(store.currentSessionId!, {
          status: 'completed',
          endTime: new Date().toISOString(),
        });
      }

      // User 2 sessions
      for (let i = 0; i < 3; i++) {
        const session = sessionLogger.createSession({
          userId: 2,
          userEmail: 'user2@test.com',
          userName: 'User 2',
          inputLanguage: 'en-US',
          outputLanguages: ['de'],
          mode: 'presentation',
        });
        await store.startSession(session);
        await store.endSession(store.currentSessionId!, {
          status: 'completed',
          endTime: new Date().toISOString(),
        });
      }

      const stats = await store.getUsageStats();

      expect(stats.length).toBeGreaterThanOrEqual(2);
      const user1Stats = stats.find((s) => s.userId === 1);
      const user2Stats = stats.find((s) => s.userId === 2);

      expect(user1Stats?.sessionCount).toBe(2);
      expect(user2Stats?.sessionCount).toBe(3);
    });

    it('should calculate total minutes per user', async () => {
      const session1 = sessionLogger.createSession({
        userId: 1,
        userEmail: 'user@test.com',
        userName: 'User',
        inputLanguage: 'de-DE',
        outputLanguages: ['en'],
        mode: 'test',
      });

      await store.startSession(session1);
      const sessionId1 = store.currentSessionId!;

      await store.endSession(sessionId1, {
        status: 'completed',
        endTime: new Date().toISOString(),
      });

      const stats = await store.getUsageStats();
      const userStats = stats.find((s) => s.userId === 1);

      expect(userStats?.totalMinutes).toBeGreaterThanOrEqual(0);
      expect(userStats?.activeMinutes).toBeGreaterThanOrEqual(0);
    });

    it('should track active vs paused minutes', async () => {
      const session = sessionLogger.createSession({
        userId: 1,
        userEmail: 'user@test.com',
        userName: 'User',
        inputLanguage: 'de-DE',
        outputLanguages: ['en'],
        mode: 'test',
      });

      await store.startSession(session);
      const sessionId = store.currentSessionId!;

      // Pause
      await store.pauseSession(sessionId);

      // Resume
      await store.resumeSession(sessionId);

      await store.endSession(sessionId, {
        status: 'completed',
        endTime: new Date().toISOString(),
      });

      const stats = await store.getUsageStats();
      const userStats = stats.find((s) => s.userId === 1);

      expect(userStats?.pausedMinutes).toBeGreaterThanOrEqual(0);
    });

    it('should track last used timestamp', async () => {
      const beforeSession = new Date();

      const session = sessionLogger.createSession({
        userId: 1,
        userEmail: 'user@test.com',
        userName: 'User',
        inputLanguage: 'de-DE',
        outputLanguages: ['en'],
        mode: 'test',
      });

      await store.startSession(session);
      await store.endSession(store.currentSessionId!, {
        status: 'completed',
        endTime: new Date().toISOString(),
      });

      const afterSession = new Date();

      const stats = await store.getUsageStats();
      const userStats = stats.find((s) => s.userId === 1);

      const lastUsed = new Date(userStats!.lastUsed);
      expect(lastUsed.getTime()).toBeGreaterThanOrEqual(
        beforeSession.getTime(),
      );
      expect(lastUsed.getTime()).toBeLessThanOrEqual(afterSession.getTime());
    });

    it('should include per-session breakdown', async () => {
      // Create multiple sessions
      for (let i = 0; i < 3; i++) {
        const session = sessionLogger.createSession({
          userId: 1,
          userEmail: 'user@test.com',
          userName: 'User',
          inputLanguage: 'de-DE',
          outputLanguages: ['en'],
          mode: 'test',
        });
        await store.startSession(session);
        await store.endSession(store.currentSessionId!, {
          status: 'completed',
          endTime: new Date().toISOString(),
        });
      }

      const stats = await store.getUsageStats();
      const userStats = stats.find((s) => s.userId === 1);

      expect(userStats?.sessions).toBeDefined();
      expect(userStats?.sessions.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Handling Different Session States', () => {
    it('should include completed sessions in stats', async () => {
      const session = sessionLogger.createSession({
        userId: 1,
        userEmail: 'user@test.com',
        userName: 'User',
        inputLanguage: 'de-DE',
        outputLanguages: ['en'],
        mode: 'test',
      });

      await store.startSession(session);
      await store.endSession(store.currentSessionId!, {
        status: 'completed',
        endTime: new Date().toISOString(),
      });

      const stats = await store.getUsageStats();
      const userStats = stats.find((s) => s.userId === 1);

      expect(userStats?.sessionCount).toBeGreaterThanOrEqual(1);
    });

    it('should handle abandoned sessions in reports', async () => {
      // Create an abandoned session (old heartbeat, no end time)
      const oldTime = new Date();
      oldTime.setMinutes(oldTime.getMinutes() - 30);

      const abandonedSession: TranslationSession = {
        userId: 1,
        userEmail: 'user@test.com',
        userName: 'User',
        startTime: oldTime.toISOString(),
        lastHeartbeat: oldTime.toISOString(),
        inputLanguage: 'de-DE',
        outputLanguages: ['en'],
        mode: 'test',
        status: 'abandoned',
      };

      await store.startSession(abandonedSession);

      const stats = await store.getUsageStats();
      // Should still be included in stats
      expect(stats.length).toBeGreaterThan(0);
    });

    it('should handle error sessions in reports', async () => {
      const session = sessionLogger.createSession({
        userId: 1,
        userEmail: 'user@test.com',
        userName: 'User',
        inputLanguage: 'de-DE',
        outputLanguages: ['en'],
        mode: 'test',
      });

      await store.startSession(session);
      await store.endSession(store.currentSessionId!, {
        status: 'error',
        endTime: new Date().toISOString(),
      });

      const stats = await store.getUsageStats();
      const userStats = stats.find((s) => s.userId === 1);

      // Error sessions should still be counted
      expect(userStats?.sessionCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Empty Data Handling', () => {
    it('should handle empty session list', async () => {
      const stats = await store.getUsageStats();

      expect(stats).toBeDefined();
      expect(Array.isArray(stats)).toBe(true);
      expect(stats.length).toBe(0);
    });

    it('should handle fetch when no sessions exist', async () => {
      await store.fetchSessions();

      expect(store.sessions).toBeDefined();
      expect(store.sessions.length).toBe(0);
    });
  });

  describe('Large Dataset Handling', () => {
    it('should handle many sessions efficiently', async () => {
      // Create 20 sessions
      for (let i = 0; i < 20; i++) {
        const session = sessionLogger.createSession({
          userId: (i % 3) + 1, // Distribute across 3 users
          userEmail: `user${(i % 3) + 1}@test.com`,
          userName: `User ${(i % 3) + 1}`,
          inputLanguage: 'de-DE',
          outputLanguages: ['en'],
          mode: 'test',
        });
        await store.startSession(session);
        await store.endSession(store.currentSessionId!, {
          status: 'completed',
          endTime: new Date().toISOString(),
        });
      }

      const startTime = Date.now();
      const stats = await store.getUsageStats();
      const duration = Date.now() - startTime;

      // Should complete reasonably fast (under 1 second)
      expect(duration).toBeLessThan(1000);
      expect(stats.length).toBe(3); // 3 users
    });
  });

  describe('Clear All Sessions', () => {
    it('should clear all sessions from persistence', async () => {
      // Create sessions
      for (let i = 0; i < 3; i++) {
        const session = sessionLogger.createSession({
          userId: 1,
          userEmail: 'user@test.com',
          userName: 'User',
          inputLanguage: 'de-DE',
          outputLanguages: ['en'],
          mode: 'test',
        });
        await store.startSession(session);
        await store.endSession(store.currentSessionId!, {
          status: 'completed',
          endTime: new Date().toISOString(),
        });
      }

      await store.fetchSessions();
      expect(store.sessions.length).toBeGreaterThan(0);

      // Clear all
      await store.clearAllSessions();
      await store.fetchSessions();

      expect(store.sessions.length).toBe(0);
    });

    it('should allow new sessions after clearing', async () => {
      // Clear
      await store.clearAllSessions();

      // Create new session
      const session = sessionLogger.createSession({
        userId: 1,
        userEmail: 'user@test.com',
        userName: 'User',
        inputLanguage: 'de-DE',
        outputLanguages: ['en'],
        mode: 'test',
      });

      await store.startSession(session);
      await store.fetchSessions();

      expect(store.sessions.length).toBe(1);
    });
  });
});
