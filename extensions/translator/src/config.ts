// Export churchtools KEY for use in other modules
const keyFromImportMeta =
  typeof import.meta !== 'undefined' && (import.meta as any).env
    ? (import.meta as any).env.VITE_KEY
    : undefined;

const keyFromProcess =
  typeof process !== 'undefined' && process.env
    ? process.env.VITE_KEY
    : undefined;

export const KEY = keyFromImportMeta || keyFromProcess || 'translator';

/**
 * Maximum number of finalized paragraphs to keep per language.
 * Applied as sliding window to prevent memory exhaustion and
 * localStorage size issues in long sessions. Both operator and presentation views
 * are limited to this size.
 */
export const PRESENTATION_PARAGRAPH_WINDOW_SIZE = 100;
/**
 * Maximum age for abandoned presentation sessions in localStorage.
 * Sessions older than this will be cleaned up on mount.
 * Default: 24 hours in milliseconds.
 */
export const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;
