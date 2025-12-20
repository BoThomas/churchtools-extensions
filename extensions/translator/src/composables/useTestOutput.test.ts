import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useTestOutput } from './useTestOutput';
import { PRESENTATION_PARAGRAPH_WINDOW_SIZE } from '../config';
import type { LanguageConfig } from '../types/language';

// Mock nextTick to execute synchronously in tests
vi.mock('vue', async () => {
  const actual = await vi.importActual('vue');
  return {
    ...actual,
    nextTick: vi.fn((fn?: () => void) => {
      if (fn) fn();
      return Promise.resolve();
    }),
  };
});

describe('useTestOutput', () => {
  let testOutput: ReturnType<typeof useTestOutput>;

  beforeEach(() => {
    testOutput = useTestOutput();
  });

  describe('addFinalizedParagraph', () => {
    it('should add a paragraph to an empty language array', () => {
      testOutput.addFinalizedParagraph('en', 'First paragraph');

      expect(testOutput.finalizedParagraphsByLang.value['en']).toHaveLength(1);
      expect(testOutput.finalizedParagraphsByLang.value['en'][0]).toBe(
        'First paragraph',
      );
    });

    it('should add multiple paragraphs to the same language', () => {
      testOutput.addFinalizedParagraph('en', 'First paragraph');
      testOutput.addFinalizedParagraph('en', 'Second paragraph');
      testOutput.addFinalizedParagraph('en', 'Third paragraph');

      expect(testOutput.finalizedParagraphsByLang.value['en']).toHaveLength(3);
      expect(testOutput.finalizedParagraphsByLang.value['en']).toEqual([
        'First paragraph',
        'Second paragraph',
        'Third paragraph',
      ]);
    });

    it('should add paragraphs to different languages independently', () => {
      testOutput.addFinalizedParagraph('en', 'English paragraph');
      testOutput.addFinalizedParagraph('de', 'German paragraph');
      testOutput.addFinalizedParagraph('es', 'Spanish paragraph');

      expect(testOutput.finalizedParagraphsByLang.value['en']).toHaveLength(1);
      expect(testOutput.finalizedParagraphsByLang.value['de']).toHaveLength(1);
      expect(testOutput.finalizedParagraphsByLang.value['es']).toHaveLength(1);
    });

    it('should apply sliding window when exceeding limit', () => {
      // Add more paragraphs than the window size
      for (let i = 1; i <= PRESENTATION_PARAGRAPH_WINDOW_SIZE + 5; i++) {
        testOutput.addFinalizedParagraph('en', `Paragraph ${i}`);
      }

      // Should only keep the last PRESENTATION_PARAGRAPH_WINDOW_SIZE paragraphs
      expect(testOutput.finalizedParagraphsByLang.value['en']).toHaveLength(
        PRESENTATION_PARAGRAPH_WINDOW_SIZE,
      );

      // First paragraph should be the 6th one (since first 5 were slid out)
      expect(testOutput.finalizedParagraphsByLang.value['en'][0]).toBe(
        'Paragraph 6',
      );

      // Last paragraph should be the most recent
      expect(
        testOutput.finalizedParagraphsByLang.value['en'][
          PRESENTATION_PARAGRAPH_WINDOW_SIZE - 1
        ],
      ).toBe(`Paragraph ${PRESENTATION_PARAGRAPH_WINDOW_SIZE + 5}`);
    });

    it('should not affect other languages when sliding window is applied', () => {
      // Add many paragraphs to English (exceeding limit)
      for (let i = 1; i <= PRESENTATION_PARAGRAPH_WINDOW_SIZE + 3; i++) {
        testOutput.addFinalizedParagraph('en', `English ${i}`);
      }

      // Add fewer paragraphs to German (under limit)
      for (let i = 1; i <= 3; i++) {
        testOutput.addFinalizedParagraph('de', `German ${i}`);
      }

      // English should be trimmed
      expect(testOutput.finalizedParagraphsByLang.value['en']).toHaveLength(
        PRESENTATION_PARAGRAPH_WINDOW_SIZE,
      );
      expect(testOutput.finalizedParagraphsByLang.value['en'][0]).toBe(
        'English 4',
      );

      // German should be unaffected
      expect(testOutput.finalizedParagraphsByLang.value['de']).toHaveLength(3);
      expect(testOutput.finalizedParagraphsByLang.value['de'][0]).toBe(
        'German 1',
      );
    });

    it('should create new array reference for reactivity', () => {
      testOutput.addFinalizedParagraph('en', 'First');
      const firstArrayRef = testOutput.finalizedParagraphsByLang.value['en'];

      testOutput.addFinalizedParagraph('en', 'Second');
      const secondArrayRef = testOutput.finalizedParagraphsByLang.value['en'];

      // Should be different array references for Vue reactivity
      expect(firstArrayRef).not.toBe(secondArrayRef);
    });
  });

  describe('updateLiveTranslation', () => {
    it('should update live translation for a language', () => {
      testOutput.updateLiveTranslation('en', 'Live text');

      expect(testOutput.currentLiveTranslationByLang.value['en']).toBe(
        'Live text',
      );
    });

    it('should overwrite existing live translation', () => {
      testOutput.updateLiveTranslation('en', 'First');
      testOutput.updateLiveTranslation('en', 'Second');

      expect(testOutput.currentLiveTranslationByLang.value['en']).toBe(
        'Second',
      );
    });
  });

  describe('clearOutput', () => {
    it('should clear all finalized paragraphs', () => {
      testOutput.addFinalizedParagraph('en', 'English');
      testOutput.addFinalizedParagraph('de', 'German');

      testOutput.clearOutput();

      expect(testOutput.finalizedParagraphsByLang.value).toEqual({});
    });

    it('should clear all live translations', () => {
      testOutput.updateLiveTranslation('en', 'English live');
      testOutput.updateLiveTranslation('de', 'German live');

      testOutput.clearOutput();

      expect(testOutput.currentLiveTranslationByLang.value).toEqual({});
    });
  });

  describe('initializeLanguages', () => {
    it('should initialize empty arrays for provided languages', () => {
      const languages: LanguageConfig[] = [
        { code: 'en', isInput: false },
        { code: 'de', isInput: true },
        { code: 'es', isInput: false },
      ];

      testOutput.initializeLanguages(languages);

      expect(testOutput.finalizedParagraphsByLang.value['en']).toEqual([]);
      expect(testOutput.finalizedParagraphsByLang.value['de']).toEqual([]);
      expect(testOutput.finalizedParagraphsByLang.value['es']).toEqual([]);
    });

    it('should not overwrite existing paragraphs', () => {
      testOutput.addFinalizedParagraph('en', 'Existing paragraph');

      const languages: LanguageConfig[] = [
        { code: 'en', isInput: false },
        { code: 'de', isInput: true },
      ];

      testOutput.initializeLanguages(languages);

      // English should keep existing data
      expect(testOutput.finalizedParagraphsByLang.value['en']).toHaveLength(1);
      // German should be initialized
      expect(testOutput.finalizedParagraphsByLang.value['de']).toEqual([]);
    });
  });

  describe('sliding window configuration', () => {
    it('should keep exactly PRESENTATION_PARAGRAPH_WINDOW_SIZE paragraphs at the limit', () => {
      // Add exactly the window size
      for (let i = 1; i <= PRESENTATION_PARAGRAPH_WINDOW_SIZE; i++) {
        testOutput.addFinalizedParagraph('en', `Paragraph ${i}`);
      }

      expect(testOutput.finalizedParagraphsByLang.value['en']).toHaveLength(
        PRESENTATION_PARAGRAPH_WINDOW_SIZE,
      );
      expect(testOutput.finalizedParagraphsByLang.value['en'][0]).toBe(
        'Paragraph 1',
      );

      // Add one more - should trigger sliding window
      testOutput.addFinalizedParagraph('en', 'One more');

      expect(testOutput.finalizedParagraphsByLang.value['en']).toHaveLength(
        PRESENTATION_PARAGRAPH_WINDOW_SIZE,
      );
      expect(testOutput.finalizedParagraphsByLang.value['en'][0]).toBe(
        'Paragraph 2',
      );
      expect(
        testOutput.finalizedParagraphsByLang.value['en'][
          PRESENTATION_PARAGRAPH_WINDOW_SIZE - 1
        ],
      ).toBe('One more');
    });
  });
});
