import { ref, computed } from 'vue';

export interface TranslationState {
  isTestRunning: boolean;
  isPresentationRunning: boolean;
  isPaused: boolean;
  isRecordingStarted: boolean;
  presentationSessionId: string | null;
  isTestPresentationRunning: boolean;
  presentationWindowsOpenedButNotStarted: boolean;
}

export function useTranslationState() {
  const state = ref<TranslationState>({
    isTestRunning: false,
    isPresentationRunning: false,
    isPaused: false,
    isRecordingStarted: false,
    presentationSessionId: null,
    isTestPresentationRunning: false,
    presentationWindowsOpenedButNotStarted: false,
  });

  const stateText = computed(() => {
    if (state.value.isPaused) return 'Paused';
    if (state.value.isTestRunning) return 'Testing';
    if (state.value.isPresentationRunning) {
      if (state.value.isRecordingStarted) return 'Presenting';
      return 'Presentation Ready';
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
      (state.value.isPresentationRunning && state.value.isRecordingStarted) ||
      (state.value.isTestPresentationRunning &&
        !state.value.presentationWindowsOpenedButNotStarted)
    ) {
      return 'success';
    }
    if (
      state.value.presentationWindowsOpenedButNotStarted ||
      (state.value.isPresentationRunning && !state.value.isRecordingStarted)
    ) {
      return 'secondary';
    }
    return 'secondary';
  });

  const inputsDisabled = computed(() => {
    return (
      state.value.isTestRunning ||
      state.value.isPresentationRunning ||
      state.value.isTestPresentationRunning
    );
  });

  const reset = () => {
    state.value = {
      isTestRunning: false,
      isPresentationRunning: false,
      isPaused: false,
      isRecordingStarted: false,
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
