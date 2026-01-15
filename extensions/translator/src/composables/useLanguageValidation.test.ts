import { describe, it, expect, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useLanguageValidation } from './useLanguageValidation';
import { useSettingsStore } from '../stores/settings';
import '../__mocks__/persistance';

describe('useLanguageValidation', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('inputLanguageValid', () => {
    it('should return true for valid input language', () => {
      const store = useSettingsStore();
      store.settings.inputLanguage = 'de-DE';

      const validation = useLanguageValidation();

      expect(validation.inputLanguageValid.value).toBe(true);
    });

    it('should return false for invalid input language', () => {
      const store = useSettingsStore();
      store.settings.inputLanguage = 'invalid-XX';

      const validation = useLanguageValidation();

      expect(validation.inputLanguageValid.value).toBe(false);
    });

    it('should validate multiple input language codes', () => {
      const store = useSettingsStore();
      const validation = useLanguageValidation();

      const validCodes = ['de-DE', 'en-GB', 'en-US', 'es-ES', 'fr-FR'];
      validCodes.forEach((code) => {
        store.settings.inputLanguage = code;
        expect(validation.inputLanguageValid.value).toBe(true);
      });
    });
  });

  describe('outputLanguagesValid', () => {
    it('should return true for valid single output language', () => {
      const store = useSettingsStore();
      store.settings.outputLanguages = ['en'];

      const validation = useLanguageValidation();

      expect(validation.outputLanguagesValid.value).toBe(true);
    });

    it('should return true for valid multiple output languages', () => {
      const store = useSettingsStore();
      store.settings.outputLanguages = ['en', 'de', 'es', 'fr'];

      const validation = useLanguageValidation();

      expect(validation.outputLanguagesValid.value).toBe(true);
    });

    it('should return false for empty output languages array', () => {
      const store = useSettingsStore();
      store.settings.outputLanguages = [];

      const validation = useLanguageValidation();

      expect(validation.outputLanguagesValid.value).toBe(false);
    });

    it('should return false when outputLanguages is undefined', () => {
      const store = useSettingsStore();
      store.settings.outputLanguages = undefined as any;

      const validation = useLanguageValidation();

      expect(validation.outputLanguagesValid.value).toBe(false);
    });

    it('should return false if any output language is invalid', () => {
      const store = useSettingsStore();
      store.settings.outputLanguages = ['en', 'invalid-XX', 'de'];

      const validation = useLanguageValidation();

      expect(validation.outputLanguagesValid.value).toBe(false);
    });
  });

  describe('hasInvalidLanguages', () => {
    it('should return false when all languages are valid', () => {
      const store = useSettingsStore();
      store.settings.inputLanguage = 'de-DE';
      store.settings.outputLanguages = ['en', 'es'];

      const validation = useLanguageValidation();

      expect(validation.hasInvalidLanguages.value).toBe(false);
    });

    it('should return true when input language is invalid', () => {
      const store = useSettingsStore();
      store.settings.inputLanguage = 'invalid-XX';
      store.settings.outputLanguages = ['en'];

      const validation = useLanguageValidation();

      expect(validation.hasInvalidLanguages.value).toBe(true);
    });

    it('should return true when output languages are invalid', () => {
      const store = useSettingsStore();
      store.settings.inputLanguage = 'de-DE';
      store.settings.outputLanguages = [];

      const validation = useLanguageValidation();

      expect(validation.hasInvalidLanguages.value).toBe(true);
    });

    it('should return true when both input and output are invalid', () => {
      const store = useSettingsStore();
      store.settings.inputLanguage = 'invalid-XX';
      store.settings.outputLanguages = ['invalid-YY'];

      const validation = useLanguageValidation();

      expect(validation.hasInvalidLanguages.value).toBe(true);
    });
  });

  describe('shouldShowInvalidLanguageWarning', () => {
    it('should show warning when languages are invalid', () => {
      const store = useSettingsStore();
      store.settings.inputLanguage = 'invalid-XX';
      store.settings.outputLanguages = ['en'];

      const validation = useLanguageValidation();

      expect(validation.shouldShowInvalidLanguageWarning.value).toBe(true);
    });

    it('should not show warning when languages are valid', () => {
      const store = useSettingsStore();
      store.settings.inputLanguage = 'de-DE';
      store.settings.outputLanguages = ['en'];

      const validation = useLanguageValidation();

      expect(validation.shouldShowInvalidLanguageWarning.value).toBe(false);
    });
  });

  describe('allLanguages', () => {
    it('should include input and output languages when all valid', () => {
      const store = useSettingsStore();
      store.settings.inputLanguage = 'de-DE';
      store.settings.outputLanguages = ['en', 'es'];

      const validation = useLanguageValidation();

      expect(validation.allLanguages.value).toEqual([
        { code: 'de-DE', isInput: true },
        { code: 'en', isInput: false },
        { code: 'es', isInput: false },
      ]);
    });

    it('should exclude invalid input language', () => {
      const store = useSettingsStore();
      store.settings.inputLanguage = 'invalid-XX';
      store.settings.outputLanguages = ['en', 'es'];

      const validation = useLanguageValidation();

      expect(validation.allLanguages.value).toEqual([
        { code: 'en', isInput: false },
        { code: 'es', isInput: false },
      ]);
    });

    it('should exclude invalid output languages', () => {
      const store = useSettingsStore();
      store.settings.inputLanguage = 'de-DE';
      store.settings.outputLanguages = [];

      const validation = useLanguageValidation();

      expect(validation.allLanguages.value).toEqual([
        { code: 'de-DE', isInput: true },
      ]);
    });

    it('should return empty array when all languages invalid', () => {
      const store = useSettingsStore();
      store.settings.inputLanguage = 'invalid-XX';
      store.settings.outputLanguages = [];

      const validation = useLanguageValidation();

      expect(validation.allLanguages.value).toEqual([]);
    });
  });

  describe('operatorLanguages', () => {
    it('should return all valid languages for operator', () => {
      const store = useSettingsStore();
      store.settings.inputLanguage = 'de-DE';
      store.settings.outputLanguages = ['en', 'es'];

      const validation = useLanguageValidation();

      expect(validation.operatorLanguages.value).toEqual([
        { code: 'de-DE', isInput: true },
        { code: 'en', isInput: false },
        { code: 'es', isInput: false },
      ]);
    });

    it('should always include input language for operator (test mode)', () => {
      const store = useSettingsStore();
      store.settings.inputLanguage = 'de-DE';
      store.settings.outputLanguages = ['en'];
      store.settings.presentation.showInputLanguage = false;

      const validation = useLanguageValidation();

      // Operator languages should include input regardless of showInputLanguage
      expect(validation.operatorLanguages.value).toEqual([
        { code: 'de-DE', isInput: true },
        { code: 'en', isInput: false },
      ]);
    });
  });

  describe('presentationLanguages', () => {
    it('should include input language when showInputLanguage is true', () => {
      const store = useSettingsStore();
      store.settings.inputLanguage = 'de-DE';
      store.settings.outputLanguages = ['en', 'es'];
      store.settings.presentation.showInputLanguage = true;

      const validation = useLanguageValidation();

      expect(validation.presentationLanguages.value).toEqual([
        { code: 'de-DE', isInput: true },
        { code: 'en', isInput: false },
        { code: 'es', isInput: false },
      ]);
    });

    it('should exclude input language when showInputLanguage is false', () => {
      const store = useSettingsStore();
      store.settings.inputLanguage = 'de-DE';
      store.settings.outputLanguages = ['en', 'es'];
      store.settings.presentation.showInputLanguage = false;

      const validation = useLanguageValidation();

      expect(validation.presentationLanguages.value).toEqual([
        { code: 'en', isInput: false },
        { code: 'es', isInput: false },
      ]);
    });

    it('should return only output languages by default', () => {
      const store = useSettingsStore();
      store.settings.inputLanguage = 'de-DE';
      store.settings.outputLanguages = ['en'];
      // Default showInputLanguage is false

      const validation = useLanguageValidation();

      expect(validation.presentationLanguages.value).toEqual([
        { code: 'en', isInput: false },
      ]);
    });
  });

  describe('hasTooManyLanguagesForSplit', () => {
    it('should return false for 6 or fewer languages in split mode', () => {
      const store = useSettingsStore();
      store.settings.inputLanguage = 'de-DE';
      store.settings.outputLanguages = ['en', 'es', 'fr', 'it', 'pt']; // 6 total with input
      store.settings.presentation.mode = 'split';
      store.settings.presentation.showInputLanguage = true;

      const validation = useLanguageValidation();

      expect(validation.hasTooManyLanguagesForSplit.value).toBe(false);
    });

    it('should return true for more than 6 languages in split mode', () => {
      const store = useSettingsStore();
      store.settings.inputLanguage = 'de-DE';
      store.settings.outputLanguages = ['en', 'es', 'fr', 'it', 'pt', 'nl']; // 7 total with input
      store.settings.presentation.mode = 'split';
      store.settings.presentation.showInputLanguage = true;

      const validation = useLanguageValidation();

      expect(validation.hasTooManyLanguagesForSplit.value).toBe(true);
    });

    it('should return false for any number of languages in multi-window mode', () => {
      const store = useSettingsStore();
      store.settings.inputLanguage = 'de-DE';
      store.settings.outputLanguages = [
        'en',
        'es',
        'fr',
        'it',
        'pt',
        'nl',
        'sv',
      ]; // 8 total
      store.settings.presentation.mode = 'multi-window';
      store.settings.presentation.showInputLanguage = true;

      const validation = useLanguageValidation();

      expect(validation.hasTooManyLanguagesForSplit.value).toBe(false);
    });

    it('should count only presentation languages, not all languages', () => {
      const store = useSettingsStore();
      store.settings.inputLanguage = 'de-DE';
      store.settings.outputLanguages = ['en', 'es', 'fr', 'it', 'pt', 'nl']; // 6 output languages
      store.settings.presentation.mode = 'split';
      store.settings.presentation.showInputLanguage = false; // Input not shown

      const validation = useLanguageValidation();

      // Only 6 languages in presentation (input excluded)
      expect(validation.hasTooManyLanguagesForSplit.value).toBe(false);
    });

    it('should handle exactly 7 languages as too many', () => {
      const store = useSettingsStore();
      store.settings.inputLanguage = 'de-DE';
      store.settings.outputLanguages = ['en', 'es', 'fr', 'it', 'pt', 'nl']; // 6 output
      store.settings.presentation.mode = 'split';
      store.settings.presentation.showInputLanguage = true; // 7 total

      const validation = useLanguageValidation();

      expect(validation.hasTooManyLanguagesForSplit.value).toBe(true);
    });
  });

  describe('reactive updates', () => {
    it('should react to settings changes', () => {
      const store = useSettingsStore();
      store.settings.inputLanguage = 'de-DE';
      store.settings.outputLanguages = ['en'];

      const validation = useLanguageValidation();

      expect(validation.hasInvalidLanguages.value).toBe(false);

      // Change to invalid
      store.settings.inputLanguage = 'invalid-XX';

      expect(validation.hasInvalidLanguages.value).toBe(true);
    });

    it('should react to showInputLanguage toggle', () => {
      const store = useSettingsStore();
      store.settings.inputLanguage = 'de-DE';
      store.settings.outputLanguages = ['en'];
      store.settings.presentation.showInputLanguage = false;

      const validation = useLanguageValidation();

      expect(validation.presentationLanguages.value).toHaveLength(1);

      store.settings.presentation.showInputLanguage = true;

      expect(validation.presentationLanguages.value).toHaveLength(2);
    });
  });
});
