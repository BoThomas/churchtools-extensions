import { describe, it, expect, beforeEach, vi } from 'vitest';
import { usePresentationWindow } from './usePresentationWindow';
import {
  mockDefaultSettings,
  mockMultiLanguageSettings,
} from '../__mocks__/fixtures';

// Mock PrimeVue toast
vi.mock('primevue/usetoast', () => ({
  useToast: () => ({
    add: vi.fn(),
  }),
}));

describe('usePresentationWindow', () => {
  let presentationWindow: ReturnType<typeof usePresentationWindow>;
  let mockLocalStorage: Map<string, string>;

  beforeEach(() => {
    // Mock localStorage
    mockLocalStorage = new Map();
    global.localStorage = {
      getItem: vi.fn((key: string) => mockLocalStorage.get(key) || null),
      setItem: vi.fn((key: string, value: string) => {
        mockLocalStorage.set(key, value);
      }),
      removeItem: vi.fn((key: string) => {
        mockLocalStorage.delete(key);
      }),
      clear: vi.fn(() => {
        mockLocalStorage.clear();
      }),
      length: 0,
      key: vi.fn(),
    } as any;

    // Mock window.open
    global.window.open = vi.fn();

    presentationWindow = usePresentationWindow();
  });

  describe('generateSessionId', () => {
    it('should generate unique session IDs', () => {
      const id1 = presentationWindow.generateSessionId();
      const id2 = presentationWindow.generateSessionId();

      expect(id1).toMatch(/^session_\d+_[a-z0-9]+$/);
      expect(id2).toMatch(/^session_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });

    it('should start with session_ prefix', () => {
      const id = presentationWindow.generateSessionId();

      expect(id).toContain('session_');
    });
  });

  describe('updatePresentationWindow', () => {
    it('should store translation data in localStorage', () => {
      const sessionId = 'session_test_123';
      presentationWindow.presentationSessionId.value = sessionId;

      const translations = { en: 'Hello', de: 'Hallo' };
      const finalized = { en: ['Line 1'], de: ['Zeile 1'] };

      presentationWindow.updatePresentationWindow(
        translations,
        true,
        finalized,
      );

      const key = `translator_presentation_${sessionId}`;
      const stored = mockLocalStorage.get(key);
      expect(stored).toBeDefined();

      const data = JSON.parse(stored!);
      expect(data.translations).toEqual(translations);
      expect(data.isLive).toBe(true);
      expect(data.finalized).toEqual(finalized);
      expect(data.timestamp).toBeGreaterThan(0);
    });

    it('should not store anything if no session ID', () => {
      presentationWindow.presentationSessionId.value = null;

      presentationWindow.updatePresentationWindow({ en: 'Test' }, false, {});

      expect(mockLocalStorage.size).toBe(0);
    });

    it('should update timestamp on each call', () => {
      const sessionId = 'session_test_123';
      presentationWindow.presentationSessionId.value = sessionId;

      vi.useFakeTimers();
      const time1 = Date.now();
      vi.setSystemTime(time1);

      presentationWindow.updatePresentationWindow({ en: 'Test1' }, true, {});

      const key = `translator_presentation_${sessionId}`;
      const data1 = JSON.parse(mockLocalStorage.get(key)!);
      expect(data1.timestamp).toBe(time1);

      // Advance time
      vi.advanceTimersByTime(1000);
      const time2 = Date.now();

      presentationWindow.updatePresentationWindow({ en: 'Test2' }, false, {});

      const data2 = JSON.parse(mockLocalStorage.get(key)!);
      expect(data2.timestamp).toBe(time2);
      expect(data2.timestamp).toBeGreaterThan(data1.timestamp);

      vi.useRealTimers();
    });
  });

  describe('clearPresentationWindowStorage', () => {
    it('should clear translation data while keeping key', () => {
      const sessionId = 'session_test_123';
      presentationWindow.presentationSessionId.value = sessionId;

      // First set some data
      presentationWindow.updatePresentationWindow({ en: 'Hello' }, true, {
        en: ['Line 1'],
      });

      // Then clear
      presentationWindow.clearPresentationWindowStorage();

      const key = `translator_presentation_${sessionId}`;
      const stored = mockLocalStorage.get(key);
      expect(stored).toBeDefined();

      const data = JSON.parse(stored!);
      expect(data.translations).toEqual({});
      expect(data.isLive).toBe(false);
      expect(data.finalized).toEqual({});
    });

    it('should not clear if no session ID', () => {
      presentationWindow.presentationSessionId.value = null;

      presentationWindow.clearPresentationWindowStorage();

      expect(mockLocalStorage.size).toBe(0);
    });
  });

  describe('openPresentationWindows', () => {
    it('should open single window in split mode', () => {
      const sessionId = 'session_test_123';
      const settings = { ...mockDefaultSettings };
      settings.presentation.mode = 'split';

      const languages = [
        { code: 'de-DE', isInput: true },
        { code: 'en', isInput: false },
      ];

      presentationWindow.openPresentationWindows(
        sessionId,
        settings,
        languages,
        {
          isTest: false,
          multiWindowSummary: 'Multi Window',
          multiWindowDetail: 'Detail',
          singleWindowSummary: 'Single Window',
          singleWindowDetail: 'Opened',
        },
      );

      expect(window.open).toHaveBeenCalledTimes(1);
      expect(window.open).toHaveBeenCalledWith(
        expect.stringContaining('?presentation=true&session=session_test_123'),
        '_blank',
        'toolbar=0,location=0,menubar=0',
      );
    });

    it('should open multiple windows in multi-window mode', () => {
      const sessionId = 'session_test_456';
      const settings = { ...mockMultiLanguageSettings };
      settings.presentation.mode = 'multi-window';

      const languages = [
        { code: 'en-GB', isInput: true },
        { code: 'de', isInput: false },
        { code: 'es', isInput: false },
      ];

      presentationWindow.openPresentationWindows(
        sessionId,
        settings,
        languages,
        {
          isTest: false,
          multiWindowSummary: 'Multi Windows Opened',
          multiWindowDetail: 'One per language',
          singleWindowSummary: 'Single',
          singleWindowDetail: 'Single',
        },
      );

      expect(window.open).toHaveBeenCalledTimes(3);
      expect(window.open).toHaveBeenCalledWith(
        expect.stringContaining('lang=en-GB'),
        '_blank_en-GB',
        'toolbar=0,location=0,menubar=0',
      );
      expect(window.open).toHaveBeenCalledWith(
        expect.stringContaining('lang=de'),
        '_blank_de',
        'toolbar=0,location=0,menubar=0',
      );
      expect(window.open).toHaveBeenCalledWith(
        expect.stringContaining('lang=es'),
        '_blank_es',
        'toolbar=0,location=0,menubar=0',
      );
    });

    it('should store settings in localStorage', () => {
      const sessionId = 'session_test_789';
      const settings = { ...mockDefaultSettings };
      const languages = [{ code: 'en', isInput: false }];

      presentationWindow.openPresentationWindows(
        sessionId,
        settings,
        languages,
        {
          isTest: true,
          multiWindowSummary: '',
          multiWindowDetail: '',
          singleWindowSummary: '',
          singleWindowDetail: '',
        },
      );

      const key = `translator_settings_${sessionId}`;
      const stored = mockLocalStorage.get(key);
      expect(stored).toBeDefined();

      const data = JSON.parse(stored!);
      expect(data).toEqual(settings);
    });

    it('should remove paused flag on open', () => {
      const sessionId = 'session_test_101';
      // Set a paused flag first
      mockLocalStorage.set(
        `translator_paused_${sessionId}`,
        JSON.stringify({ isPaused: true }),
      );

      const settings = { ...mockDefaultSettings };
      const languages = [{ code: 'en', isInput: false }];

      presentationWindow.openPresentationWindows(
        sessionId,
        settings,
        languages,
        {
          isTest: false,
          multiWindowSummary: '',
          multiWindowDetail: '',
          singleWindowSummary: '',
          singleWindowDetail: '',
        },
      );

      expect(mockLocalStorage.has(`translator_paused_${sessionId}`)).toBe(
        false,
      );
    });

    it('should set presentationSessionId', () => {
      const sessionId = 'session_test_202';
      const settings = { ...mockDefaultSettings };
      const languages = [{ code: 'en', isInput: false }];

      presentationWindow.openPresentationWindows(
        sessionId,
        settings,
        languages,
        {
          isTest: false,
          multiWindowSummary: '',
          multiWindowDetail: '',
          singleWindowSummary: '',
          singleWindowDetail: '',
        },
      );

      expect(presentationWindow.presentationSessionId.value).toBe(sessionId);
    });
  });

  describe('cleanupPresentationStorage', () => {
    it('should remove all session-related localStorage items', () => {
      const sessionId = 'session_test_cleanup';

      // Set up various session items
      mockLocalStorage.set(`translator_settings_${sessionId}`, '{}');
      mockLocalStorage.set(`translator_paused_${sessionId}`, '{}');
      mockLocalStorage.set(`translator_presentation_${sessionId}`, '{}');

      presentationWindow.cleanupPresentationStorage(sessionId);

      expect(mockLocalStorage.has(`translator_settings_${sessionId}`)).toBe(
        false,
      );
      expect(mockLocalStorage.has(`translator_paused_${sessionId}`)).toBe(
        false,
      );
      expect(mockLocalStorage.has(`translator_presentation_${sessionId}`)).toBe(
        false,
      );
    });

    it('should not crash if session ID is null', () => {
      expect(() => {
        presentationWindow.cleanupPresentationStorage(null);
      }).not.toThrow();
    });
  });

  describe('setPausedFlag', () => {
    it('should set paused flag to true', () => {
      const sessionId = 'session_test_pause';

      presentationWindow.setPausedFlag(sessionId, true);

      const key = `translator_paused_${sessionId}`;
      const stored = mockLocalStorage.get(key);
      expect(stored).toBeDefined();

      const data = JSON.parse(stored!);
      expect(data.isPaused).toBe(true);
    });

    it('should remove paused flag when setting to false', () => {
      const sessionId = 'session_test_resume';
      mockLocalStorage.set(
        `translator_paused_${sessionId}`,
        JSON.stringify({ isPaused: true }),
      );

      presentationWindow.setPausedFlag(sessionId, false);

      expect(mockLocalStorage.has(`translator_paused_${sessionId}`)).toBe(
        false,
      );
    });
  });

  describe('resetSession', () => {
    it('should clear presentationSessionId', () => {
      presentationWindow.presentationSessionId.value = 'session_test_reset';

      presentationWindow.resetSession();

      expect(presentationWindow.presentationSessionId.value).toBeNull();
    });
  });

  describe('URL generation', () => {
    it('should generate correct URL for split mode', () => {
      const sessionId = 'session_url_test';
      const settings = { ...mockDefaultSettings };
      settings.presentation.mode = 'split';

      presentationWindow.openPresentationWindows(
        sessionId,
        settings,
        [{ code: 'en', isInput: false }],
        {
          isTest: false,
          multiWindowSummary: '',
          multiWindowDetail: '',
          singleWindowSummary: '',
          singleWindowDetail: '',
        },
      );

      const call = (window.open as any).mock.calls[0];
      expect(call[0]).toContain('?presentation=true');
      expect(call[0]).toContain(`session=${sessionId}`);
      expect(call[0]).not.toContain('lang=');
    });

    it('should generate correct URLs for multi-window mode with language params', () => {
      const sessionId = 'session_url_multi';
      const settings = { ...mockMultiLanguageSettings };
      settings.presentation.mode = 'multi-window';

      presentationWindow.openPresentationWindows(
        sessionId,
        settings,
        [
          { code: 'de', isInput: false },
          { code: 'es', isInput: false },
        ],
        {
          isTest: false,
          multiWindowSummary: '',
          multiWindowDetail: '',
          singleWindowSummary: '',
          singleWindowDetail: '',
        },
      );

      const calls = (window.open as any).mock.calls;
      expect(calls[0][0]).toContain('lang=de');
      expect(calls[1][0]).toContain('lang=es');
    });
  });
});
