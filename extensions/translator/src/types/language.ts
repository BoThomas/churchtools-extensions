/**
 * Shared language-related type definitions
 */

/**
 * Language configuration with code and input/output flag
 * Used for managing language selections in translation flows
 */
export type LanguageConfig = {
  code: string;
  isInput: boolean;
};
