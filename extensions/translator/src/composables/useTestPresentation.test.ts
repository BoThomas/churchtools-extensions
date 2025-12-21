import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ref } from 'vue';
import { useTestPresentation } from './useTestPresentation';
import type { LanguageConfig } from '../types/language';
import { PRESENTATION_PARAGRAPH_WINDOW_SIZE } from '../config';

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

/**
 * Helper to create a mock addFinalizedParagraph function that populates a ref
 * and optionally applies sliding window (simulating useOperatorPreview behavior)
 */
function createMockAddFinalizedParagraph(
  finalizedParagraphsByLang: { value: Record<string, string[]> },
  applySlidingWindow = true,
) {
  return (languageCode: string, text: string) => {
    if (!finalizedParagraphsByLang.value[languageCode]) {
      finalizedParagraphsByLang.value[languageCode] = [];
    }
    const paragraphs = [...finalizedParagraphsByLang.value[languageCode], text];
    finalizedParagraphsByLang.value[languageCode] = applySlidingWindow
      ? paragraphs.slice(-PRESENTATION_PARAGRAPH_WINDOW_SIZE)
      : paragraphs;
  };
}

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
      const addFinalizedParagraph = createMockAddFinalizedParagraph(
        finalizedParagraphsByLang,
      );
      const currentLiveTranslationByLang = ref<Record<string, string>>({});
      const updatePresentationWindow = vi.fn();
      const scrollToBottom = vi.fn();

      testPresentation.startGeneration(
        isPaused,
        operatorLanguages,
        presentationLanguages,
        addFinalizedParagraph,
        currentLiveTranslationByLang,
        updatePresentationWindow,
        scrollToBottom,
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

      // Should have at least 1 paragraph (may be trimmed by sliding window in real scenarios)
      expect(
        finalizedParagraphsByLang.value['de-DE'].length,
      ).toBeGreaterThanOrEqual(1);
      expect(
        finalizedParagraphsByLang.value['en'].length,
      ).toBeGreaterThanOrEqual(1);
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
      const addFinalizedParagraph = createMockAddFinalizedParagraph(
        finalizedParagraphsByLang,
      );
      const currentLiveTranslationByLang = ref<Record<string, string>>({});
      const updatePresentationWindow = vi.fn();
      const scrollToBottom = vi.fn();

      testPresentation.startGeneration(
        isPaused,
        operatorLanguages,
        presentationLanguages,
        addFinalizedParagraph,
        currentLiveTranslationByLang,
        updatePresentationWindow,
        scrollToBottom,
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
      const addFinalizedParagraph = createMockAddFinalizedParagraph(
        finalizedParagraphsByLang,
      );
      const currentLiveTranslationByLang = ref<Record<string, string>>({});
      const updatePresentationWindow = vi.fn();

      testPresentation.startGeneration(
        isPaused,
        operatorLanguages,
        presentationLanguages,
        addFinalizedParagraph,
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
      const addFinalizedParagraph = createMockAddFinalizedParagraph(
        finalizedParagraphsByLang,
      );
      const currentLiveTranslationByLang = ref<Record<string, string>>({});
      const updatePresentationWindow = vi.fn();

      testPresentation.startGeneration(
        isPaused,
        operatorLanguages,
        presentationLanguages,
        addFinalizedParagraph,
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
      const addFinalizedParagraph = createMockAddFinalizedParagraph(
        finalizedParagraphsByLang,
      );
      const currentLiveTranslationByLang = ref<Record<string, string>>({});
      const updatePresentationWindow = vi.fn();

      testPresentation.startGeneration(
        isPaused,
        operatorLanguages,
        presentationLanguages,
        addFinalizedParagraph,
        currentLiveTranslationByLang,
        updatePresentationWindow,
      );

      // First finalization
      vi.advanceTimersByTime(800); // Live
      vi.advanceTimersByTime(800); // Finalize

      const firstParagraph = finalizedParagraphsByLang.value['en'][0];
      expect(firstParagraph).toMatch(/^1\./);

      // Second finalization
      vi.advanceTimersByTime(800); // Live
      vi.advanceTimersByTime(800); // Finalize

      const secondParagraph = finalizedParagraphsByLang.value['en'][1];
      expect(secondParagraph).toMatch(/^2\./);

      // Third finalization
      vi.advanceTimersByTime(800); // Live
      vi.advanceTimersByTime(800); // Finalize

      const thirdParagraph = finalizedParagraphsByLang.value['en'][2];
      expect(thirdParagraph).toMatch(/^3\./);

      // Verify absolute numbering continues (not reset by array index)
      expect(finalizedParagraphsByLang.value['en']).toHaveLength(3);
    });

    it('should maintain absolute paragraph numbering beyond sliding window', () => {
      const isPaused = ref(false);
      const operatorLanguages: LanguageConfig[] = [
        { code: 'en', isInput: false },
      ];
      const presentationLanguages: LanguageConfig[] = operatorLanguages;
      const finalizedParagraphsByLang = ref<Record<string, string[]>>({});
      // Use sliding window enabled to test real behavior
      const addFinalizedParagraph = createMockAddFinalizedParagraph(
        finalizedParagraphsByLang,
        true,
      );
      const currentLiveTranslationByLang = ref<Record<string, string>>({});
      const updatePresentationWindow = vi.fn();

      testPresentation.startGeneration(
        isPaused,
        operatorLanguages,
        presentationLanguages,
        addFinalizedParagraph,
        currentLiveTranslationByLang,
        updatePresentationWindow,
      );

      // Generate more paragraphs than the window size
      const numParagraphs = PRESENTATION_PARAGRAPH_WINDOW_SIZE + 5;
      for (let i = 0; i < numParagraphs; i++) {
        vi.advanceTimersByTime(800); // Live
        vi.advanceTimersByTime(800); // Finalize
      }

      // Should only have window size paragraphs
      expect(finalizedParagraphsByLang.value['en']).toHaveLength(
        PRESENTATION_PARAGRAPH_WINDOW_SIZE,
      );

      // First paragraph in array should be numbered beyond 1 due to sliding window
      const firstParagraph = finalizedParagraphsByLang.value['en'][0];
      expect(firstParagraph).toMatch(/^6\./); // Window slid past first 5

      // Last paragraph should have the correct absolute number
      const lastParagraph =
        finalizedParagraphsByLang.value['en'][
          PRESENTATION_PARAGRAPH_WINDOW_SIZE - 1
        ];
      expect(lastParagraph).toMatch(new RegExp(`^${numParagraphs}\\.`));
    });

    it('should reset absolute counters when stopped', () => {
      const isPaused = ref(false);
      const operatorLanguages: LanguageConfig[] = [
        { code: 'en', isInput: false },
      ];
      const presentationLanguages: LanguageConfig[] = operatorLanguages;
      const finalizedParagraphsByLang = ref<Record<string, string[]>>({});
      const addFinalizedParagraph = createMockAddFinalizedParagraph(
        finalizedParagraphsByLang,
      );
      const currentLiveTranslationByLang = ref<Record<string, string>>({});
      const updatePresentationWindow = vi.fn();

      // Generate some paragraphs
      testPresentation.startGeneration(
        isPaused,
        operatorLanguages,
        presentationLanguages,
        addFinalizedParagraph,
        currentLiveTranslationByLang,
        updatePresentationWindow,
      );

      vi.advanceTimersByTime(800); // Live
      vi.advanceTimersByTime(800); // Finalize

      expect(finalizedParagraphsByLang.value['en'][0]).toMatch(/^1\./);

      // Stop generation
      testPresentation.stopGeneration();

      // Clear arrays
      finalizedParagraphsByLang.value = {};

      // Create fresh callback for new session
      const addFinalizedParagraph2 = createMockAddFinalizedParagraph(
        finalizedParagraphsByLang,
      );

      // Start again - should restart numbering at 1
      testPresentation.startGeneration(
        isPaused,
        operatorLanguages,
        presentationLanguages,
        addFinalizedParagraph2,
        currentLiveTranslationByLang,
        updatePresentationWindow,
      );

      vi.advanceTimersByTime(800); // Live
      vi.advanceTimersByTime(800); // Finalize

      expect(finalizedParagraphsByLang.value['en'][0]).toMatch(/^1\./); // Should restart at 1
    });

    it('should stop previous generation when started again', () => {
      const isPaused = ref(false);
      const operatorLanguages: LanguageConfig[] = [
        { code: 'en', isInput: false },
      ];
      const presentationLanguages: LanguageConfig[] = operatorLanguages;
      const finalizedParagraphsByLang = ref<Record<string, string[]>>({});
      const addFinalizedParagraph = createMockAddFinalizedParagraph(
        finalizedParagraphsByLang,
      );
      const currentLiveTranslationByLang = ref<Record<string, string>>({});
      const updatePresentationWindow = vi.fn();

      // Start first generation
      testPresentation.startGeneration(
        isPaused,
        operatorLanguages,
        presentationLanguages,
        addFinalizedParagraph,
        currentLiveTranslationByLang,
        updatePresentationWindow,
      );

      vi.advanceTimersByTime(400); // Partial tick

      // Start second generation (should stop first)
      testPresentation.startGeneration(
        isPaused,
        operatorLanguages,
        presentationLanguages,
        addFinalizedParagraph,
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
      const addFinalizedParagraph = createMockAddFinalizedParagraph(
        finalizedParagraphsByLang,
      );
      const currentLiveTranslationByLang = ref<Record<string, string>>({});
      const updatePresentationWindow = vi.fn();

      testPresentation.startGeneration(
        isPaused,
        operatorLanguages,
        presentationLanguages,
        addFinalizedParagraph,
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
      const addFinalizedParagraph = createMockAddFinalizedParagraph(
        finalizedParagraphsByLang,
      );
      const currentLiveTranslationByLang = ref<Record<string, string>>({});
      const updatePresentationWindow = vi.fn();

      // Start
      testPresentation.startGeneration(
        isPaused,
        operatorLanguages,
        presentationLanguages,
        addFinalizedParagraph,
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
        addFinalizedParagraph,
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
      const addFinalizedParagraph = createMockAddFinalizedParagraph(
        finalizedParagraphsByLang,
      );
      const currentLiveTranslationByLang = ref<Record<string, string>>({});
      const updatePresentationWindow = vi.fn();

      testPresentation.startGeneration(
        isPaused,
        operatorLanguages,
        presentationLanguages,
        addFinalizedParagraph,
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
      const addFinalizedParagraph = createMockAddFinalizedParagraph(
        finalizedParagraphsByLang,
      );
      const currentLiveTranslationByLang = ref<Record<string, string>>({});
      const updatePresentationWindow = vi.fn();

      testPresentation.startGeneration(
        isPaused,
        operatorLanguages,
        presentationLanguages,
        addFinalizedParagraph,
        currentLiveTranslationByLang,
        updatePresentationWindow,
      );

      expect(testPresentation.isGenerating()).toBe(true);

      testPresentation.stopGeneration();

      expect(testPresentation.isGenerating()).toBe(false);
    });
  });
});
