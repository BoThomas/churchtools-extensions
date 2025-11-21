export interface TranslationSession {
  id?: number;
  userId: number;
  userEmail: string;
  userName: string;
  startTime: string; // ISO timestamp
  endTime?: string; // ISO timestamp
  durationMinutes?: number; // calculated from start/end
  inputLanguage: string; // e.g., "de-DE"
  outputLanguage: string; // e.g., "en"
  mode: 'presentation' | 'test';
  status: 'running' | 'completed' | 'error';
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
}

export default SessionLogger;
