import { ref, computed } from 'vue';

export interface TranslationState {
  isTestRunning: boolean;
  isLiveTranslationPrepared: boolean;
  isPaused: boolean;
  isLiveTranslating: boolean;
  presentationSessionId: string | null;
  isTestPresentationRunning: boolean;
  presentationWindowsOpenedButNotStarted: boolean;
}

export function useTranslationState() {
  const state = ref<TranslationState>({
    isTestRunning: false,
    isLiveTranslationPrepared: false,
    isPaused: false,
    isLiveTranslating: false,
    presentationSessionId: null,
    isTestPresentationRunning: false,
    presentationWindowsOpenedButNotStarted: false,
  });

  const stateText = computed(() => {
    if (state.value.isPaused) return 'Paused';
    if (state.value.isTestRunning) return 'Testing';
    if (state.value.isLiveTranslationPrepared) {
      if (state.value.isLiveTranslating) return 'Live Translation';
      return 'Live Translation Ready';
    }
    if (state.value.isTestPresentationRunning) {
      if (state.value.presentationWindowsOpenedButNotStarted) {
        return 'Test Presentation Ready';
      }
      return 'Test Presentation';
    }
    return '';
  });

  const statusSeverity = computed(() => {
    if (state.value.isPaused) return 'warn';
    if (
      state.value.isTestRunning ||
      (state.value.isLiveTranslationPrepared &&
        state.value.isLiveTranslating) ||
      (state.value.isTestPresentationRunning &&
        !state.value.presentationWindowsOpenedButNotStarted)
    ) {
      return 'success';
    }
    if (
      state.value.presentationWindowsOpenedButNotStarted ||
      (state.value.isLiveTranslationPrepared && !state.value.isLiveTranslating)
    ) {
      return 'secondary';
    }
    return 'secondary';
  });

  const inputsDisabled = computed(() => {
    return (
      state.value.isTestRunning ||
      state.value.isLiveTranslationPrepared ||
      state.value.isTestPresentationRunning
    );
  });

  const reset = () => {
    state.value = {
      isTestRunning: false,
      isLiveTranslationPrepared: false,
      isPaused: false,
      isLiveTranslating: false,
      presentationSessionId: null,
      isTestPresentationRunning: false,
      presentationWindowsOpenedButNotStarted: false,
    };
  };

  return {
    state,
    stateText,
    statusSeverity,
    inputsDisabled,
    reset,
  };
}
