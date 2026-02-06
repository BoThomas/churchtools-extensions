import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useActiveTab } from './useActiveTab';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get _store() {
      return store;
    },
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
});

const VALID_TABS = ['settings', 'translate', 'reports'] as const;

describe('useActiveTab', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should return default tab when localStorage is empty', () => {
      const activeTab = useActiveTab('test-ext', 'translate', VALID_TABS);
      expect(activeTab.value).toBe('translate');
    });

    it('should return stored value when it is a valid tab', () => {
      localStorageMock.setItem('test-ext_active_tab', 'reports');
      const activeTab = useActiveTab('test-ext', 'translate', VALID_TABS);
      expect(activeTab.value).toBe('reports');
    });

    it('should return default when stored value is not in validTabs', () => {
      localStorageMock.setItem('test-ext_active_tab', 'removed-tab');
      const activeTab = useActiveTab('test-ext', 'translate', VALID_TABS);
      expect(activeTab.value).toBe('translate');
    });

    it('should return default when localStorage throws', () => {
      localStorageMock.getItem.mockImplementationOnce(() => {
        throw new Error('Storage access denied');
      });
      const activeTab = useActiveTab('test-ext', 'translate', VALID_TABS);
      expect(activeTab.value).toBe('translate');
    });

    it('should use the correct storage key format', () => {
      useActiveTab('my-extension', 'translate', VALID_TABS);
      expect(localStorageMock.getItem).toHaveBeenCalledWith(
        'my-extension_active_tab',
      );
    });
  });

  describe('persistence', () => {
    it('should save to localStorage when tab changes', async () => {
      const activeTab = useActiveTab('test-ext', 'translate', VALID_TABS);

      activeTab.value = 'reports';

      // Wait for watch to trigger
      await Promise.resolve();

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'test-ext_active_tab',
        'reports',
      );
    });

    it('should handle localStorage write errors gracefully', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('QuotaExceededError');
      });

      const activeTab = useActiveTab('test-ext', 'translate', VALID_TABS);
      activeTab.value = 'reports';

      await Promise.resolve();

      expect(warnSpy).toHaveBeenCalledWith(
        'Failed to save active tab to localStorage',
        expect.any(Error),
      );
      warnSpy.mockRestore();
    });
  });
});
