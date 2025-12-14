/**
 * Shared language-related type definitions
 */

/**
 * Language configuration with code and input/output flag
 * Used for managing language selections in translation flows
 */
export interface LanguageConfig {
  code: string;
  isInput: boolean;
}
