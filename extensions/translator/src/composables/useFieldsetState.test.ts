import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useFieldsetState } from './useFieldsetState';

// Mock localStorage
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

describe('useFieldsetState', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('default states', () => {
    it('should initialize with correct defaults when localStorage is empty', () => {
      const fieldsetState = useFieldsetState();

      expect(fieldsetState.translationOptionsCollapsed.value).toBe(true);
      expect(fieldsetState.presentationOptionsCollapsed.value).toBe(true);
      expect(fieldsetState.operatorPreviewCollapsed.value).toBe(false);
    });

    it('should load saved states from localStorage', () => {
      const savedStates = {
        translationOptions: false,
        presentationOptions: false,
        operatorPreview: true,
      };
      localStorageMock.setItem(
        'translator_fieldset_states',
        JSON.stringify(savedStates),
      );

      const fieldsetState = useFieldsetState();

      expect(fieldsetState.translationOptionsCollapsed.value).toBe(false);
      expect(fieldsetState.presentationOptionsCollapsed.value).toBe(false);
      expect(fieldsetState.operatorPreviewCollapsed.value).toBe(true);
    });

    it('should merge saved states with defaults for missing fields', () => {
      // Only save partial state
      const savedStates = {
        translationOptions: false,
      };
      localStorageMock.setItem(
        'translator_fieldset_states',
        JSON.stringify(savedStates),
      );

      const fieldsetState = useFieldsetState();

      expect(fieldsetState.translationOptionsCollapsed.value).toBe(false);
      expect(fieldsetState.presentationOptionsCollapsed.value).toBe(true); // default
      expect(fieldsetState.operatorPreviewCollapsed.value).toBe(false); // default
    });

    it('should handle invalid JSON in localStorage gracefully', () => {
      localStorageMock.setItem('translator_fieldset_states', 'invalid-json');

      const fieldsetState = useFieldsetState();

      // Should fall back to defaults
      expect(fieldsetState.translationOptionsCollapsed.value).toBe(true);
      expect(fieldsetState.presentationOptionsCollapsed.value).toBe(true);
      expect(fieldsetState.operatorPreviewCollapsed.value).toBe(false);
    });
  });

  describe('toggle functions', () => {
    it('should toggle translation options collapsed state', () => {
      const fieldsetState = useFieldsetState();

      expect(fieldsetState.translationOptionsCollapsed.value).toBe(true);

      fieldsetState.toggleTranslationOptions({ value: false });
      expect(fieldsetState.translationOptionsCollapsed.value).toBe(false);

      fieldsetState.toggleTranslationOptions({ value: true });
      expect(fieldsetState.translationOptionsCollapsed.value).toBe(true);
    });

    it('should toggle presentation options collapsed state', () => {
      const fieldsetState = useFieldsetState();

      expect(fieldsetState.presentationOptionsCollapsed.value).toBe(true);

      fieldsetState.togglePresentationOptions({ value: false });
      expect(fieldsetState.presentationOptionsCollapsed.value).toBe(false);

      fieldsetState.togglePresentationOptions({ value: true });
      expect(fieldsetState.presentationOptionsCollapsed.value).toBe(true);
    });

    it('should toggle operator preview collapsed state', () => {
      const fieldsetState = useFieldsetState();

      expect(fieldsetState.operatorPreviewCollapsed.value).toBe(false);

      fieldsetState.toggleOperatorPreview({ value: true });
      expect(fieldsetState.operatorPreviewCollapsed.value).toBe(true);

      fieldsetState.toggleOperatorPreview({ value: false });
      expect(fieldsetState.operatorPreviewCollapsed.value).toBe(false);
    });
  });

  describe('openOperatorPreview', () => {
    it('should set operator preview to open (not collapsed)', () => {
      const fieldsetState = useFieldsetState();

      // First close it
      fieldsetState.toggleOperatorPreview({ value: true });
      expect(fieldsetState.operatorPreviewCollapsed.value).toBe(true);

      // Then use openOperatorPreview
      fieldsetState.openOperatorPreview();
      expect(fieldsetState.operatorPreviewCollapsed.value).toBe(false);
    });

    it('should be idempotent when already open', () => {
      const fieldsetState = useFieldsetState();

      expect(fieldsetState.operatorPreviewCollapsed.value).toBe(false);

      fieldsetState.openOperatorPreview();
      expect(fieldsetState.operatorPreviewCollapsed.value).toBe(false);
    });
  });

  describe('persistence', () => {
    it('should persist state changes to localStorage', async () => {
      const fieldsetState = useFieldsetState();

      fieldsetState.toggleTranslationOptions({ value: false });

      // Wait for watch to trigger
      await Promise.resolve();

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'translator_fieldset_states',
        expect.any(String),
      );

      const savedState = JSON.parse(
        localStorageMock._store['translator_fieldset_states'],
      );
      expect(savedState.translationOptions).toBe(false);
    });

    it('should persist all state changes', async () => {
      const fieldsetState = useFieldsetState();

      fieldsetState.toggleTranslationOptions({ value: false });
      fieldsetState.togglePresentationOptions({ value: false });
      fieldsetState.toggleOperatorPreview({ value: true });

      // Wait for watches to trigger
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      const savedState = JSON.parse(
        localStorageMock._store['translator_fieldset_states'],
      );
      expect(savedState.translationOptions).toBe(false);
      expect(savedState.presentationOptions).toBe(false);
      expect(savedState.operatorPreview).toBe(true);
    });
  });

  describe('PrimeVue event format compatibility', () => {
    it('should handle PrimeVue toggle event format with value property', () => {
      const fieldsetState = useFieldsetState();

      // PrimeVue Fieldset emits { value: boolean } where value is the new collapsed state
      fieldsetState.toggleTranslationOptions({ value: false });
      expect(fieldsetState.translationOptionsCollapsed.value).toBe(false);

      fieldsetState.toggleTranslationOptions({ value: true });
      expect(fieldsetState.translationOptionsCollapsed.value).toBe(true);
    });
  });
});
