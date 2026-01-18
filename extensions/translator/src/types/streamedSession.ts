/**
 * Streamed session metadata for reader discovery
 * Stored in 'streamed-sessions' KV category with reader read permissions
 */
export type SessionStatus = 'running' | 'paused';

export type StreamedSessionMetadata = {
  sessionId: number; // Reference to full session in 'sessions' category
  webPubSubRoomId: string; // UUID v4 - join code for WebPubSub room
  displayName: string; // Custom name from settings or auto-generated
  inputLanguage: string; // e.g., "de-DE"
  outputLanguages: string[]; // e.g., ["en", "es"]
  operatorName: string; // Display name of operator
  startTime: string; // ISO timestamp
  lastHeartbeat: string; // ISO timestamp - for stale detection
  maxClients?: number; // undefined = unlimited
  currentClients: number; // Connected reader count (updated via WebPubSub events later)
  status: SessionStatus; // Active session states only
  isTestSession?: boolean;
};

export type SessionMessageType =
  | 'translation-live'
  | 'translation-final'
  | 'session-ended'
  | 'system';

export type SessionTranslationPayload = {
  translations: Record<string, string>;
  original?: string;
  isLive: boolean;
  timestamp: string;
};

export type SessionSystemPayload = {
  message: string;
  timestamp: string;
};

export type StreamedSessionMessage = {
  type: SessionMessageType;
  payload: SessionTranslationPayload | SessionSystemPayload;
  sessionId?: number;
};

/**
 * Reference to active session stored in localStorage for crash recovery
 * Key: 'translator_active_session'
 */
export type ActiveSessionReference = {
  sessionId: number;
  webPubSubRoomId: string;
  startTime: string;
};

/**
 * Format date for session display name: DD.MM.YYYY
 */
export function formatSessionDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
}

/**
 * Generate default display name for session
 * Format: "Translation Session #[id], DD.MM.YYYY"
 */
export function generateSessionDisplayName(sessionId: number): string {
  return `Translation Session #${sessionId}, ${formatSessionDate(new Date())}`;
}
