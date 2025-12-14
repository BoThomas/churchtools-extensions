import { describe, it, expect } from 'vitest';
import { getLanguageDisplayName } from './languageHelpers';

describe('languageHelpers', () => {
  describe('getLanguageDisplayName', () => {
    it('should return display name for valid input language code', () => {
      const displayName = getLanguageDisplayName('de-DE', 'input');

      expect(displayName).toBe('🇩🇪 German (Germany)');
    });

    it('should return display name for valid output language code', () => {
      const displayName = getLanguageDisplayName('en', 'output');

      expect(displayName).toBe('🇬🇧 English');
    });

    it('should check input languages first when no type specified', () => {
      const displayName = getLanguageDisplayName('de-DE');

      expect(displayName).toBe('🇩🇪 German (Germany)');
    });

    it('should fallback to output languages when not found in input', () => {
      const displayName = getLanguageDisplayName('es');

      expect(displayName).toBe('🇪🇸 Spanish');
    });

    it('should return code itself when language not found', () => {
      const displayName = getLanguageDisplayName('xx-XX');

      expect(displayName).toBe('xx-XX');
    });

    it('should return empty string for empty code', () => {
      const displayName = getLanguageDisplayName('');

      expect(displayName).toBe('');
    });

    it('should handle multiple output languages', () => {
      const names = ['en', 'de', 'es', 'fr'].map((code) =>
        getLanguageDisplayName(code, 'output'),
      );

      expect(names).toEqual([
        '🇬🇧 English',
        '🇩🇪 German',
        '🇪🇸 Spanish',
        '🇫🇷 French',
      ]);
    });

    it('should only check input languages when type is input', () => {
      // 'en' exists in output languages but not input
      const displayName = getLanguageDisplayName('en', 'input');

      expect(displayName).toBe('en'); // Should fallback to code
    });

    it('should only check output languages when type is output', () => {
      // 'de-DE' exists in input languages but not output
      const displayName = getLanguageDisplayName('de-DE', 'output');

      expect(displayName).toBe('de-DE'); // Should fallback to code
    });

    it('should handle en-GB input language', () => {
      const displayName = getLanguageDisplayName('en-GB', 'input');

      expect(displayName).toBe('🇬🇧 English (United Kingdom)');
    });

    it('should handle en-US input language', () => {
      const displayName = getLanguageDisplayName('en-US', 'input');

      expect(displayName).toBe('🇺🇸 English (United States)');
    });
  });
});
