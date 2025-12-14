import { ref } from 'vue';
import { useToast } from 'primevue/usetoast';
import type { TranslatorSettings } from '../stores/translator';
import type { LanguageConfig } from '../types/language';

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
   * Reset presentation session
   */
  function resetSession() {
    presentationSessionId.value = null;
  }

  return {
    presentationSessionId,
    generateSessionId,
    updatePresentationWindow,
    clearPresentationWindowStorage,
    openPresentationWindows,
    cleanupPresentationStorage,
    setPausedFlag,
    resetSession,
  };
}
