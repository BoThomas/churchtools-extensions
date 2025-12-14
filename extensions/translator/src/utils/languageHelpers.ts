import translationOptions from '../translation-options.json';

/**
 * Get the display name (with flag emoji) for a language code
 * @param code - Language code (e.g., 'de-DE', 'en')
 * @param type - Whether to look in input or output languages (defaults to checking both)
 * @returns The display name with flag emoji, or the code if not found
 */
export function getLanguageDisplayName(
  code: string,
  type?: 'input' | 'output',
): string {
  if (!code) return '';

  let displayName = '';

  // Check input languages
  if (type !== 'output') {
    const inputLang = translationOptions.inputLanguages.find(
      (lang) => lang.code === code,
    );
    if (inputLang) displayName = inputLang.name;
  }

  // Check output languages
  if (!displayName && type !== 'input') {
    const outputLang = translationOptions.outputLanguages.find(
      (lang) => lang.code === code,
    );
    if (outputLang) displayName = outputLang.name;
  }

  if (displayName) {
    return displayName;
  }

  // Fallback to code if not found
  return code;
}
