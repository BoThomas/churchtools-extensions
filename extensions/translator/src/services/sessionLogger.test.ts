import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SessionLogger, type TranslationSession } from './sessionLogger';
import {
  mockUser,
  mockCompletedSession,
  mockRunningSession,
  mockPausedSession,
  mockLegacySession,
} from '../__mocks__/fixtures';

describe('SessionLogger', () => {
  let logger: SessionLogger;

  beforeEach(() => {
    logger = new SessionLogger();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('createSession', () => {
    it('should create a new session with correct initial values', () => {
      const now = new Date('2024-01-15T10:00:00.000Z');
      vi.setSystemTime(now);

      const session = logger.createSession({
        userId: mockUser.id,
        userEmail: mockUser.email,
        userName: mockUser.name,
        inputLanguage: 'de-DE',
        outputLanguages: ['en', 'es'],
        mode: 'presentation',
      });

      expect(session).toEqual({
        userId: mockUser.id,
        userEmail: mockUser.email,
        userName: mockUser.name,
        startTime: now.toISOString(),
        inputLanguage: 'de-DE',
        outputLanguages: ['en', 'es'],
        mode: 'presentation',
        status: 'running',
      });
    });

    it('should create a test mode session', () => {
      const session = logger.createSession({
        userId: mockUser.id,
        userEmail: mockUser.email,
        userName: mockUser.name,
        inputLanguage: 'en-GB',
        outputLanguages: ['de'],
        mode: 'test',
      });

      expect(session.mode).toBe('test');
      expect(session.status).toBe('running');
    });
  });

  describe('endSession', () => {
    it('should end a session with completed status', () => {
      const startTime = new Date('2024-01-15T10:00:00.000Z');
      const endTime = new Date('2024-01-15T11:30:00.000Z');
      vi.setSystemTime(endTime);

      const session: TranslationSession = {
        ...mockRunningSession,
        startTime: startTime.toISOString(),
      };

      const ended = logger.endSession(session, 'completed');

      expect(ended.status).toBe('completed');
      expect(ended.endTime).toBe(endTime.toISOString());
      expect(ended.durationMinutes).toBe(90);
    });

    it('should end a session with error status', () => {
      const startTime = new Date('2024-01-15T10:00:00.000Z');
      const endTime = new Date('2024-01-15T10:15:00.000Z');
      vi.setSystemTime(endTime);

      const session: TranslationSession = {
        ...mockRunningSession,
        startTime: startTime.toISOString(),
      };

      const ended = logger.endSession(session, 'error');

      expect(ended.status).toBe('error');
      expect(ended.durationMinutes).toBe(15);
    });

    it('should round duration to nearest minute', () => {
      const startTime = new Date('2024-01-15T10:00:00.000Z');
      const endTime = new Date('2024-01-15T10:05:35.000Z'); // 5 min 35 sec
      vi.setSystemTime(endTime);

      const session: TranslationSession = {
        ...mockRunningSession,
        startTime: startTime.toISOString(),
      };

      const ended = logger.endSession(session);

      expect(ended.durationMinutes).toBe(6); // Rounded up
    });
  });

  describe('pauseSession', () => {
    it('should mark session as paused with timestamp', () => {
      const pauseTime = new Date('2024-01-15T10:30:00.000Z');
      vi.setSystemTime(pauseTime);

      const session: TranslationSession = { ...mockRunningSession };

      const paused = logger.pauseSession(session);

      expect(paused.status).toBe('paused');
      expect(paused.pausedAt).toBe(pauseTime.toISOString());
    });
  });

  describe('resumeSession', () => {
    it('should resume a paused session and accumulate paused duration', () => {
      const pauseTime = new Date('2024-01-15T10:30:00.000Z');
      const resumeTime = new Date('2024-01-15T10:45:00.000Z');
      vi.setSystemTime(resumeTime);

      const session: TranslationSession = {
        ...mockPausedSession,
        pausedAt: pauseTime.toISOString(),
        pausedDurationMinutes: 5, // Previous paused time
      };

      const resumed = logger.resumeSession(session);

      expect(resumed.status).toBe('running');
      expect(resumed.pausedAt).toBeUndefined();
      expect(resumed.pausedDurationMinutes).toBe(20); // 5 + 15 minutes
      expect(resumed.lastHeartbeat).toBe(resumeTime.toISOString());
    });

    it('should handle resume without previous paused duration', () => {
      const pauseTime = new Date('2024-01-15T10:30:00.000Z');
      const resumeTime = new Date('2024-01-15T10:40:00.000Z');
      vi.setSystemTime(resumeTime);

      const session: TranslationSession = {
        ...mockRunningSession,
        pausedAt: pauseTime.toISOString(),
        status: 'paused',
      };

      const resumed = logger.resumeSession(session);

      expect(resumed.pausedDurationMinutes).toBe(10);
    });

    it('should return session unchanged if not paused', () => {
      const session: TranslationSession = { ...mockRunningSession };

      const resumed = logger.resumeSession(session);

      expect(resumed).toEqual(session);
    });
  });

  describe('updateHeartbeat', () => {
    it('should update heartbeat timestamp', () => {
      const heartbeatTime = new Date('2024-01-15T10:35:00.000Z');
      vi.setSystemTime(heartbeatTime);

      const session: TranslationSession = { ...mockRunningSession };

      const updated = logger.updateHeartbeat(session);

      expect(updated.lastHeartbeat).toBe(heartbeatTime.toISOString());
    });

    it('should recover abandoned session to running status', () => {
      const heartbeatTime = new Date('2024-01-15T11:00:00.000Z');
      vi.setSystemTime(heartbeatTime);

      const session: TranslationSession = {
        ...mockRunningSession,
        status: 'abandoned',
      };

      const updated = logger.updateHeartbeat(session);

      expect(updated.status).toBe('running');
      expect(updated.lastHeartbeat).toBe(heartbeatTime.toISOString());
    });
  });

  describe('getOutputLanguages', () => {
    it('should return outputLanguages array when present', () => {
      const session: TranslationSession = {
        ...mockCompletedSession,
        outputLanguages: ['en', 'es', 'fr'],
      };

      const languages = SessionLogger.getOutputLanguages(session);

      expect(languages).toEqual(['en', 'es', 'fr']);
    });

    it('should fallback to outputLanguage (legacy format)', () => {
      const languages = SessionLogger.getOutputLanguages(mockLegacySession);

      expect(languages).toEqual(['en']);
    });

    it('should return empty array when no output languages', () => {
      const session: TranslationSession = {
        ...mockCompletedSession,
        outputLanguages: undefined,
        outputLanguage: undefined,
      };

      const languages = SessionLogger.getOutputLanguages(session);

      expect(languages).toEqual([]);
    });

    it('should prefer outputLanguages over outputLanguage', () => {
      const session: TranslationSession = {
        ...mockLegacySession,
        outputLanguages: ['de', 'es'],
      };

      const languages = SessionLogger.getOutputLanguages(session);

      expect(languages).toEqual(['de', 'es']);
    });
  });

  describe('calculateSessionDuration', () => {
    it('should calculate duration from startTime to endTime for completed session', () => {
      const duration =
        SessionLogger.calculateSessionDuration(mockCompletedSession);

      expect(duration).toBe(90); // 1.5 hours
    });

    it('should calculate duration from startTime to lastHeartbeat for running session', () => {
      const session: TranslationSession = {
        ...mockRunningSession,
        startTime: '2024-01-15T10:00:00.000Z',
        lastHeartbeat: '2024-01-15T10:45:00.000Z',
      };

      const duration = SessionLogger.calculateSessionDuration(session);

      expect(duration).toBe(45);
    });

    it('should return 0 for session without endTime or lastHeartbeat', () => {
      const session: TranslationSession = {
        ...mockRunningSession,
        lastHeartbeat: undefined,
        endTime: undefined,
      };

      const duration = SessionLogger.calculateSessionDuration(session);

      expect(duration).toBe(0);
    });

    it('should use lastHeartbeat for abandoned sessions', () => {
      const session: TranslationSession = {
        ...mockRunningSession,
        startTime: '2024-01-15T10:00:00.000Z',
        lastHeartbeat: '2024-01-15T10:20:00.000Z',
        status: 'abandoned',
      };

      const duration = SessionLogger.calculateSessionDuration(session);

      expect(duration).toBe(20);
    });
  });

  describe('calculateActiveDuration', () => {
    it('should return total duration when no pauses', () => {
      const duration =
        SessionLogger.calculateActiveDuration(mockCompletedSession);

      expect(duration).toBe(90);
    });

    it('should subtract paused duration from total', () => {
      const session: TranslationSession = {
        ...mockCompletedSession,
        pausedDurationMinutes: 15,
      };

      const duration = SessionLogger.calculateActiveDuration(session);

      expect(duration).toBe(75); // 90 - 15
    });

    it('should account for current pause duration', () => {
      const now = new Date('2024-01-15T10:40:00.000Z');
      vi.setSystemTime(now);

      const session: TranslationSession = {
        ...mockRunningSession,
        startTime: '2024-01-15T10:00:00.000Z',
        lastHeartbeat: '2024-01-15T10:40:00.000Z',
        pausedAt: '2024-01-15T10:30:00.000Z', // Paused 10 minutes ago
        pausedDurationMinutes: 5, // Previous pauses
      };

      const duration = SessionLogger.calculateActiveDuration(session);

      expect(duration).toBe(25); // 40 total - 5 previous - 10 current pause
    });

    it('should never return negative duration', () => {
      // Create a session where paused time exceeds total time (edge case)
      const session: TranslationSession = {
        ...mockCompletedSession,
        startTime: '2024-01-15T10:00:00.000Z',
        endTime: '2024-01-15T10:10:00.000Z', // 10 minutes total
        durationMinutes: 10,
        pausedDurationMinutes: 20, // More than total (edge case)
      };

      const duration = SessionLogger.calculateActiveDuration(session);

      expect(duration).toBe(0);
    });
  });

  describe('isSessionAbandoned', () => {
    it('should return true for running session with old heartbeat', () => {
      const now = new Date('2024-01-15T11:00:00.000Z');
      vi.setSystemTime(now);

      const session: TranslationSession = {
        ...mockRunningSession,
        lastHeartbeat: '2024-01-15T10:30:00.000Z', // 30 minutes ago
      };

      const isAbandoned = SessionLogger.isSessionAbandoned(session);

      expect(isAbandoned).toBe(true);
    });

    it('should return false for running session with recent heartbeat', () => {
      const now = new Date('2024-01-15T10:10:00.000Z');
      vi.setSystemTime(now);

      const session: TranslationSession = {
        ...mockRunningSession,
        lastHeartbeat: '2024-01-15T10:05:00.000Z', // 5 minutes ago
      };

      const isAbandoned = SessionLogger.isSessionAbandoned(session);

      expect(isAbandoned).toBe(false);
    });

    it('should return false for completed session', () => {
      const session: TranslationSession = {
        ...mockCompletedSession,
      };

      const isAbandoned = SessionLogger.isSessionAbandoned(session);

      expect(isAbandoned).toBe(false);
    });

    it('should return false for paused session', () => {
      const session: TranslationSession = {
        ...mockPausedSession,
        lastHeartbeat: '2024-01-15T10:00:00.000Z', // Old but paused
      };

      const isAbandoned = SessionLogger.isSessionAbandoned(session);

      expect(isAbandoned).toBe(false);
    });

    it('should return false for session without heartbeat', () => {
      const session: TranslationSession = {
        ...mockRunningSession,
        lastHeartbeat: undefined,
      };

      const isAbandoned = SessionLogger.isSessionAbandoned(session);

      expect(isAbandoned).toBe(false);
    });

    it('should detect abandoned at exactly 15 minute threshold', () => {
      const now = new Date('2024-01-15T10:15:01.000Z');
      vi.setSystemTime(now);

      const session: TranslationSession = {
        ...mockRunningSession,
        lastHeartbeat: '2024-01-15T10:00:00.000Z', // 15 min 1 sec ago
      };

      const isAbandoned = SessionLogger.isSessionAbandoned(session);

      expect(isAbandoned).toBe(true);
    });
  });

  describe('session ID management', () => {
    it('should set and get current session ID', () => {
      logger.setCurrentSessionId(42);

      expect(logger.getCurrentSessionId()).toBe(42);
    });

    it('should clear current session ID', () => {
      logger.setCurrentSessionId(42);
      logger.clearCurrentSession();

      expect(logger.getCurrentSessionId()).toBeNull();
    });

    it('should initialize with null session ID', () => {
      const newLogger = new SessionLogger();

      expect(newLogger.getCurrentSessionId()).toBeNull();
    });
  });

  describe('calculateDuration', () => {
    it('should calculate duration between two timestamps', () => {
      const duration = logger.calculateDuration(
        '2024-01-15T10:00:00.000Z',
        '2024-01-15T12:30:00.000Z',
      );

      expect(duration).toBe(150); // 2.5 hours
    });

    it('should round to nearest minute', () => {
      const duration = logger.calculateDuration(
        '2024-01-15T10:00:00.000Z',
        '2024-01-15T10:02:35.000Z',
      );

      expect(duration).toBe(3); // Rounded up
    });
  });
});
