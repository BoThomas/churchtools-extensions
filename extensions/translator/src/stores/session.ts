import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { CategoryValue } from '@churchtools-extensions/persistance';
import {
  SessionLogger,
  type TranslationSession,
} from '../services/sessionLogger';
import type {
  StreamedSessionMetadata,
  ActiveSessionReference,
} from '../types/streamedSession';
import type { TranslatorSettings } from '../types/translator';
import { generateSessionDisplayName } from '../types/streamedSession';
import { useWebPubSubStore } from './webpubsub';
import {
  ensureTranslatorPersistance,
  getSessionsCategory,
  getStreamedSessionsCategory,
} from '../services/translatorPersistance';

export const useSessionStore = defineStore('session', () => {
  const webPubSubStore = useWebPubSubStore();

  // Current session (tracked for optimistic updates)
  const currentSessionId = ref<number | null>(null);
  const currentSession = ref<TranslationSession | null>(null);

  // Loading states
  const sessionsSaving = ref(false);

  // Error handling
  const error = ref<string | null>(null);

  async function ensureCategoriesReady() {
    await ensureTranslatorPersistance();
  }

  /**
   * Start a new translation session
   * If streaming is enabled, also creates streamed session metadata for reader discovery
   * @param sessionData - Full session data for 'sessions' category
   * @param settings - Full settings snapshot for crash recovery
   * @param streamingConfig - Optional streaming configuration (creates entry in 'streamed-sessions')
   */
  async function startSession(
    sessionData: TranslationSession,
    settings: TranslatorSettings,
    streamingConfig?: {
      displayName?: string;
      maxClients?: number;
      hidden?: boolean;
    },
  ) {
    sessionsSaving.value = true;
    error.value = null;

    try {
      await ensureCategoriesReady();
      const sessionsCategory = await getSessionsCategory();
      const streamedSessionsCategory = await getStreamedSessionsCategory();
      if (!sessionsCategory)
        throw new Error('Sessions category not initialized');

      // 1. Create full session in 'sessions' category
      const { id } = await sessionsCategory.create(sessionData);
      currentSessionId.value = id;
      currentSession.value = { ...sessionData, id };

      // 2. If streaming enabled and not hidden, create streamed session metadata
      if (
        streamingConfig &&
        !streamingConfig.hidden &&
        streamedSessionsCategory
      ) {
        const roomId = crypto.randomUUID();

        // Auto-generate display name if not provided
        const displayName = streamingConfig.displayName?.trim()
          ? streamingConfig.displayName.trim()
          : generateSessionDisplayName(id);

        // Ensure WebPubSub room is available before exposing the session
        try {
          await webPubSubStore.openRoom(roomId, sessionData.userId);
        } catch (roomError: any) {
          await sessionsCategory.delete(id);
          throw new Error(
            `Failed to connect to WebPubSub: ${roomError?.message ?? roomError}`,
          );
        }

        const streamedMetadata: StreamedSessionMetadata = {
          sessionId: id,
          webPubSubRoomId: roomId,
          displayName: displayName,
          inputLanguage: sessionData.inputLanguage,
          outputLanguages: sessionData.outputLanguages || [],
          operatorName: sessionData.userName,
          startTime: sessionData.startTime,
          lastHeartbeat: sessionData.startTime, // Initialize with startTime
          maxClients: streamingConfig.maxClients,
          currentClients: 0,
          status: 'running',
        };

        try {
          await streamedSessionsCategory.create(streamedMetadata);

          // Store reference in localStorage for crash recovery
          const sessionRef: ActiveSessionReference = {
            sessionId: id,
            webPubSubRoomId: roomId,
            startTime: sessionData.startTime,
            settings,
          };
          localStorage.setItem(
            'translator_active_session',
            JSON.stringify(sessionRef),
          );
        } catch (streamError: any) {
          // Cleanup: close the room we opened
          await webPubSubStore.closeRoom(roomId);
          // Rollback: delete the main session we just created
          await sessionsCategory.delete(id);
          throw new Error(
            `Failed to create streaming session: ${streamError.message}`,
          );
        }
      }

      return id;
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to start session';
      console.error('startSession failed', e);
      throw e;
    } finally {
      sessionsSaving.value = false;
    }
  }

  /**
   * End the current session
   * Also removes from streamed-sessions if it was streaming
   */
  async function endSession(
    sessionId: number,
    updates: Partial<TranslationSession>,
    cachedSession?: CategoryValue<TranslationSession>,
  ) {
    sessionsSaving.value = true;
    error.value = null;
    try {
      await ensureCategoriesReady();
      const sessionsCategory = await getSessionsCategory();
      const streamedSessionsCategory = await getStreamedSessionsCategory();
      if (!sessionsCategory) return;

      // 1. Update full session in 'sessions' category
      // Optimistic update: use cached session if available
      const existing = cachedSession;

      if (existing) {
        // Cache hit - merge and update directly
        const merged: TranslationSession = {
          ...existing.value,
          ...updates,
        };

        // Calculate duration if endTime is provided
        if (merged.endTime && merged.startTime) {
          const start = new Date(merged.startTime).getTime();
          const end = new Date(merged.endTime).getTime();
          merged.durationMinutes = Math.round((end - start) / (1000 * 60));
        }

        await sessionsCategory.update(sessionId, merged);
      } else {
        // Cache miss - check if updates contain all required fields
        const hasRequiredFields =
          updates.userId &&
          updates.startTime &&
          updates.inputLanguage &&
          updates.outputLanguage &&
          updates.mode &&
          updates.status;

        if (hasRequiredFields) {
          // Calculate duration if endTime is provided
          const merged = updates as TranslationSession;
          if (merged.endTime && merged.startTime) {
            const start = new Date(merged.startTime).getTime();
            const end = new Date(merged.endTime).getTime();
            merged.durationMinutes = Math.round((end - start) / (1000 * 60));
          }

          // Updates are complete, use optimistic update
          await sessionsCategory.update(sessionId, merged);
        } else {
          // Need to fetch to get complete session data
          const allSessions = await sessionsCategory.list<TranslationSession>();
          const found = allSessions.find(
            (s: CategoryValue<TranslationSession>) => s.id === sessionId,
          );
          if (!found) throw new Error('Session not found');

          const merged: TranslationSession = {
            ...found.value,
            ...updates,
          };

          // Calculate duration if endTime is provided
          if (merged.endTime && merged.startTime) {
            const start = new Date(merged.startTime).getTime();
            const end = new Date(merged.endTime).getTime();
            merged.durationMinutes = Math.round((end - start) / (1000 * 60));
          }

          await sessionsCategory.update(sessionId, merged);
        }
      }

      // 2. Remove from streamed-sessions category if it exists
      if (streamedSessionsCategory) {
        try {
          const streamedSessions =
            await streamedSessionsCategory.list<StreamedSessionMetadata>({
              useCache: { maxAgeMs: 10000 },
            });
          const streamedSession = streamedSessions.find(
            (s) => s.value.sessionId === sessionId,
          );

          if (streamedSession) {
            // Notify and close WebPubSub room
            await webPubSubStore.closeRoom(
              streamedSession.value.webPubSubRoomId,
            );

            await streamedSessionsCategory.delete(streamedSession.id);
          }
        } catch (e) {
          console.warn('Failed to cleanup streamed session (non-critical):', e);
        }
      }

      // 3. Clear localStorage reference
      localStorage.removeItem('translator_active_session');

      currentSessionId.value = null;
      currentSession.value = null;
    } catch (e: any) {
      error.value = e?.message ?? 'Failed to end session';
      console.error('endSession failed', e);
      throw e;
    } finally {
      sessionsSaving.value = false;
    }
  }

  /**
   * Update session heartbeat (non-blocking, silent errors)
   * Uses optimistic update to avoid fetching all sessions
   * Auto-recovers from abandoned state when heartbeat resumes
   * Also updates heartbeat in streamed session if exists
   */
  async function updateHeartbeat(
    sessionId: number,
    cachedSession?: CategoryValue<TranslationSession>,
  ) {
    // Non-blocking update - don't throw errors to avoid disrupting translation
    try {
      await ensureCategoriesReady();
      const sessionsCategory = await getSessionsCategory();
      const streamedSessionsCategory = await getStreamedSessionsCategory();
      if (!sessionsCategory) return;

      // Optimistic approach: use cached session or current session
      let baseSession: TranslationSession | undefined;

      // Try cache first
      if (cachedSession) {
        baseSession = cachedSession.value;
      } else if (
        currentSession.value &&
        currentSession.value.id === sessionId
      ) {
        // Use tracked current session
        baseSession = currentSession.value;
      }

      if (baseSession) {
        // Use SessionLogger to update heartbeat (handles auto-recovery from abandoned)
        const sessionLogger = new SessionLogger();
        const updated = sessionLogger.updateHeartbeat(baseSession);

        await sessionsCategory.update(sessionId, updated);

        // Update current session in memory if it matches
        if (currentSession.value && currentSession.value.id === sessionId) {
          currentSession.value = updated;
        }
      } else {
        // Fallback: fetch if we have no session data (shouldn't happen in normal flow)
        console.warn(
          'Heartbeat update without cached session data, fetching...',
        );
        const allSessions = await sessionsCategory.list<TranslationSession>();
        const found = allSessions.find(
          (s: CategoryValue<TranslationSession>) => s.id === sessionId,
        );
        if (!found) return;

        const sessionLogger = new SessionLogger();
        const updated = sessionLogger.updateHeartbeat(found.value);
        await sessionsCategory.update(sessionId, updated);
      }

      // Update heartbeat in streamed session (if exists)
      if (streamedSessionsCategory) {
        try {
          const streamedSessions =
            await streamedSessionsCategory.list<StreamedSessionMetadata>({
              useCache: { maxAgeMs: 10000 },
            });
          const streamedSession = streamedSessions.find(
            (s) => s.value.sessionId === sessionId,
          );

          if (streamedSession) {
            await streamedSessionsCategory.update(streamedSession.id, {
              ...streamedSession.value,
              lastHeartbeat: new Date().toISOString(),
            });
          }
        } catch (e) {
          console.warn(
            'Failed to update streamed session heartbeat (non-critical):',
            e,
          );
        }
      }
    } catch (e) {
      // Silent fail - log but don't disrupt translation
      console.warn('Failed to update heartbeat (non-critical):', e);
    }
  }

  /**
   * Pause the current session (stops accumulating active time)
   * Also updates status in streamed session if exists
   */
  async function pauseSession(sessionId: number) {
    try {
      await ensureCategoriesReady();
      const sessionsCategory = await getSessionsCategory();
      const streamedSessionsCategory = await getStreamedSessionsCategory();
      if (!sessionsCategory) return;

      if (currentSession.value && currentSession.value.id === sessionId) {
        const sessionLogger = new SessionLogger();
        const updated = sessionLogger.pauseSession(currentSession.value);
        await sessionsCategory.update(sessionId, updated);
        currentSession.value = updated;
      }

      // Update streamed session status
      if (streamedSessionsCategory) {
        const streamedSessions =
          await streamedSessionsCategory.list<StreamedSessionMetadata>({
            useCache: { maxAgeMs: 10000 },
          });
        const streamedSession = streamedSessions.find(
          (s) => s.value.sessionId === sessionId,
        );

        if (streamedSession) {
          await streamedSessionsCategory.update(streamedSession.id, {
            ...streamedSession.value,
            status: 'paused',
          });
        }
      }
    } catch (e) {
      console.warn('Failed to pause session (non-critical):', e);
    }
  }

  /**
   * Resume the current session (starts accumulating active time again)
   * Also updates status and heartbeat in streamed session if exists
   */
  async function resumeSession(sessionId: number) {
    try {
      await ensureCategoriesReady();
      const sessionsCategory = await getSessionsCategory();
      const streamedSessionsCategory = await getStreamedSessionsCategory();
      if (!sessionsCategory) return;

      if (currentSession.value && currentSession.value.id === sessionId) {
        const sessionLogger = new SessionLogger();
        const updated = sessionLogger.resumeSession(currentSession.value);
        await sessionsCategory.update(sessionId, updated);
        currentSession.value = updated;
      }

      // Update streamed session status and heartbeat
      if (streamedSessionsCategory) {
        const streamedSessions =
          await streamedSessionsCategory.list<StreamedSessionMetadata>({
            useCache: { maxAgeMs: 10000 },
          });
        const streamedSession = streamedSessions.find(
          (s) => s.value.sessionId === sessionId,
        );

        if (streamedSession) {
          await streamedSessionsCategory.update(streamedSession.id, {
            ...streamedSession.value,
            status: 'running',
            lastHeartbeat: new Date().toISOString(),
          });
        }
      }
    } catch (e) {
      console.warn('Failed to resume session (non-critical):', e);
    }
  }

  /**
   * Check localStorage for active session reference
   * Returns session data if found and still active, null otherwise
   */
  async function checkForActiveSession(): Promise<{
    session: TranslationSession;
    reference: ActiveSessionReference;
  } | null> {
    try {
      const refString = localStorage.getItem('translator_active_session');
      if (!refString) return null;

      const ref = JSON.parse(refString) as ActiveSessionReference;

      // Check if session still exists and is running
      await ensureCategoriesReady();
      const sessionsCategory = await getSessionsCategory();
      if (!sessionsCategory) return null;

      const sessionWrapper = await sessionsCategory.getById(ref.sessionId);
      if (!sessionWrapper) {
        // Session doesn't exist, cleanup localStorage
        localStorage.removeItem('translator_active_session');
        return null;
      }

      const session = sessionWrapper.value;

      if (session.status !== 'running' && session.status !== 'paused') {
        // Session already ended, cleanup localStorage
        localStorage.removeItem('translator_active_session');
        return null;
      }

      return { session, reference: ref };
    } catch (e) {
      console.error('Failed to check for active session:', e);
      return null;
    }
  }

  /**
   * Resume a session after browser refresh/crash
   * Updates heartbeat immediately, pauses session, and returns settings for UI restoration
   * @returns The session settings stored in localStorage for UI restoration
   */
  async function resumeSessionFromCrash(
    sessionId: number,
    status: 'running' | 'paused' | 'completed' | 'error' | 'abandoned',
    cachedSession?: CategoryValue<TranslationSession>,
  ): Promise<{
    settings: ActiveSessionReference['settings'];
    session: TranslationSession;
  }> {
    try {
      // Get the stored session reference with settings
      const refString = localStorage.getItem('translator_active_session');
      if (!refString) {
        throw new Error('No active session found in localStorage');
      }
      const ref = JSON.parse(refString) as ActiveSessionReference;

      let sessionData: TranslationSession | null = cachedSession?.value ?? null;
      if (!sessionData) {
        await ensureCategoriesReady();
        const sessionsCategory = await getSessionsCategory();
        if (!sessionsCategory) {
          throw new Error('Sessions category not initialized');
        }
        const sessionWrapper = await sessionsCategory.getById(sessionId);
        if (!sessionWrapper) {
          throw new Error('Session not found');
        }
        sessionData = sessionWrapper.value;
      }

      // Immediately update heartbeat
      await updateHeartbeat(sessionId, cachedSession);

      // update session to paused if its not already
      if (status !== 'paused') await pauseSession(sessionId);

      // Reconnect to WebPubSub room if this is a streamed session
      if (ref.settings.outputModes?.streamedSessionEnabled) {
        try {
          await webPubSubStore.openRoom(
            ref.webPubSubRoomId,
            cachedSession?.value.userId || 0,
          );
        } catch (e) {
          console.warn('Failed to reconnect to WebPubSub room:', e);
        }
      }

      console.log(`Resumed session ${sessionId} after crash recovery`);

      // Return settings and session data for UI restoration
      return { settings: ref.settings, session: sessionData };
    } catch (e) {
      console.error('Failed to resume session from crash:', e);
      throw e;
    }
  }

  return {
    // State
    currentSessionId,
    currentSession,
    sessionsSaving,
    error,

    // Actions
    startSession,
    endSession,
    updateHeartbeat,
    pauseSession,
    resumeSession,
    checkForActiveSession,
    resumeSessionFromCrash,
  };
});
