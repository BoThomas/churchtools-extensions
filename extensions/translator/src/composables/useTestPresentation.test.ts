import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ref } from 'vue';
import { useTestPresentation } from './useTestPresentation';
import type { LanguageConfig } from '../types/language';

// Mock lorem-ipsum
vi.mock('lorem-ipsum', () => ({
  LoremIpsum: class MockLoremIpsum {
    generateSentences(count: number): string {
      return Array(count)
        .fill(0)
        .map((_, i) => `Sentence ${i + 1}.`)
        .join(' ');
    }
    generateParagraphs(count: number): string {
      return Array(count)
        .fill(0)
        .map((_, i) => `Paragraph ${i + 1}`)
        .join('\n');
    }
  },
}));

describe('useTestPresentation', () => {
  let testPresentation: ReturnType<typeof useTestPresentation>;

  beforeEach(() => {
    vi.useFakeTimers();
    testPresentation = useTestPresentation();
  });

  afterEach(() => {
    vi.useRealTimers();
    testPresentation.stopGeneration();
  });

  describe('startGeneration', () => {
    it('should generate lorem ipsum content alternating between live and finalized', () => {
      const isPaused = ref(false);
      const operatorLanguages: LanguageConfig[] = [
        { code: 'de-DE', isInput: true },
        { code: 'en', isInput: false },
      ];
      const presentationLanguages: LanguageConfig[] = [
        { code: 'en', isInput: false },
      ];
      const finalizedParagraphsByLang = ref<Record<string, string[]>>({});
      const currentLiveTranslationByLang = ref<Record<string, string>>({});
      const updatePresentationWindow = vi.fn();

      testPresentation.startGeneration(
        isPaused,
        operatorLanguages,
        presentationLanguages,
        finalizedParagraphsByLang,
        currentLiveTranslationByLang,
        updatePresentationWindow,
      );

      // First tick (800ms) - should show live
      vi.advanceTimersByTime(800);

      expect(currentLiveTranslationByLang.value['de-DE']).toBeDefined();
      expect(currentLiveTranslationByLang.value['en']).toBeDefined();
      expect(updatePresentationWindow).toHaveBeenCalledWith(
        expect.objectContaining({ en: expect.any(String) }),
        true,
      );

      // Second tick (1600ms) - should finalize
      vi.advanceTimersByTime(800);

      expect(finalizedParagraphsByLang.value['de-DE']).toHaveLength(1);
      expect(finalizedParagraphsByLang.value['en']).toHaveLength(1);
      expect(finalizedParagraphsByLang.value['de-DE'][0]).toContain('1.');
      expect(currentLiveTranslationByLang.value).toEqual({});
      expect(updatePresentationWindow).toHaveBeenCalledWith({}, false);
    });

    it('should generate text for all operator languages', () => {
      const isPaused = ref(false);
      const operatorLanguages: LanguageConfig[] = [
        { code: 'de-DE', isInput: true },
        { code: 'en', isInput: false },
        { code: 'es', isInput: false },
      ];
      const presentationLanguages: LanguageConfig[] = operatorLanguages;
      const finalizedParagraphsByLang = ref<Record<string, string[]>>({});
      const currentLiveTranslationByLang = ref<Record<string, string>>({});
      const updatePresentationWindow = vi.fn();

      testPresentation.startGeneration(
        isPaused,
        operatorLanguages,
        presentationLanguages,
        finalizedParagraphsByLang,
        currentLiveTranslationByLang,
        updatePresentationWindow,
      );

      // First tick - live translation
      vi.advanceTimersByTime(800);

      expect(currentLiveTranslationByLang.value).toHaveProperty('de-DE');
      expect(currentLiveTranslationByLang.value).toHaveProperty('en');
      expect(currentLiveTranslationByLang.value).toHaveProperty('es');
    });

    it('should only send presentation languages to update callback', () => {
      const isPaused = ref(false);
      const operatorLanguages: LanguageConfig[] = [
        { code: 'de-DE', isInput: true },
        { code: 'en', isInput: false },
        { code: 'es', isInput: false },
      ];
      const presentationLanguages: LanguageConfig[] = [
        { code: 'en', isInput: false },
      ]; // Only one language for presentation
      const finalizedParagraphsByLang = ref<Record<string, string[]>>({});
      const currentLiveTranslationByLang = ref<Record<string, string>>({});
      const updatePresentationWindow = vi.fn();

      testPresentation.startGeneration(
        isPaused,
        operatorLanguages,
        presentationLanguages,
        finalizedParagraphsByLang,
        currentLiveTranslationByLang,
        updatePresentationWindow,
      );

      // First tick - live translation
      vi.advanceTimersByTime(800);

      // All operator languages should have live translations
      expect(currentLiveTranslationByLang.value).toHaveProperty('de-DE');
      expect(currentLiveTranslationByLang.value).toHaveProperty('en');
      expect(currentLiveTranslationByLang.value).toHaveProperty('es');

      // But only presentation languages should be sent to window
      expect(updatePresentationWindow).toHaveBeenCalledWith(
        { en: expect.any(String) }, // Only 'en'
        true,
      );
      const call = updatePresentationWindow.mock.calls[0][0];
      expect(call).not.toHaveProperty('de-DE');
      expect(call).not.toHaveProperty('es');
    });

    it('should not generate when paused', () => {
      const isPaused = ref(true);
      const operatorLanguages: LanguageConfig[] = [
        { code: 'en', isInput: false },
      ];
      const presentationLanguages: LanguageConfig[] = operatorLanguages;
      const finalizedParagraphsByLang = ref<Record<string, string[]>>({});
      const currentLiveTranslationByLang = ref<Record<string, string>>({});
      const updatePresentationWindow = vi.fn();

      testPresentation.startGeneration(
        isPaused,
        operatorLanguages,
        presentationLanguages,
        finalizedParagraphsByLang,
        currentLiveTranslationByLang,
        updatePresentationWindow,
      );

      // First tick - should not generate due to pause
      vi.advanceTimersByTime(800);

      expect(currentLiveTranslationByLang.value).toEqual({});
      expect(finalizedParagraphsByLang.value).toEqual({});
      expect(updatePresentationWindow).not.toHaveBeenCalled();

      // Resume
      isPaused.value = false;
      vi.advanceTimersByTime(800);

      // Now it should generate
      expect(currentLiveTranslationByLang.value).not.toEqual({});
      expect(updatePresentationWindow).toHaveBeenCalled();
    });

    it('should number finalized paragraphs sequentially', () => {
      const isPaused = ref(false);
      const operatorLanguages: LanguageConfig[] = [
        { code: 'en', isInput: false },
      ];
      const presentationLanguages: LanguageConfig[] = operatorLanguages;
      const finalizedParagraphsByLang = ref<Record<string, string[]>>({});
      const currentLiveTranslationByLang = ref<Record<string, string>>({});
      const updatePresentationWindow = vi.fn();

      testPresentation.startGeneration(
        isPaused,
        operatorLanguages,
        presentationLanguages,
        finalizedParagraphsByLang,
        currentLiveTranslationByLang,
        updatePresentationWindow,
      );

      // First finalization
      vi.advanceTimersByTime(800); // Live
      vi.advanceTimersByTime(800); // Finalize

      expect(finalizedParagraphsByLang.value['en'][0]).toMatch(/^1\./);

      // Second finalization
      vi.advanceTimersByTime(800); // Live
      vi.advanceTimersByTime(800); // Finalize

      expect(finalizedParagraphsByLang.value['en'][1]).toMatch(/^2\./);

      // Third finalization
      vi.advanceTimersByTime(800); // Live
      vi.advanceTimersByTime(800); // Finalize

      expect(finalizedParagraphsByLang.value['en'][2]).toMatch(/^3\./);
    });

    it('should stop previous generation when started again', () => {
      const isPaused = ref(false);
      const operatorLanguages: LanguageConfig[] = [
        { code: 'en', isInput: false },
      ];
      const presentationLanguages: LanguageConfig[] = operatorLanguages;
      const finalizedParagraphsByLang = ref<Record<string, string[]>>({});
      const currentLiveTranslationByLang = ref<Record<string, string>>({});
      const updatePresentationWindow = vi.fn();

      // Start first generation
      testPresentation.startGeneration(
        isPaused,
        operatorLanguages,
        presentationLanguages,
        finalizedParagraphsByLang,
        currentLiveTranslationByLang,
        updatePresentationWindow,
      );

      vi.advanceTimersByTime(400); // Partial tick

      // Start second generation (should stop first)
      testPresentation.startGeneration(
        isPaused,
        operatorLanguages,
        presentationLanguages,
        finalizedParagraphsByLang,
        currentLiveTranslationByLang,
        updatePresentationWindow,
      );

      // Clear previous calls
      updatePresentationWindow.mockClear();

      // Advance by 800ms - should only trigger once (from second generation)
      vi.advanceTimersByTime(800);

      expect(updatePresentationWindow).toHaveBeenCalledTimes(1);
    });
  });

  describe('stopGeneration', () => {
    it('should stop generating lorem ipsum', () => {
      const isPaused = ref(false);
      const operatorLanguages: LanguageConfig[] = [
        { code: 'en', isInput: false },
      ];
      const presentationLanguages: LanguageConfig[] = operatorLanguages;
      const finalizedParagraphsByLang = ref<Record<string, string[]>>({});
      const currentLiveTranslationByLang = ref<Record<string, string>>({});
      const updatePresentationWindow = vi.fn();

      testPresentation.startGeneration(
        isPaused,
        operatorLanguages,
        presentationLanguages,
        finalizedParagraphsByLang,
        currentLiveTranslationByLang,
        updatePresentationWindow,
      );

      vi.advanceTimersByTime(800);
      expect(updatePresentationWindow).toHaveBeenCalled();

      updatePresentationWindow.mockClear();

      // Stop generation
      testPresentation.stopGeneration();

      // Advance time - should not call update anymore
      vi.advanceTimersByTime(5000);
      expect(updatePresentationWindow).not.toHaveBeenCalled();
    });

    it('should not crash if called when not generating', () => {
      expect(() => {
        testPresentation.stopGeneration();
      }).not.toThrow();
    });

    it('should allow restarting after stop', () => {
      const isPaused = ref(false);
      const operatorLanguages: LanguageConfig[] = [
        { code: 'en', isInput: false },
      ];
      const presentationLanguages: LanguageConfig[] = operatorLanguages;
      const finalizedParagraphsByLang = ref<Record<string, string[]>>({});
      const currentLiveTranslationByLang = ref<Record<string, string>>({});
      const updatePresentationWindow = vi.fn();

      // Start
      testPresentation.startGeneration(
        isPaused,
        operatorLanguages,
        presentationLanguages,
        finalizedParagraphsByLang,
        currentLiveTranslationByLang,
        updatePresentationWindow,
      );

      vi.advanceTimersByTime(800);
      expect(updatePresentationWindow).toHaveBeenCalled();

      // Stop
      testPresentation.stopGeneration();
      updatePresentationWindow.mockClear();

      // Restart
      testPresentation.startGeneration(
        isPaused,
        operatorLanguages,
        presentationLanguages,
        finalizedParagraphsByLang,
        currentLiveTranslationByLang,
        updatePresentationWindow,
      );

      vi.advanceTimersByTime(800);
      expect(updatePresentationWindow).toHaveBeenCalled();
    });
  });

  describe('isGenerating', () => {
    it('should return false when not generating', () => {
      expect(testPresentation.isGenerating()).toBe(false);
    });

    it('should return true when generating', () => {
      const isPaused = ref(false);
      const operatorLanguages: LanguageConfig[] = [
        { code: 'en', isInput: false },
      ];
      const presentationLanguages: LanguageConfig[] = operatorLanguages;
      const finalizedParagraphsByLang = ref<Record<string, string[]>>({});
      const currentLiveTranslationByLang = ref<Record<string, string>>({});
      const updatePresentationWindow = vi.fn();

      testPresentation.startGeneration(
        isPaused,
        operatorLanguages,
        presentationLanguages,
        finalizedParagraphsByLang,
        currentLiveTranslationByLang,
        updatePresentationWindow,
      );

      expect(testPresentation.isGenerating()).toBe(true);
    });

    it('should return false after stopping', () => {
      const isPaused = ref(false);
      const operatorLanguages: LanguageConfig[] = [
        { code: 'en', isInput: false },
      ];
      const presentationLanguages: LanguageConfig[] = operatorLanguages;
      const finalizedParagraphsByLang = ref<Record<string, string[]>>({});
      const currentLiveTranslationByLang = ref<Record<string, string>>({});
      const updatePresentationWindow = vi.fn();

      testPresentation.startGeneration(
        isPaused,
        operatorLanguages,
        presentationLanguages,
        finalizedParagraphsByLang,
        currentLiveTranslationByLang,
        updatePresentationWindow,
      );

      expect(testPresentation.isGenerating()).toBe(true);

      testPresentation.stopGeneration();

      expect(testPresentation.isGenerating()).toBe(false);
    });
  });
});
