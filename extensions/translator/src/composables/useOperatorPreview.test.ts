import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useOperatorPreview } from './useOperatorPreview';
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

describe('useOperatorPreview', () => {
  let operatorPreview: ReturnType<typeof useOperatorPreview>;

  beforeEach(() => {
    operatorPreview = useOperatorPreview();
  });

  describe('addFinalizedParagraph', () => {
    it('should add a paragraph to an empty language array', () => {
      operatorPreview.addFinalizedParagraph('en', 'First paragraph');

      expect(
        operatorPreview.finalizedParagraphsByLang.value['en'],
      ).toHaveLength(1);
      expect(operatorPreview.finalizedParagraphsByLang.value['en'][0]).toBe(
        'First paragraph',
      );
    });

    it('should add multiple paragraphs to the same language', () => {
      operatorPreview.addFinalizedParagraph('en', 'First paragraph');
      operatorPreview.addFinalizedParagraph('en', 'Second paragraph');
      operatorPreview.addFinalizedParagraph('en', 'Third paragraph');

      expect(
        operatorPreview.finalizedParagraphsByLang.value['en'],
      ).toHaveLength(3);
      expect(operatorPreview.finalizedParagraphsByLang.value['en']).toEqual([
        'First paragraph',
        'Second paragraph',
        'Third paragraph',
      ]);
    });

    it('should add paragraphs to different languages independently', () => {
      operatorPreview.addFinalizedParagraph('en', 'English paragraph');
      operatorPreview.addFinalizedParagraph('de', 'German paragraph');
      operatorPreview.addFinalizedParagraph('es', 'Spanish paragraph');

      expect(
        operatorPreview.finalizedParagraphsByLang.value['en'],
      ).toHaveLength(1);
      expect(
        operatorPreview.finalizedParagraphsByLang.value['de'],
      ).toHaveLength(1);
      expect(
        operatorPreview.finalizedParagraphsByLang.value['es'],
      ).toHaveLength(1);
    });

    it('should apply sliding window when exceeding limit', () => {
      // Add more paragraphs than the window size
      for (let i = 1; i <= PRESENTATION_PARAGRAPH_WINDOW_SIZE + 5; i++) {
        operatorPreview.addFinalizedParagraph('en', `Paragraph ${i}`);
      }

      // Should only keep the last PRESENTATION_PARAGRAPH_WINDOW_SIZE paragraphs
      expect(
        operatorPreview.finalizedParagraphsByLang.value['en'],
      ).toHaveLength(PRESENTATION_PARAGRAPH_WINDOW_SIZE);

      // First paragraph should be the 6th one (since first 5 were slid out)
      expect(operatorPreview.finalizedParagraphsByLang.value['en'][0]).toBe(
        'Paragraph 6',
      );

      // Last paragraph should be the most recent
      expect(
        operatorPreview.finalizedParagraphsByLang.value['en'][
          PRESENTATION_PARAGRAPH_WINDOW_SIZE - 1
        ],
      ).toBe(`Paragraph ${PRESENTATION_PARAGRAPH_WINDOW_SIZE + 5}`);
    });

    it('should not affect other languages when sliding window is applied', () => {
      // Add many paragraphs to English (exceeding limit)
      for (let i = 1; i <= PRESENTATION_PARAGRAPH_WINDOW_SIZE + 3; i++) {
        operatorPreview.addFinalizedParagraph('en', `English ${i}`);
      }

      // Add fewer paragraphs to German (under limit)
      for (let i = 1; i <= 3; i++) {
        operatorPreview.addFinalizedParagraph('de', `German ${i}`);
      }

      // English should be trimmed
      expect(
        operatorPreview.finalizedParagraphsByLang.value['en'],
      ).toHaveLength(PRESENTATION_PARAGRAPH_WINDOW_SIZE);
      expect(operatorPreview.finalizedParagraphsByLang.value['en'][0]).toBe(
        'English 4',
      );

      // German should be unaffected
      expect(
        operatorPreview.finalizedParagraphsByLang.value['de'],
      ).toHaveLength(3);
      expect(operatorPreview.finalizedParagraphsByLang.value['de'][0]).toBe(
        'German 1',
      );
    });

    it('should create new array reference for reactivity', () => {
      operatorPreview.addFinalizedParagraph('en', 'First');
      const firstArrayRef =
        operatorPreview.finalizedParagraphsByLang.value['en'];

      operatorPreview.addFinalizedParagraph('en', 'Second');
      const secondArrayRef =
        operatorPreview.finalizedParagraphsByLang.value['en'];

      // Should be different array references for Vue reactivity
      expect(firstArrayRef).not.toBe(secondArrayRef);
    });
  });

  describe('updateLiveTranslation', () => {
    it('should update live translation for a language', () => {
      operatorPreview.updateLiveTranslation('en', 'Live text');

      expect(operatorPreview.currentLiveTranslationByLang.value['en']).toBe(
        'Live text',
      );
    });

    it('should overwrite existing live translation', () => {
      operatorPreview.updateLiveTranslation('en', 'First');
      operatorPreview.updateLiveTranslation('en', 'Second');

      expect(operatorPreview.currentLiveTranslationByLang.value['en']).toBe(
        'Second',
      );
    });
  });

  describe('clearOutput', () => {
    it('should clear all finalized paragraphs', () => {
      operatorPreview.addFinalizedParagraph('en', 'English');
      operatorPreview.addFinalizedParagraph('de', 'German');

      operatorPreview.clearOutput();

      expect(operatorPreview.finalizedParagraphsByLang.value).toEqual({});
    });

    it('should clear all live translations', () => {
      operatorPreview.updateLiveTranslation('en', 'English live');
      operatorPreview.updateLiveTranslation('de', 'German live');

      operatorPreview.clearOutput();

      expect(operatorPreview.currentLiveTranslationByLang.value).toEqual({});
    });
  });

  describe('initializeLanguages', () => {
    it('should initialize empty arrays for provided languages', () => {
      const languages: LanguageConfig[] = [
        { code: 'en', isInput: false },
        { code: 'de', isInput: true },
        { code: 'es', isInput: false },
      ];

      operatorPreview.initializeLanguages(languages);

      expect(operatorPreview.finalizedParagraphsByLang.value['en']).toEqual([]);
      expect(operatorPreview.finalizedParagraphsByLang.value['de']).toEqual([]);
      expect(operatorPreview.finalizedParagraphsByLang.value['es']).toEqual([]);
    });

    it('should not overwrite existing paragraphs', () => {
      operatorPreview.addFinalizedParagraph('en', 'Existing paragraph');

      const languages: LanguageConfig[] = [
        { code: 'en', isInput: false },
        { code: 'de', isInput: true },
      ];

      operatorPreview.initializeLanguages(languages);

      // English should keep existing data
      expect(
        operatorPreview.finalizedParagraphsByLang.value['en'],
      ).toHaveLength(1);
      // German should be initialized
      expect(operatorPreview.finalizedParagraphsByLang.value['de']).toEqual([]);
    });
  });

  describe('sliding window configuration', () => {
    it('should keep exactly PRESENTATION_PARAGRAPH_WINDOW_SIZE paragraphs at the limit', () => {
      // Add exactly the window size
      for (let i = 1; i <= PRESENTATION_PARAGRAPH_WINDOW_SIZE; i++) {
        operatorPreview.addFinalizedParagraph('en', `Paragraph ${i}`);
      }

      expect(
        operatorPreview.finalizedParagraphsByLang.value['en'],
      ).toHaveLength(PRESENTATION_PARAGRAPH_WINDOW_SIZE);
      expect(operatorPreview.finalizedParagraphsByLang.value['en'][0]).toBe(
        'Paragraph 1',
      );

      // Add one more - should trigger sliding window
      operatorPreview.addFinalizedParagraph('en', 'One more');

      expect(
        operatorPreview.finalizedParagraphsByLang.value['en'],
      ).toHaveLength(PRESENTATION_PARAGRAPH_WINDOW_SIZE);
      expect(operatorPreview.finalizedParagraphsByLang.value['en'][0]).toBe(
        'Paragraph 2',
      );
      expect(
        operatorPreview.finalizedParagraphsByLang.value['en'][
          PRESENTATION_PARAGRAPH_WINDOW_SIZE - 1
        ],
      ).toBe('One more');
    });
  });
});
