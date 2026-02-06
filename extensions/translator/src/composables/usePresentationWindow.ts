import { ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import type { TranslatorSettings } from '../types/translator';
import type { LanguageConfig } from '../types/language';
import { SESSION_MAX_AGE_MS } from '../config';

/**
 * Composable for managing presentation windows and localStorage communication
 * Handles window opening, updates, and session management
 */
export function usePresentationWindow() {
  const toast = useToast();

  // Current presentation session ID
  const presentationSessionId = ref<string | null>(null);

  /**
   * Generate unique session ID for presentation isolation
   */
  function generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Update presentation window via localStorage
   */
  function updatePresentationWindow(
    translations: Record<string, string>,
    isLive: boolean,
    finalizedParagraphsByLang: Record<string, string[]>,
  ) {
    if (!presentationSessionId.value) return;

    const data = {
      translations, // All language translations for current text
      isLive,
      finalized: finalizedParagraphsByLang, // All finalized paragraphs per language
      timestamp: Date.now(),
    };
    const key = `translator_presentation_${presentationSessionId.value}`;
    localStorage.setItem(key, JSON.stringify(data));
  }

  /**
   * Clear presentation data in localStorage
   * Used on pause/start to avoid showing stale content
   */
  function clearPresentationWindowStorage() {
    if (!presentationSessionId.value) return;

    const data = {
      translations: {},
      isLive: false,
      finalized: {},
      timestamp: Date.now(),
    };
    const key = `translator_presentation_${presentationSessionId.value}`;
    localStorage.setItem(key, JSON.stringify(data));
  }

  /**
   * Open presentation windows and set up localStorage
   */
  function openPresentationWindows(
    sessionId: string,
    settings: TranslatorSettings,
    presentationLanguages: LanguageConfig[],
    options: {
      isTest: boolean;
      multiWindowSummary: string;
      multiWindowDetail: string;
      singleWindowSummary: string;
      singleWindowDetail: string;
    },
  ) {
    // Save settings to localStorage with session ID
    localStorage.setItem(
      `translator_settings_${sessionId}`,
      JSON.stringify(settings),
    );
    localStorage.removeItem(`translator_paused_${sessionId}`);

    // Store test mode flag so presentation window knows which message to show
    localStorage.setItem(
      `translator_test_mode_${sessionId}`,
      JSON.stringify({ isTest: options.isTest }),
    );

    const baseUrl = `${window.location.origin}${window.location.pathname}`;

    // Open presentation windows based on mode
    if (settings.presentation.mode === 'multi-window') {
      // Open one window per language (including input if enabled)
      for (const lang of presentationLanguages) {
        const url = `${baseUrl}?presentation=true&session=${sessionId}&lang=${encodeURIComponent(lang.code)}`;
        window.open(
          url,
          `_blank_${lang.code}`,
          'toolbar=0,location=0,menubar=0',
        );
      }
      toast.add({
        severity: 'success',
        summary: options.multiWindowSummary,
        detail: options.multiWindowDetail,
        life: 4000,
      });
    } else {
      // Open single window for split-screen mode
      const url = `${baseUrl}?presentation=true&session=${sessionId}`;
      window.open(url, '_blank', 'toolbar=0,location=0,menubar=0');
      toast.add({
        severity: 'success',
        summary: options.singleWindowSummary,
        detail: options.singleWindowDetail,
        life: 4000,
      });
    }

    presentationSessionId.value = sessionId;
  }

  /**
   * Clean up session-based localStorage when stopping
   */
  function cleanupPresentationStorage(sessionId: string | null) {
    if (!sessionId) return;

    localStorage.removeItem(`translator_settings_${sessionId}`);
    localStorage.removeItem(`translator_paused_${sessionId}`);
    localStorage.removeItem(`translator_presentation_${sessionId}`);
    localStorage.removeItem(`translator_test_mode_${sessionId}`);
    localStorage.removeItem(`translator_started_${sessionId}`);
  }

  /**
   * Set paused flag in localStorage
   */
  function setPausedFlag(sessionId: string, isPaused: boolean) {
    if (isPaused) {
      localStorage.setItem(
        `translator_paused_${sessionId}`,
        JSON.stringify({ isPaused: true }),
      );
    } else {
      localStorage.removeItem(`translator_paused_${sessionId}`);
    }
  }

  /**
   * Signal that presentation has started (translation/test generation began)
   * This dismisses the waiting overlay immediately without waiting for first data
   */
  function setPresentationStartedFlag(sessionId: string) {
    localStorage.setItem(
      `translator_started_${sessionId}`,
      JSON.stringify({ started: true, timestamp: Date.now() }),
    );
  }

  /**
   * Reset presentation session
   */
  function resetSession() {
    presentationSessionId.value = null;
  }

  /**
   * Clean up stale presentation sessions from localStorage.
   * Removes any translator_* keys where the session timestamp is older than SESSION_MAX_AGE_MS.
   * Should be called on mount to garbage collect abandoned sessions (e.g., from browser crashes).
   */
  function cleanupStaleSessions() {
    const now = Date.now();
    const keysToRemove: string[] = [];

    // Iterate through all localStorage keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      // Match translator session keys: translator_*_session_{timestamp}_{random}
      const sessionMatch = key.match(/^translator_\w+_session_(\d+)_/);
      if (sessionMatch) {
        const sessionTimestamp = parseInt(sessionMatch[1], 10);
        if (now - sessionTimestamp > SESSION_MAX_AGE_MS) {
          keysToRemove.push(key);
        }
      }
    }

    // Remove stale keys
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }

    if (keysToRemove.length > 0) {
      console.log(
        `[usePresentationWindow] Cleaned up ${keysToRemove.length} stale session keys`,
      );
    }
  }

  return {
    presentationSessionId,
    generateSessionId,
    updatePresentationWindow,
    clearPresentationWindowStorage,
    openPresentationWindows,
    cleanupPresentationStorage,
    setPausedFlag,
    setPresentationStartedFlag,
    resetSession,
    cleanupStaleSessions,
  };
}
