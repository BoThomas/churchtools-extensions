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
export const PRESENTATION_PARAGRAPH_WINDOW_SIZE = 10;
