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
