import { describe, it, expect, beforeEach } from 'vitest';
import { useTranslatorStore } from '../../src/stores/translator';
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
  let store: ReturnType<typeof useTranslatorStore>;
  let sessionLogger: SessionLogger;

  beforeEach(async () => {
    // Note: Pinia and mocks are set up in setup.ts global beforeEach
    store = useTranslatorStore();
    sessionLogger = new SessionLogger();
    await store.loadApiSettings();
    await store.loadSettingVariants();
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

      await store.startSession(sessionData);

      expect(store.currentSessionId).not.toBeNull();
      expect(store.currentSession).toBeDefined();
      expect(store.currentSession?.status).toBe('running');
      expect(store.currentSession?.inputLanguage).toBe('de-DE');
      expect(store.currentSession?.outputLanguages).toEqual(['en']);
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

      await store.startSession(sessionData);
      await store.fetchSessions();

      const savedSession = store.sessions.find(
        (s) => s.id === store.currentSessionId,
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

      await store.startSession(session1);
      const sessionId1 = store.currentSessionId;

      await store.startSession(session2);
      const sessionId2 = store.currentSessionId;

      expect(sessionId1).not.toBe(sessionId2);

      await store.fetchSessions();
      expect(store.sessions.some((s) => s.id === sessionId1)).toBe(true);
      expect(store.sessions.some((s) => s.id === sessionId2)).toBe(true);
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

      await store.startSession(sessionData);

      const afterStart = new Date();
      const sessionStart = new Date(store.currentSession!.startTime);

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

      await store.startSession(sessionData);
      const sessionId = store.currentSessionId!;

      const beforeHeartbeat = new Date();
      await store.updateHeartbeat(sessionId);
      const afterHeartbeat = new Date();

      await store.fetchSessions();
      const session = store.sessions.find((s) => s.id === sessionId);
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

      await store.startSession(sessionData);
      const sessionId = store.currentSessionId!;

      // Simulate multiple heartbeats
      for (let i = 0; i < 3; i++) {
        await store.updateHeartbeat(sessionId);
      }

      await store.fetchSessions();
      const session = store.sessions.find((s) => s.id === sessionId);
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

      await store.startSession(sessionData);
      const sessionId = store.currentSessionId!;

      // Manually set to abandoned (simulating detection)
      await store.fetchSessions();
      let session = store.sessions.find((s) => s.id === sessionId)!;
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

      await store.startSession(sessionData);
      const sessionId = store.currentSessionId!;

      await store.pauseSession(sessionId);

      await store.fetchSessions();
      const session = store.sessions.find((s) => s.id === sessionId);
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

      await store.startSession(sessionData);
      const sessionId = store.currentSessionId!;

      const beforePause = new Date();
      await store.pauseSession(sessionId);
      const afterPause = new Date();

      await store.fetchSessions();
      const session = store.sessions.find((s) => s.id === sessionId);
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

      await store.startSession(sessionData);
      const sessionId = store.currentSessionId!;

      await store.pauseSession(sessionId);
      await store.pauseSession(sessionId);

      await store.fetchSessions();
      const session = store.sessions.find((s) => s.id === sessionId);
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

      await store.startSession(sessionData);
      const sessionId = store.currentSessionId!;

      await store.pauseSession(sessionId);
      await store.resumeSession(sessionId);

      await store.fetchSessions();
      const session = store.sessions.find((s) => s.id === sessionId);
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

      await store.startSession(sessionData);
      const sessionId = store.currentSessionId!;

      await store.pauseSession(sessionId);

      await store.resumeSession(sessionId);

      await store.fetchSessions();
      const session = store.sessions.find((s) => s.id === sessionId);

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

      await store.startSession(sessionData);
      const sessionId = store.currentSessionId!;

      // First pause/resume
      await store.pauseSession(sessionId);
      await store.resumeSession(sessionId);

      await store.fetchSessions();
      const afterFirstResume = store.sessions.find((s) => s.id === sessionId);
      const firstPauseDuration =
        afterFirstResume?.value.pausedDurationMinutes || 0;

      // Second pause/resume
      await store.pauseSession(sessionId);
      await store.resumeSession(sessionId);

      await store.fetchSessions();
      const afterSecondResume = store.sessions.find((s) => s.id === sessionId);
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

      await store.startSession(sessionData);
      const sessionId = store.currentSessionId!;

      await store.endSession(sessionId, {
        status: 'completed',
        endTime: new Date().toISOString(),
      });

      await store.fetchSessions();
      const session = store.sessions.find((s) => s.id === sessionId);
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

      await store.startSession(sessionData);
      const sessionId = store.currentSessionId!;

      await store.endSession(sessionId, {
        status: 'completed',
        endTime: new Date().toISOString(),
      });

      await store.fetchSessions();
      const session = store.sessions.find((s) => s.id === sessionId);
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

      await store.startSession(sessionData);
      const sessionId = store.currentSessionId!;

      await store.endSession(sessionId, {
        status: 'error',
        endTime: new Date().toISOString(),
      });

      await store.fetchSessions();
      const session = store.sessions.find((s) => s.id === sessionId);
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

      await store.startSession(sessionData);
      const sessionId = store.currentSessionId!;

      await store.endSession(sessionId, {
        status: 'completed',
        endTime: new Date().toISOString(),
      });

      // Current session should be cleared
      expect(store.currentSessionId).toBeNull();
      expect(store.currentSession).toBeNull();
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

      await store.startSession(oldSession);

      // In a real scenario, a background job would mark this as abandoned
      // For this test, we just verify the heartbeat is old
      await store.fetchSessions();
      const session = store.sessions.find(
        (s) => s.id === store.currentSessionId,
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

      await store.startSession(sessionData);
      const sessionId = store.currentSessionId!;

      await store.updateHeartbeat(sessionId);

      await store.fetchSessions();
      const session = store.sessions.find((s) => s.id === sessionId);
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

      await store.startSession(sessionData);
      const sessionId = store.currentSessionId!;

      // End with error
      await store.endSession(sessionId, {
        status: 'error',
        endTime: new Date().toISOString(),
      });

      // Verify error status
      await store.fetchSessions();
      const errorSession = store.sessions.find((s) => s.id === sessionId);
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

      await store.startSession(newSessionData);
      expect(store.currentSessionId).not.toBe(sessionId);
      expect(store.currentSession?.status).toBe('running');
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

      await store.startSession(sessionData);

      await store.fetchSessions();
      const session = store.sessions.find(
        (s) => s.id === store.currentSessionId,
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

      await store.startSession(minimalSession);

      await store.fetchSessions();
      const session = store.sessions.find(
        (s) => s.id === store.currentSessionId,
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

      await store.startSession(session1);
      const sessionId1 = store.currentSessionId!;
      await store.endSession(sessionId1, {
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

      await store.startSession(session2);
      const sessionId2 = store.currentSessionId!;

      await store.fetchSessions();
      const userSessions = store.sessions.filter(
        (s) => s.value.userId === userId,
      );

      expect(userSessions.length).toBeGreaterThanOrEqual(2);
      expect(sessionId1).not.toBe(sessionId2);
    });
  });
});
