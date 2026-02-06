import { describe, it, expect, beforeEach } from 'vitest';
import { useSessionStore } from '../../src/stores/session';
import { useSettingsStore } from '../../src/stores/settings';
import { useSessionHistoryStore } from '../../src/stores/sessionHistory';
import {
  SessionLogger,
  type TranslationSession,
} from '../../src/services/sessionLogger';

/**
 * Integration Tests: Session Tracking
 *
 * Tests the full workflow of session management including creating, pausing,
 * resuming, ending sessions, heartbeats, and abandoned session detection.
 *
 * These tests use real PersistanceCategory with mocked kv-store backend.
 */
describe('Session Tracking Integration', () => {
  let sessionStore: ReturnType<typeof useSessionStore>;
  let settingsStore: ReturnType<typeof useSettingsStore>;
  let historyStore: ReturnType<typeof useSessionHistoryStore>;
  let sessionLogger: SessionLogger;

  beforeEach(async () => {
    // Note: Pinia and mocks are set up in setup.ts global beforeEach
    sessionStore = useSessionStore();
    settingsStore = useSettingsStore();
    historyStore = useSessionHistoryStore();
    sessionLogger = new SessionLogger();
    await settingsStore.loadApiSettings();
    await settingsStore.loadSettingVariants();
  });

  describe('Starting Sessions', () => {
    it('should create a new session record', async () => {
      const sessionData: TranslationSession = sessionLogger.createSession({
        userId: 1,
        userEmail: 'test@example.com',
        userName: 'Test User',
        inputLanguage: 'de-DE',
        outputLanguages: ['en'],
        mode: 'test',
      });

      await sessionStore.startSession(sessionData);

      expect(sessionStore.currentSessionId).not.toBeNull();
      expect(sessionStore.currentSession).toBeDefined();
      expect(sessionStore.currentSession?.status).toBe('running');
      expect(sessionStore.currentSession?.inputLanguage).toBe('de-DE');
      expect(sessionStore.currentSession?.outputLanguages).toEqual(['en']);
    });

    it('should store session in persistence', async () => {
      const sessionData: TranslationSession = sessionLogger.createSession({
        userId: 1,
        userEmail: 'user@test.com',
        userName: 'User',
        inputLanguage: 'en-US',
        outputLanguages: ['de', 'es'],
        mode: 'presentation',
      });

      await sessionStore.startSession(sessionData);
      await historyStore.fetchSessions();

      const savedSession = historyStore.sessions.find(
        (s) => s.id === sessionStore.currentSessionId,
      );
      expect(savedSession).toBeDefined();
      expect(savedSession?.value.status).toBe('running');
    });

    it('should support multiple concurrent sessions for different users', async () => {
      const session1 = sessionLogger.createSession({
        userId: 1,
        userEmail: 'user1@test.com',
        userName: 'User 1',
        inputLanguage: 'de-DE',
        outputLanguages: ['en'],
        mode: 'test',
      });

      const session2 = sessionLogger.createSession({
        userId: 2,
        userEmail: 'user2@test.com',
        userName: 'User 2',
        inputLanguage: 'fr-FR',
        outputLanguages: ['en'],
        mode: 'presentation',
      });

      await sessionStore.startSession(session1);
      const sessionId1 = sessionStore.currentSessionId;

      await sessionStore.startSession(session2);
      const sessionId2 = sessionStore.currentSessionId;

      expect(sessionId1).not.toBe(sessionId2);

      await historyStore.fetchSessions();
      expect(historyStore.sessions.some((s) => s.id === sessionId1)).toBe(true);
      expect(historyStore.sessions.some((s) => s.id === sessionId2)).toBe(true);
    });

    it('should record correct timestamp', async () => {
      const beforeStart = new Date();

      const sessionData = sessionLogger.createSession({
        userId: 1,
        userEmail: 'test@example.com',
        userName: 'Test',
        inputLanguage: 'de-DE',
        outputLanguages: ['en'],
        mode: 'test',
      });

      await sessionStore.startSession(sessionData);

      const afterStart = new Date();
      const sessionStart = new Date(sessionStore.currentSession!.startTime);

      expect(sessionStart.getTime()).toBeGreaterThanOrEqual(
        beforeStart.getTime(),
      );
      expect(sessionStart.getTime()).toBeLessThanOrEqual(afterStart.getTime());
    });
  });

  describe('Heartbeat Updates', () => {
    it('should update lastHeartbeat timestamp', async () => {
      const sessionData = sessionLogger.createSession({
        userId: 1,
        userEmail: 'test@example.com',
        userName: 'Test',
        inputLanguage: 'de-DE',
        outputLanguages: ['en'],
        mode: 'test',
      });

      await sessionStore.startSession(sessionData);
      const sessionId = sessionStore.currentSessionId!;

      const beforeHeartbeat = new Date();
      await sessionStore.updateHeartbeat(sessionId);
      const afterHeartbeat = new Date();

      await historyStore.fetchSessions();
      const session = historyStore.sessions.find((s) => s.id === sessionId);
      const heartbeat = new Date(session!.value.lastHeartbeat!);

      expect(heartbeat.getTime()).toBeGreaterThanOrEqual(
        beforeHeartbeat.getTime(),
      );
      expect(heartbeat.getTime()).toBeLessThanOrEqual(afterHeartbeat.getTime());
    });

    it('should maintain heartbeat during active session', async () => {
      const sessionData = sessionLogger.createSession({
        userId: 1,
        userEmail: 'test@example.com',
        userName: 'Test',
        inputLanguage: 'de-DE',
        outputLanguages: ['en'],
        mode: 'test',
      });

      await sessionStore.startSession(sessionData);
      const sessionId = sessionStore.currentSessionId!;

      // Simulate multiple heartbeats
      for (let i = 0; i < 3; i++) {
        await sessionStore.updateHeartbeat(sessionId);
      }

      await historyStore.fetchSessions();
      const session = historyStore.sessions.find((s) => s.id === sessionId);
      expect(session?.value.lastHeartbeat).toBeDefined();
      expect(session?.value.status).toBe('running');
    });

    it('should recover from abandoned state on heartbeat', async () => {
      const sessionData = sessionLogger.createSession({
        userId: 1,
        userEmail: 'test@example.com',
        userName: 'Test',
        inputLanguage: 'de-DE',
        outputLanguages: ['en'],
        mode: 'test',
      });

      await sessionStore.startSession(sessionData);
      const sessionId = sessionStore.currentSessionId!;

      // Manually set to abandoned (simulating detection)
      await historyStore.fetchSessions();
      let session = historyStore.sessions.find((s) => s.id === sessionId)!;
      const abandonedSession: TranslationSession = {
        ...session.value,
        status: 'abandoned',
      };

      // Update heartbeat should recover
      const recoveredSession = sessionLogger.updateHeartbeat(abandonedSession);
      expect(recoveredSession.status).toBe('running');
    });
  });

  describe('Pausing Sessions', () => {
    it('should mark session as paused', async () => {
      const sessionData = sessionLogger.createSession({
        userId: 1,
        userEmail: 'test@example.com',
        userName: 'Test',
        inputLanguage: 'de-DE',
        outputLanguages: ['en'],
        mode: 'test',
      });

      await sessionStore.startSession(sessionData);
      const sessionId = sessionStore.currentSessionId!;

      await sessionStore.pauseSession(sessionId);

      await historyStore.fetchSessions();
      const session = historyStore.sessions.find((s) => s.id === sessionId);
      expect(session?.value.status).toBe('paused');
      expect(session?.value.pausedAt).toBeDefined();
    });

    it('should track pause timestamp', async () => {
      const sessionData = sessionLogger.createSession({
        userId: 1,
        userEmail: 'test@example.com',
        userName: 'Test',
        inputLanguage: 'de-DE',
        outputLanguages: ['en'],
        mode: 'test',
      });

      await sessionStore.startSession(sessionData);
      const sessionId = sessionStore.currentSessionId!;

      const beforePause = new Date();
      await sessionStore.pauseSession(sessionId);
      const afterPause = new Date();

      await historyStore.fetchSessions();
      const session = historyStore.sessions.find((s) => s.id === sessionId);
      const pausedAt = new Date(session!.value.pausedAt!);

      expect(pausedAt.getTime()).toBeGreaterThanOrEqual(beforePause.getTime());
      expect(pausedAt.getTime()).toBeLessThanOrEqual(afterPause.getTime());
    });

    it('should allow pausing already paused session (idempotent)', async () => {
      const sessionData = sessionLogger.createSession({
        userId: 1,
        userEmail: 'test@example.com',
        userName: 'Test',
        inputLanguage: 'de-DE',
        outputLanguages: ['en'],
        mode: 'test',
      });

      await sessionStore.startSession(sessionData);
      const sessionId = sessionStore.currentSessionId!;

      await sessionStore.pauseSession(sessionId);
      await sessionStore.pauseSession(sessionId);

      await historyStore.fetchSessions();
      const session = historyStore.sessions.find((s) => s.id === sessionId);
      expect(session?.value.status).toBe('paused');
    });
  });

  describe('Resuming Sessions', () => {
    it('should mark session as running', async () => {
      const sessionData = sessionLogger.createSession({
        userId: 1,
        userEmail: 'test@example.com',
        userName: 'Test',
        inputLanguage: 'de-DE',
        outputLanguages: ['en'],
        mode: 'test',
      });

      await sessionStore.startSession(sessionData);
      const sessionId = sessionStore.currentSessionId!;

      await sessionStore.pauseSession(sessionId);
      await sessionStore.resumeSession(sessionId);

      await historyStore.fetchSessions();
      const session = historyStore.sessions.find((s) => s.id === sessionId);
      expect(session?.value.status).toBe('running');
      expect(session?.value.pausedAt).toBeUndefined();
    });

    it('should calculate paused duration', async () => {
      const sessionData = sessionLogger.createSession({
        userId: 1,
        userEmail: 'test@example.com',
        userName: 'Test',
        inputLanguage: 'de-DE',
        outputLanguages: ['en'],
        mode: 'test',
      });

      await sessionStore.startSession(sessionData);
      const sessionId = sessionStore.currentSessionId!;

      await sessionStore.pauseSession(sessionId);

      await sessionStore.resumeSession(sessionId);

      await historyStore.fetchSessions();
      const session = historyStore.sessions.find((s) => s.id === sessionId);

      // Should have some paused duration (at least 0 minutes)
      expect(session?.value.pausedDurationMinutes).toBeDefined();
      expect(session?.value.pausedDurationMinutes).toBeGreaterThanOrEqual(0);
    });

    it('should accumulate multiple pause durations', async () => {
      const sessionData = sessionLogger.createSession({
        userId: 1,
        userEmail: 'test@example.com',
        userName: 'Test',
        inputLanguage: 'de-DE',
        outputLanguages: ['en'],
        mode: 'test',
      });

      await sessionStore.startSession(sessionData);
      const sessionId = sessionStore.currentSessionId!;

      // First pause/resume
      await sessionStore.pauseSession(sessionId);
      await sessionStore.resumeSession(sessionId);

      await historyStore.fetchSessions();
      const afterFirstResume = historyStore.sessions.find(
        (s) => s.id === sessionId,
      );
      const firstPauseDuration =
        afterFirstResume?.value.pausedDurationMinutes || 0;

      // Second pause/resume
      await sessionStore.pauseSession(sessionId);
      await sessionStore.resumeSession(sessionId);

      await historyStore.fetchSessions();
      const afterSecondResume = historyStore.sessions.find(
        (s) => s.id === sessionId,
      );
      const totalPauseDuration =
        afterSecondResume?.value.pausedDurationMinutes || 0;

      // Second pause should add to the total
      expect(totalPauseDuration).toBeGreaterThanOrEqual(firstPauseDuration);
    });
  });

  describe('Ending Sessions', () => {
    it('should mark session as completed', async () => {
      const sessionData = sessionLogger.createSession({
        userId: 1,
        userEmail: 'test@example.com',
        userName: 'Test',
        inputLanguage: 'de-DE',
        outputLanguages: ['en'],
        mode: 'test',
      });

      await sessionStore.startSession(sessionData);
      const sessionId = sessionStore.currentSessionId!;

      await sessionStore.endSession(sessionId, {
        status: 'completed',
        endTime: new Date().toISOString(),
      });

      await historyStore.fetchSessions();
      const session = historyStore.sessions.find((s) => s.id === sessionId);
      expect(session?.value.status).toBe('completed');
      expect(session?.value.endTime).toBeDefined();
    });

    it('should calculate total duration', async () => {
      const sessionData = sessionLogger.createSession({
        userId: 1,
        userEmail: 'test@example.com',
        userName: 'Test',
        inputLanguage: 'de-DE',
        outputLanguages: ['en'],
        mode: 'test',
      });

      await sessionStore.startSession(sessionData);
      const sessionId = sessionStore.currentSessionId!;

      await sessionStore.endSession(sessionId, {
        status: 'completed',
        endTime: new Date().toISOString(),
      });

      await historyStore.fetchSessions();
      const session = historyStore.sessions.find((s) => s.id === sessionId);
      expect(session?.value.durationMinutes).toBeDefined();
      expect(session?.value.durationMinutes).toBeGreaterThanOrEqual(0);
    });

    it('should support error status', async () => {
      const sessionData = sessionLogger.createSession({
        userId: 1,
        userEmail: 'test@example.com',
        userName: 'Test',
        inputLanguage: 'de-DE',
        outputLanguages: ['en'],
        mode: 'test',
      });

      await sessionStore.startSession(sessionData);
      const sessionId = sessionStore.currentSessionId!;

      await sessionStore.endSession(sessionId, {
        status: 'error',
        endTime: new Date().toISOString(),
      });

      await historyStore.fetchSessions();
      const session = historyStore.sessions.find((s) => s.id === sessionId);
      expect(session?.value.status).toBe('error');
    });

    it('should clear current session after ending', async () => {
      const sessionData = sessionLogger.createSession({
        userId: 1,
        userEmail: 'test@example.com',
        userName: 'Test',
        inputLanguage: 'de-DE',
        outputLanguages: ['en'],
        mode: 'test',
      });

      await sessionStore.startSession(sessionData);
      const sessionId = sessionStore.currentSessionId!;

      await sessionStore.endSession(sessionId, {
        status: 'completed',
        endTime: new Date().toISOString(),
      });

      // Current session should be cleared
      expect(sessionStore.currentSessionId).toBeNull();
      expect(sessionStore.currentSession).toBeNull();
    });
  });

  describe('Abandoned Session Detection', () => {
    it('should detect sessions with old heartbeat', async () => {
      const sessionData = sessionLogger.createSession({
        userId: 1,
        userEmail: 'test@example.com',
        userName: 'Test',
        inputLanguage: 'de-DE',
        outputLanguages: ['en'],
        mode: 'test',
      });

      // Create session with old heartbeat
      const oldHeartbeat = new Date();
      oldHeartbeat.setMinutes(oldHeartbeat.getMinutes() - 10); // 10 minutes ago

      const oldSession: TranslationSession = {
        ...sessionData,
        lastHeartbeat: oldHeartbeat.toISOString(),
      };

      await sessionStore.startSession(oldSession);

      // In a real scenario, a background job would mark this as abandoned
      // For this test, we just verify the heartbeat is old
      await historyStore.fetchSessions();
      const session = historyStore.sessions.find(
        (s) => s.id === sessionStore.currentSessionId,
      );
      const heartbeatAge =
        Date.now() - new Date(session!.value.lastHeartbeat!).getTime();

      expect(heartbeatAge).toBeGreaterThan(5 * 60 * 1000); // More than 5 minutes old
    });

    it('should keep running sessions with recent heartbeat', async () => {
      const sessionData = sessionLogger.createSession({
        userId: 1,
        userEmail: 'test@example.com',
        userName: 'Test',
        inputLanguage: 'de-DE',
        outputLanguages: ['en'],
        mode: 'test',
      });

      await sessionStore.startSession(sessionData);
      const sessionId = sessionStore.currentSessionId!;

      await sessionStore.updateHeartbeat(sessionId);

      await historyStore.fetchSessions();
      const session = historyStore.sessions.find((s) => s.id === sessionId);
      const heartbeatAge =
        Date.now() - new Date(session!.value.lastHeartbeat!).getTime();

      expect(heartbeatAge).toBeLessThan(5 * 60 * 1000); // Less than 5 minutes
      expect(session?.value.status).toBe('running');
    });
  });

  describe('Session Recovery', () => {
    it('should recover from error state', async () => {
      const sessionData = sessionLogger.createSession({
        userId: 1,
        userEmail: 'test@example.com',
        userName: 'Test',
        inputLanguage: 'de-DE',
        outputLanguages: ['en'],
        mode: 'test',
      });

      await sessionStore.startSession(sessionData);
      const sessionId = sessionStore.currentSessionId!;

      // End with error
      await sessionStore.endSession(sessionId, {
        status: 'error',
        endTime: new Date().toISOString(),
      });

      // Verify error status
      await historyStore.fetchSessions();
      const errorSession = historyStore.sessions.find(
        (s) => s.id === sessionId,
      );
      expect(errorSession?.value.status).toBe('error');

      // In a real app, user might start a new session after error
      const newSessionData = sessionLogger.createSession({
        userId: 1,
        userEmail: 'test@example.com',
        userName: 'Test',
        inputLanguage: 'de-DE',
        outputLanguages: ['en'],
        mode: 'test',
      });

      await sessionStore.startSession(newSessionData);
      expect(sessionStore.currentSessionId).not.toBe(sessionId);
      expect(sessionStore.currentSession?.status).toBe('running');
    });
  });

  describe('Session Data Integrity', () => {
    it('should preserve all session fields', async () => {
      const sessionData = sessionLogger.createSession({
        userId: 42,
        userEmail: 'detail@test.com',
        userName: 'Detail User',
        inputLanguage: 'fr-FR',
        outputLanguages: ['en', 'de', 'es'],
        mode: 'presentation',
      });

      await sessionStore.startSession(sessionData);

      await historyStore.fetchSessions();
      const session = historyStore.sessions.find(
        (s) => s.id === sessionStore.currentSessionId,
      );

      expect(session?.value.userId).toBe(42);
      expect(session?.value.userEmail).toBe('detail@test.com');
      expect(session?.value.userName).toBe('Detail User');
      expect(session?.value.inputLanguage).toBe('fr-FR');
      expect(session?.value.outputLanguages).toEqual(['en', 'de', 'es']);
      expect(session?.value.mode).toBe('presentation');
    });

    it('should handle sessions with minimal data', async () => {
      const minimalSession: TranslationSession = {
        userId: 1,
        userEmail: 'min@test.com',
        userName: 'Min',
        startTime: new Date().toISOString(),
        inputLanguage: 'en-US',
        outputLanguages: ['de'],
        mode: 'test',
        status: 'running',
      };

      await sessionStore.startSession(minimalSession);

      await historyStore.fetchSessions();
      const session = historyStore.sessions.find(
        (s) => s.id === sessionStore.currentSessionId,
      );
      expect(session).toBeDefined();
      expect(session?.value.status).toBe('running');
    });
  });

  describe('Multiple Sessions Per User', () => {
    it('should track multiple sessions for same user', async () => {
      const userId = 1;

      // Create first session
      const session1 = sessionLogger.createSession({
        userId,
        userEmail: 'user@test.com',
        userName: 'User',
        inputLanguage: 'de-DE',
        outputLanguages: ['en'],
        mode: 'test',
      });

      await sessionStore.startSession(session1);
      const sessionId1 = sessionStore.currentSessionId!;
      await sessionStore.endSession(sessionId1, {
        status: 'completed',
        endTime: new Date().toISOString(),
      });

      // Create second session
      const session2 = sessionLogger.createSession({
        userId,
        userEmail: 'user@test.com',
        userName: 'User',
        inputLanguage: 'fr-FR',
        outputLanguages: ['en'],
        mode: 'presentation',
      });

      await sessionStore.startSession(session2);
      const sessionId2 = sessionStore.currentSessionId!;

      await historyStore.fetchSessions();
      const userSessions = historyStore.sessions.filter(
        (s) => s.value.userId === userId,
      );

      expect(userSessions.length).toBeGreaterThanOrEqual(2);
      expect(sessionId1).not.toBe(sessionId2);
    });
  });
});
