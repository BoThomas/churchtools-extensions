export interface TranslationSession {
  id?: number;
  userId: number;
  userEmail: string;
  userName: string;
  startTime: string; // ISO timestamp
  endTime?: string; // ISO timestamp
  lastHeartbeat?: string; // ISO timestamp - updated every 30s while running
  durationMinutes?: number; // calculated from start/end or lastHeartbeat
  inputLanguage: string; // e.g., "de-DE"
  outputLanguage: string; // e.g., "en"
  mode: 'presentation' | 'test';
  status: 'running' | 'completed' | 'error' | 'abandoned';
}

export interface SessionCreateData {
  userId: number;
  userEmail: string;
  userName: string;
  inputLanguage: string;
  outputLanguage: string;
  mode: 'presentation' | 'test';
}

export class SessionLogger {
  private currentSessionId: number | null = null;

  /**
   * Create a new translation session
   */
  createSession(data: SessionCreateData): TranslationSession {
    const now = new Date();

    const session: TranslationSession = {
      userId: data.userId,
      userEmail: data.userEmail,
      userName: data.userName,
      startTime: now.toISOString(),
      inputLanguage: data.inputLanguage,
      outputLanguage: data.outputLanguage,
      mode: data.mode,
      status: 'running',
    };

    return session;
  }

  /**
   * End the current session
   */
  endSession(
    session: TranslationSession,
    status: 'completed' | 'error' = 'completed',
  ): TranslationSession {
    const now = new Date();
    const startTime = new Date(session.startTime);
    const durationMs = now.getTime() - startTime.getTime();
    const durationMinutes = Math.round(durationMs / 1000 / 60);

    return {
      ...session,
      endTime: now.toISOString(),
      durationMinutes,
      status,
    };
  }

  /**
   * Set the current session ID (after saving to persistence)
   */
  setCurrentSessionId(id: number): void {
    this.currentSessionId = id;
  }

  /**
   * Get the current session ID
   */
  getCurrentSessionId(): number | null {
    return this.currentSessionId;
  }

  /**
   * Update heartbeat timestamp
   */
  updateHeartbeat(session: TranslationSession): TranslationSession {
    return {
      ...session,
      lastHeartbeat: new Date().toISOString(),
    };
  }

  /**
   * Clear the current session
   */
  clearCurrentSession(): void {
    this.currentSessionId = null;
  }

  /**
   * Calculate duration for a session
   */
  calculateDuration(startTime: string, endTime: string): number {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMs = end.getTime() - start.getTime();
    return Math.round(durationMs / 1000 / 60);
  }

  /**
   * Calculate duration from session data (handles abandoned sessions)
   */
  static calculateSessionDuration(session: TranslationSession): number {
    const start = new Date(session.startTime);

    // If completed with endTime, use it
    if (session.status === 'completed' && session.endTime) {
      const end = new Date(session.endTime);
      return Math.round((end.getTime() - start.getTime()) / 1000 / 60);
    }

    // If has lastHeartbeat, use it (for running or abandoned sessions)
    if (session.lastHeartbeat) {
      const lastBeat = new Date(session.lastHeartbeat);
      return Math.round((lastBeat.getTime() - start.getTime()) / 1000 / 60);
    }

    // Fallback: return 0 for sessions without any end marker
    return 0;
  }

  /**
   * Check if a session is abandoned (no heartbeat in last 5 minutes)
   */
  static isSessionAbandoned(session: TranslationSession): boolean {
    if (session.status !== 'running') return false;
    if (!session.lastHeartbeat) return false;

    const lastBeat = new Date(session.lastHeartbeat);
    const now = new Date();
    const minutesSinceHeartbeat =
      (now.getTime() - lastBeat.getTime()) / 1000 / 60;

    return minutesSinceHeartbeat > 5;
  }
}

export default SessionLogger;
