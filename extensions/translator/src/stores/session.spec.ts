import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useSessionStore } from './session';
import { useWebPubSubStore } from './webpubsub';
import type { TranslationSession } from '../services/sessionLogger';
import type { TranslatorSettings } from '../types/translator';
import type { ActiveSessionReference } from '../types/streamedSession';

// Mock the translatorPersistance module
vi.mock('../services/translatorPersistance', () => ({
  ensureTranslatorPersistance: vi.fn(),
  getSessionsCategory: vi.fn(),
  getStreamedSessionsCategory: vi.fn(),
}));

// Mock the webpubsub store
vi.mock('./webpubsub', () => ({
  useWebPubSubStore: vi.fn(() => ({
    openRoom: vi.fn(),
    closeRoom: vi.fn(),
  })),
}));

describe('useSessionStore', () => {
  let store: ReturnType<typeof useSessionStore>;
  let mockSessionsCategory: any;
  let mockStreamedSessionsCategory: any;
  let mockWebPubSubStore: any;

  const mockSettings: TranslatorSettings = {
    inputLanguage: 'de-DE',
    outputLanguages: ['en', 'es'],
    outputModes: {
      presentationEnabled: true,
      streamedSessionEnabled: true,
    },
    presentation: {
      mode: 'split',
      showInputLanguage: true,
      font: 'Arial',
      fontSize: '24',
      margin: '20',
      color: '#000000',
      liveColor: '#FF0000',
      background: '#FFFFFF',
    },
    session: {
      displayName: 'Test Session',
      maxClients: 10,
      hidden: false,
    },
    profanityOption: 'remove',
    stablePartialResultThreshold: '0.5',
    phraseList: 'test,phrase',
  };

  const mockSessionData: TranslationSession = {
    id: 123,
    userId: 1,
    userEmail: 'test@example.com',
    userName: 'Test User',
    startTime: '2024-01-15T10:00:00.000Z',
    inputLanguage: 'de-DE',
    outputLanguages: ['en', 'es'],
    mode: 'presentation',
    status: 'running',
  };

  beforeEach(async () => {
    // Create a fresh Pinia instance
    setActivePinia(createPinia());

    // Clear localStorage
    localStorage.clear();

    // Setup mock categories
    mockSessionsCategory = {
      create: vi.fn(),
      getById: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      list: vi.fn(),
    };

    mockStreamedSessionsCategory = {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      list: vi.fn(),
    };

    // Setup mock WebPubSub store
    mockWebPubSubStore = {
      openRoom: vi.fn().mockResolvedValue(undefined),
      closeRoom: vi.fn().mockResolvedValue(undefined),
    };

    // Update mocks
    const { getSessionsCategory, getStreamedSessionsCategory } =
      await import('../services/translatorPersistance');
    vi.mocked(getSessionsCategory).mockResolvedValue(mockSessionsCategory);
    vi.mocked(getStreamedSessionsCategory).mockResolvedValue(
      mockStreamedSessionsCategory,
    );
    vi.mocked(useWebPubSubStore).mockReturnValue(mockWebPubSubStore);

    // Get store instance
    store = useSessionStore();
  });

  afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('startSession', () => {
    it('should store settings in localStorage when starting a streamed session', async () => {
      // Setup
      mockSessionsCategory.create.mockResolvedValue({ id: 123 });
      mockStreamedSessionsCategory.create.mockResolvedValue({});

      // Execute
      await store.startSession(mockSessionData, mockSettings, {
        displayName: 'Test',
        hidden: false,
      });

      // Verify
      const storedRef = localStorage.getItem('translator_active_session');
      expect(storedRef).not.toBeNull();

      const parsedRef = JSON.parse(storedRef!) as ActiveSessionReference;
      expect(parsedRef.sessionId).toBe(123);
      expect(parsedRef.settings.inputLanguage).toBe(mockSettings.inputLanguage);
      expect(parsedRef.settings.outputLanguages).toEqual(
        mockSettings.outputLanguages,
      );
      expect(parsedRef.settings.outputModes).toEqual(mockSettings.outputModes);
      expect(parsedRef.settings.presentation).toEqual(
        mockSettings.presentation,
      );
      expect(parsedRef.settings.session).toEqual(mockSettings.session);
      expect(parsedRef.settings.profanityOption).toBe(
        mockSettings.profanityOption,
      );
      expect(parsedRef.settings.phraseList).toBe(mockSettings.phraseList);
    });

    it('should not store in localStorage if streaming is disabled', async () => {
      // Setup
      mockSessionsCategory.create.mockResolvedValue({ id: 123 });

      // Execute - no streaming config
      await store.startSession(mockSessionData, mockSettings);

      // Verify
      const storedRef = localStorage.getItem('translator_active_session');
      expect(storedRef).toBeNull();
    });

    it('should not store in localStorage if session is hidden', async () => {
      // Setup
      mockSessionsCategory.create.mockResolvedValue({ id: 123 });

      // Execute - hidden session
      await store.startSession(mockSessionData, mockSettings, {
        displayName: 'Test',
        hidden: true,
      });

      // Verify
      const storedRef = localStorage.getItem('translator_active_session');
      expect(storedRef).toBeNull();
    });
  });

  describe('checkForActiveSession', () => {
    it('should return session and settings from localStorage', async () => {
      // Setup
      const sessionRef: ActiveSessionReference = {
        sessionId: 123,
        webPubSubRoomId: 'test-room-id',
        startTime: '2024-01-15T10:00:00.000Z',
        settings: mockSettings,
      };
      localStorage.setItem(
        'translator_active_session',
        JSON.stringify(sessionRef),
      );

      mockSessionsCategory.getById.mockResolvedValue({
        id: 123,
        value: { ...mockSessionData, status: 'running' },
      });

      // Execute
      const result = await store.checkForActiveSession();

      // Verify
      expect(result).not.toBeNull();
      expect(result?.session.id).toBe(123);
      expect(result?.reference.sessionId).toBe(123);
      expect(result?.reference.settings.inputLanguage).toBe(
        mockSettings.inputLanguage,
      );
    });

    it('should return null if no localStorage entry', async () => {
      // Execute
      const result = await store.checkForActiveSession();

      // Verify
      expect(result).toBeNull();
    });

    it('should cleanup localStorage if session not found', async () => {
      // Setup
      const sessionRef: ActiveSessionReference = {
        sessionId: 123,
        webPubSubRoomId: 'test-room-id',
        startTime: '2024-01-15T10:00:00.000Z',
        settings: mockSettings,
      };
      localStorage.setItem(
        'translator_active_session',
        JSON.stringify(sessionRef),
      );

      mockSessionsCategory.getById.mockResolvedValue(null);

      // Execute
      const result = await store.checkForActiveSession();

      // Verify
      expect(result).toBeNull();
      expect(localStorage.getItem('translator_active_session')).toBeNull();
    });

    it('should cleanup localStorage if session is completed', async () => {
      // Setup
      const sessionRef: ActiveSessionReference = {
        sessionId: 123,
        webPubSubRoomId: 'test-room-id',
        startTime: '2024-01-15T10:00:00.000Z',
        settings: mockSettings,
      };
      localStorage.setItem(
        'translator_active_session',
        JSON.stringify(sessionRef),
      );

      mockSessionsCategory.getById.mockResolvedValue({
        id: 123,
        value: { ...mockSessionData, status: 'completed' },
      });

      // Execute
      const result = await store.checkForActiveSession();

      // Verify
      expect(result).toBeNull();
      expect(localStorage.getItem('translator_active_session')).toBeNull();
    });
  });

  describe('resumeSessionFromCrash', () => {
    it('should return settings for UI restoration', async () => {
      // Setup
      const sessionRef: ActiveSessionReference = {
        sessionId: 123,
        webPubSubRoomId: 'test-room-id',
        startTime: '2024-01-15T10:00:00.000Z',
        settings: mockSettings,
      };
      localStorage.setItem(
        'translator_active_session',
        JSON.stringify(sessionRef),
      );

      mockSessionsCategory.getById.mockResolvedValue({
        id: 123,
        value: { ...mockSessionData, status: 'running' },
      });
      mockSessionsCategory.update.mockResolvedValue({});
      mockStreamedSessionsCategory.list.mockResolvedValue([]);

      // Execute
      const result = await store.resumeSessionFromCrash(123, 'running');

      // Verify
      expect(result.settings).toEqual(mockSettings);
    });

    it('should update heartbeat when resuming', async () => {
      // Setup
      const sessionRef: ActiveSessionReference = {
        sessionId: 123,
        webPubSubRoomId: 'test-room-id',
        startTime: '2024-01-15T10:00:00.000Z',
        settings: mockSettings,
      };
      localStorage.setItem(
        'translator_active_session',
        JSON.stringify(sessionRef),
      );

      mockSessionsCategory.getById.mockResolvedValue({
        id: 123,
        value: { ...mockSessionData, status: 'running' },
      });
      mockSessionsCategory.list.mockResolvedValue([
        {
          id: 123,
          value: { ...mockSessionData, status: 'running' },
        },
      ]);
      mockSessionsCategory.update.mockResolvedValue({});
      mockStreamedSessionsCategory.list.mockResolvedValue([]);

      // Execute
      await store.resumeSessionFromCrash(123, 'running');

      // Verify
      expect(mockSessionsCategory.update).toHaveBeenCalled();
    });

    it('should pause session if not already paused', async () => {
      // Setup
      const sessionRef: ActiveSessionReference = {
        sessionId: 123,
        webPubSubRoomId: 'test-room-id',
        startTime: '2024-01-15T10:00:00.000Z',
        settings: mockSettings,
      };
      localStorage.setItem(
        'translator_active_session',
        JSON.stringify(sessionRef),
      );

      mockSessionsCategory.getById.mockResolvedValue({
        id: 123,
        value: { ...mockSessionData, status: 'running' },
      });
      mockSessionsCategory.list.mockResolvedValue([
        {
          id: 123,
          value: { ...mockSessionData, status: 'running' },
        },
      ]);
      mockSessionsCategory.update.mockResolvedValue({});
      mockStreamedSessionsCategory.list.mockResolvedValue([]);

      // Execute
      await store.resumeSessionFromCrash(123, 'running');

      // Verify - should update session status to paused
      const updateCalls = mockSessionsCategory.update.mock.calls;
      expect(updateCalls.length).toBeGreaterThan(0);
    });

    it('should reconnect to WebPubSub if streamed session enabled', async () => {
      // Setup
      const sessionRef: ActiveSessionReference = {
        sessionId: 123,
        webPubSubRoomId: 'test-room-id',
        startTime: '2024-01-15T10:00:00.000Z',
        settings: {
          ...mockSettings,
          outputModes: {
            presentationEnabled: false,
            streamedSessionEnabled: true,
          },
        },
      };
      localStorage.setItem(
        'translator_active_session',
        JSON.stringify(sessionRef),
      );

      mockSessionsCategory.getById.mockResolvedValue({
        id: 123,
        value: { ...mockSessionData, status: 'running' },
      });
      mockSessionsCategory.update.mockResolvedValue({});
      mockStreamedSessionsCategory.list.mockResolvedValue([]);

      // Execute
      await store.resumeSessionFromCrash(123, 'running');

      // Verify
      expect(mockWebPubSubStore.openRoom).toHaveBeenCalledWith(
        'test-room-id',
        0,
      );
    });

    it('should not reconnect to WebPubSub if streamed session disabled', async () => {
      // Setup
      const sessionRef: ActiveSessionReference = {
        sessionId: 123,
        webPubSubRoomId: 'test-room-id',
        startTime: '2024-01-15T10:00:00.000Z',
        settings: {
          ...mockSettings,
          outputModes: {
            presentationEnabled: true,
            streamedSessionEnabled: false,
          },
        },
      };
      localStorage.setItem(
        'translator_active_session',
        JSON.stringify(sessionRef),
      );

      mockSessionsCategory.getById.mockResolvedValue({
        id: 123,
        value: { ...mockSessionData, status: 'running' },
      });
      mockSessionsCategory.update.mockResolvedValue({});
      mockStreamedSessionsCategory.list.mockResolvedValue([]);

      // Execute
      await store.resumeSessionFromCrash(123, 'running');

      // Verify
      expect(mockWebPubSubStore.openRoom).not.toHaveBeenCalled();
    });

    it('should throw error if no localStorage entry', async () => {
      // Execute & Verify
      await expect(
        store.resumeSessionFromCrash(123, 'running'),
      ).rejects.toThrow('No active session found in localStorage');
    });
  });

  describe('endSession', () => {
    it('should clear localStorage reference', async () => {
      // Setup
      const sessionRef: ActiveSessionReference = {
        sessionId: 123,
        webPubSubRoomId: 'test-room-id',
        startTime: '2024-01-15T10:00:00.000Z',
        settings: mockSettings,
      };
      localStorage.setItem(
        'translator_active_session',
        JSON.stringify(sessionRef),
      );

      mockSessionsCategory.list.mockResolvedValue([
        {
          id: 123,
          value: { ...mockSessionData, status: 'running' },
        },
      ]);
      mockSessionsCategory.update.mockResolvedValue({});
      mockStreamedSessionsCategory.list.mockResolvedValue([]);

      // Execute
      await store.endSession(123, { status: 'completed' });

      // Verify
      expect(localStorage.getItem('translator_active_session')).toBeNull();
    });
  });
});
