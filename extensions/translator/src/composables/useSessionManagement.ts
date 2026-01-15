import { ref, onMounted, onBeforeUnmount } from 'vue';
import {
  SessionLogger,
  type TranslationSession,
} from '../services/sessionLogger';
import type { Person } from '@churchtools-extensions/ct-utils/ct-types';
import { useSessionStore } from '../stores/session';
import { useSettingsStore } from '../stores/settings';

/**
 * Composable for managing session tracking and heartbeat updates
 * Handles session lifecycle, heartbeat intervals, and cleanup
 */
export function useSessionManagement(user: { value: Person | null }) {
  const sessionStore = useSessionStore();
  const settingsStore = useSettingsStore();
  const sessionLogger = new SessionLogger();

  const currentSession = ref<TranslationSession | null>(null);
  let heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Start sending heartbeat updates every 30 seconds
   */
  function startHeartbeat() {
    stopHeartbeat(); // Clear any existing interval

    heartbeatInterval = setInterval(() => {
      const sessionId = sessionLogger.getCurrentSessionId();
      if (sessionId) {
        // Non-blocking heartbeat update
        sessionStore.updateHeartbeat(sessionId).catch(() => {
          // Silent fail - already logged in store
        });
      }
    }, 30000); // 30 seconds
  }

  /**
   * Stop heartbeat updates
   */
  function stopHeartbeat() {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
  }

  /**
   * Start a new session
   */
  async function startSession(
    mode: 'test' | 'presentation',
    inputLanguage: string,
    outputLanguages: string[],
  ) {
    if (!user.value) return null;

    const session = sessionLogger.createSession({
      userId: user.value.id!,
      userEmail: user.value.email ?? '',
      userName: `${user.value.firstName} ${user.value.lastName}`,
      inputLanguage,
      outputLanguages,
      mode,
    });

    // Check if streaming is enabled
    const streamingEnabled =
      settingsStore.settings.outputModes?.streamedSessionEnabled;
    const streamingConfig = streamingEnabled
      ? {
          displayName: settingsStore.settings.session?.displayName,
          maxClients: settingsStore.settings.session?.maxClients,
          hidden: settingsStore.settings.session?.hidden ?? false,
        }
      : undefined;

    const sessionId = await sessionStore.startSession(session, streamingConfig);

    if (sessionId) {
      sessionLogger.setCurrentSessionId(sessionId);
      currentSession.value = session;
      startHeartbeat();
    }

    return sessionId;
  }

  /**
   * End current session
   */
  async function endSession(status: 'completed' | 'error' = 'completed') {
    const sessionId = sessionLogger.getCurrentSessionId();
    if (sessionId && currentSession.value) {
      try {
        const endedSession = sessionLogger.endSession(
          currentSession.value,
          status,
        );
        await sessionStore.endSession(sessionId, endedSession);
      } catch (e) {
        console.error('Failed to end session:', e);
      } finally {
        sessionLogger.clearCurrentSession();
        currentSession.value = null;
      }
    }
    stopHeartbeat();
  }

  /**
   * Pause current session
   */
  function pauseSession() {
    const sessionId = sessionLogger.getCurrentSessionId();
    if (sessionId) {
      stopHeartbeat();
      sessionStore.pauseSession(sessionId);
    }
  }

  /**
   * Resume current session
   */
  function resumeSession() {
    const sessionId = sessionLogger.getCurrentSessionId();
    if (sessionId) {
      sessionStore.resumeSession(sessionId);
      startHeartbeat();
    }
  }

  /**
   * Handle window close - try to end session gracefully
   */
  function handleWindowClose() {
    const sessionId = sessionLogger.getCurrentSessionId();
    if (sessionId && currentSession.value) {
      try {
        // Attempt to end session, but browser may close before async call completes
        // Sessions without endTime will be detected as "abandoned" based on lastHeartbeat
        const endedSession = sessionLogger.endSession(
          currentSession.value,
          'completed',
        );
        // Note: This async call will likely not complete before page unload
        // The session will be marked as abandoned (status='running' with old lastHeartbeat)
        sessionStore.endSession(sessionId, endedSession);
      } catch (e) {
        // Silent fail on unload
        console.warn('Could not end session on close:', e);
      }
    }
  }

  // Setup window close handler
  onMounted(() => {
    window.addEventListener('beforeunload', handleWindowClose);
  });

  onBeforeUnmount(() => {
    window.removeEventListener('beforeunload', handleWindowClose);
    stopHeartbeat();
  });

  return {
    currentSession,
    sessionLogger,
    startSession,
    endSession,
    pauseSession,
    resumeSession,
    startHeartbeat,
    stopHeartbeat,
  };
}
