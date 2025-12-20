<template>
  <div class="space-y-6">
    <Message
      v-if="!hasApiCredentials"
      severity="warn"
      :closable="false"
      icon="pi pi-exclamation-triangle"
    >
      Please configure your Azure API credentials in the Settings tab first.
    </Message>

    <Message
      v-if="error"
      severity="error"
      :closable="true"
      @close="error = null"
    >
      {{ error }}
    </Message>

    <Message
      v-if="showBrowserWarning"
      severity="warn"
      :closable="true"
      icon="pi pi-exclamation-triangle"
      @close="dismissBrowserWarning"
    >
      <div>
        <p>
          <strong>Browser Compatibility Warning:</strong> This presentation mode
          has only been tested on Chromium-based browsers (Chrome, Edge, Brave,
          ...).
        </p>
        <p class="text-sm">
          You appear to be using a different browser. While it may work, you
          might experience unexpected behavior.
        </p>
      </div>
    </Message>

    <Message
      v-if="shouldShowInvalidLanguageWarning"
      severity="warn"
      :closable="false"
      icon="pi pi-exclamation-triangle"
    >
      <div>
        <p>
          <strong>Invalid Language Configuration:</strong> Either you have no
          input/output language selected, or some selected languages are no
          longer available.
        </p>
        <p class="text-sm">
          This may occur after updating the extension. Please select valid
          languages from the dropdowns below and save your settings.
        </p>
      </div>
    </Message>

    <div v-if="hasApiCredentials" class="space-y-6">
      <!-- Translation Options -->
      <TranslationOptionsSection
        v-model="store.settings"
        :disabled="inputsDisabled"
        :input-language-valid="inputLanguageValid"
        :output-languages-valid="outputLanguagesValid"
        @change="store.markSettingsChanged()"
      />

      <!-- Presentation Options -->
      <PresentationOptionsSection
        v-model="store.settings"
        :disabled="inputsDisabled"
        :presentation-languages-count="presentationLanguages.length"
        @change="store.markSettingsChanged()"
      />

      <!-- Controls -->
      <TranslationControlPanel
        :is-test-running="state.isTestRunning"
        :is-presentation-running="state.isPresentationRunning"
        :is-test-presentation-running="state.isTestPresentationRunning"
        :is-paused="state.isPaused"
        :is-recording-started="state.isRecordingStarted"
        :presentation-windows-opened-but-not-started="
          state.presentationWindowsOpenedButNotStarted
        "
        :state-text="stateText"
        :status-severity="statusSeverity"
        :presentation-mode="store.settings.presentation.mode"
        :show-input-language="store.settings.presentation.showInputLanguage"
        :presentation-languages-count="presentationLanguages.length"
        :output-languages-count="store.settings.outputLanguages.length"
        :has-too-many-languages-for-split="hasTooManyLanguagesForSplit"
        :selected-variant-id="selectedVariantForDisplay"
        :setting-variants="store.settingVariants"
        :has-unsaved-changes="store.hasUnsavedChanges"
        :settings-saving="store.settingsSaving"
        :is-default-variant-selected="isDefaultVariantSelected"
        :has-invalid-languages="hasInvalidLanguages"
        :inputs-disabled="inputsDisabled"
        @start-test="startTest"
        @start-test-presentation="startTestPresentation"
        @start-presentation="startPresentation"
        @start-recording="startRecording"
        @start-test-generation="startTestGeneration"
        @pause-or-resume="pauseOrResume"
        @stop="stop"
        @variant-change="onVariantChange"
        @confirm-delete-variant="confirmDeleteVariant"
        @save-current-variant="saveCurrentVariant"
        @prompt-save-as-new-variant="promptSaveAsNewVariant"
      />

      <!-- Test Mode Output -->
      <TestOutputDisplay
        ref="testOutputDisplay"
        :is-test-running="state.isTestRunning"
        :languages="operatorLanguages"
        :finalized-paragraphs-by-lang="finalizedParagraphsByLang"
        :current-live-translation-by-lang="currentLiveTranslationByLang"
      />
    </div>
  </div>

  <!-- Save As Dialog -->
  <Dialog
    v-model:visible="saveAsDialogVisible"
    header="Save As New Variant"
    :modal="true"
    :closable="true"
    :style="{ width: '450px' }"
    data-testid="dialog-save-as-variant"
  >
    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-2">
        <label for="variant-name" class="font-medium text-sm"
          >Variant Name</label
        >
        <InputText
          id="variant-name"
          v-model="newVariantName"
          placeholder="Enter variant name"
          @keyup.enter="saveAsNewVariant"
          autofocus
          data-testid="input-variant-name"
        />
      </div>
    </div>
    <template #footer>
      <div class="flex justify-end gap-2">
        <Button
          label="Cancel"
          severity="secondary"
          outlined
          @click="saveAsDialogVisible = false"
          data-testid="button-cancel-save-as"
        />
        <Button
          label="Save"
          @click="saveAsNewVariant"
          :disabled="!newVariantName.trim()"
          data-testid="button-confirm-save-as"
        />
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useTranslatorStore } from '../stores/translator';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import { CaptioningService } from '../services/captioning';
import type { Person } from '@churchtools-extensions/ct-utils/ct-types';
import { churchtoolsClient } from '@churchtools/churchtools-client';
import { isChromiumBrowser } from '../utils/browserDetection';

import InputText from '@churchtools-extensions/prime-volt/InputText.vue';
import Button from '@churchtools-extensions/prime-volt/Button.vue';
import Message from '@churchtools-extensions/prime-volt/Message.vue';
import Dialog from '@churchtools-extensions/prime-volt/Dialog.vue';
import TranslationOptionsSection from '../components/sections/TranslationOptionsSection.vue';
import PresentationOptionsSection from '../components/sections/PresentationOptionsSection.vue';
import TestOutputDisplay from '../components/sections/TestOutputDisplay.vue';
import TranslationControlPanel from '../components/sections/TranslationControlPanel.vue';
import { useVariantManagement } from '../composables/useVariantManagement';
import { useTranslationState } from '../composables/useTranslationState';
import { useLanguageValidation } from '../composables/useLanguageValidation';
import { useTestOutput } from '../composables/useTestOutput';
import { usePresentationWindow } from '../composables/usePresentationWindow';
import { useSessionManagement } from '../composables/useSessionManagement';
import { useTestPresentation } from '../composables/useTestPresentation';

const store = useTranslatorStore();
const confirm = useConfirm();
const toast = useToast();

const error = ref<string | null>(null);
const user = ref<Person | null>(null);

// Browser compatibility warning
const showBrowserWarning = ref(!isChromiumBrowser());

function dismissBrowserWarning() {
  showBrowserWarning.value = false;
}

// Composables
const { state, stateText, statusSeverity, inputsDisabled } =
  useTranslationState();
const {
  hasInvalidLanguages,
  inputLanguageValid,
  outputLanguagesValid,
  shouldShowInvalidLanguageWarning,
  operatorLanguages,
  presentationLanguages,
  hasTooManyLanguagesForSplit,
} = useLanguageValidation();
const {
  finalizedParagraphsByLang,
  currentLiveTranslationByLang,
  addFinalizedParagraph,
} = useTestOutput();
const {
  presentationSessionId,
  generateSessionId,
  updatePresentationWindow,
  clearPresentationWindowStorage,
  openPresentationWindows,
  cleanupPresentationStorage,
  setPausedFlag,
  setPresentationStartedFlag,
  cleanupStaleSessions,
} = usePresentationWindow();
const {
  startSession: startSessionTracking,
  endSession: endSessionTracking,
  pauseSession,
  resumeSession,
} = useSessionManagement(user);
const { startGeneration, stopGeneration } = useTestPresentation();
const {
  selectedVariantForDisplay,
  saveAsDialogVisible,
  newVariantName,
  isDefaultVariantSelected,
  onVariantChange,
  saveCurrentVariant,
  promptSaveAsNewVariant,
  saveAsNewVariant,
  confirmDeleteVariant,
} = useVariantManagement(user, hasInvalidLanguages);

// Captioning service instance
let captioningService: CaptioningService | null = null;

// Ref for TestOutputDisplay component
const testOutputDisplay = ref<InstanceType<typeof TestOutputDisplay> | null>(
  null,
);

// Computed
const hasApiCredentials = computed(() => {
  return !!store.apiSettings.azureApiKey && !!store.apiSettings.azureRegion;
});

// Load current user
async function loadUser() {
  try {
    user.value = await churchtoolsClient.get<Person>('/whoami');
  } catch (e) {
    console.error('Failed to load user', e);
  }
}

// Translation callbacks
function onTranslating(translations: Record<string, string>, original: string) {
  // Build translations for operator (always includes input)
  const operatorTranslations = { ...translations };
  operatorTranslations[store.settings.inputLanguage] = original;

  // Store full operator view
  currentLiveTranslationByLang.value = operatorTranslations;

  // Scroll test output to bottom
  if (state.value.isTestRunning) {
    scrollTestOutputToBottom();
  }

  // Update presentation window if running (filter for audience)
  if (state.value.isPresentationRunning) {
    // Build translations for presentation (respects checkbox)
    const presentationTranslations = { ...translations };
    if (store.settings.presentation.showInputLanguage) {
      presentationTranslations[store.settings.inputLanguage] = original;
    }
    // Don't send finalized paragraphs during live updates - they haven't changed
    // This reduces redundant localStorage writes
    updatePresentationWindow(presentationTranslations, true, {});
  }
}

function onTranslated(translations: Record<string, string>, original: string) {
  // Add translations to each language's finalized paragraphs (output languages)
  // Uses centralized addFinalizedParagraph which handles sliding window
  for (const [lang, translation] of Object.entries(translations)) {
    addFinalizedParagraph(lang, translation);
  }

  // Always add input language for operator monitoring
  addFinalizedParagraph(store.settings.inputLanguage, original);

  // Clear live translations
  currentLiveTranslationByLang.value = {};

  // Scroll test output to bottom
  if (state.value.isTestRunning) {
    scrollTestOutputToBottom();
  }

  // Update presentation window if running
  if (state.value.isPresentationRunning) {
    // Build translations for presentation (respects checkbox)
    const presentationTranslations = { ...translations };
    if (store.settings.presentation.showInputLanguage) {
      presentationTranslations[store.settings.inputLanguage] = original;
    }
    updatePresentationWindow(
      presentationTranslations,
      false,
      finalizedParagraphsByLang.value,
    );
  }
}

function onError(errorMsg: string) {
  error.value = errorMsg;
  stop();
}

// Scroll test output containers to bottom
function scrollTestOutputToBottom() {
  nextTick(() => {
    // Scroll all language containers via the TestOutputDisplay component
    if (testOutputDisplay.value?.langRefs) {
      Object.values(testOutputDisplay.value.langRefs).forEach((element) => {
        if (element) {
          element.scrollTop = element.scrollHeight;
        }
      });
    }
  });
}

// Start test mode
async function startTest() {
  if (!hasApiCredentials.value) {
    error.value = 'Please configure Azure API credentials first';
    return;
  }

  // Clear previous test output
  finalizedParagraphsByLang.value = {};
  currentLiveTranslationByLang.value = {};

  try {
    // Create captioning service
    captioningService = new CaptioningService(
      {
        inputLanguage: store.settings.inputLanguage,
        outputLanguages: store.settings.outputLanguages,
        profanityOption: store.settings.profanityOption,
        stablePartialResultThreshold:
          store.settings.stablePartialResultThreshold,
        phraseList: store.settings.phraseList,
      },
      {
        onTranslating,
        onTranslated,
        onError,
      },
      store.apiSettings.azureApiKey,
      store.apiSettings.azureRegion,
    );

    captioningService.start();
    state.value.isTestRunning = true;

    // Start session tracking
    await startSessionTracking(
      'test',
      store.settings.inputLanguage,
      store.settings.outputLanguages,
    );

    toast.add({
      severity: 'success',
      summary: 'Test Started',
      detail: 'Speak into your microphone to test translation',
      life: 3000,
    });
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to start test';
    console.error('startTest failed', e);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.value,
      life: 5000,
    });
  }
}

// Start presentation mode
async function startPresentation() {
  if (!hasApiCredentials.value) {
    error.value = 'Please configure Azure API credentials first';
    return;
  }

  // Clear previous output
  finalizedParagraphsByLang.value = {};
  currentLiveTranslationByLang.value = {};

  // Generate unique session ID and clear storage
  const sessionId = generateSessionId();
  presentationSessionId.value = sessionId;
  clearPresentationWindowStorage();

  try {
    state.value.isPresentationRunning = true;
    state.value.presentationWindowsOpenedButNotStarted = true;

    openPresentationWindows(
      sessionId,
      store.settings,
      presentationLanguages.value,
      {
        isTest: false,
        multiWindowSummary: 'Presentation Windows Opened',
        multiWindowDetail: `${presentationLanguages.value.length} windows opened. Click "Start Recording" to begin.`,
        singleWindowSummary: 'Presentation Window Opened',
        singleWindowDetail: 'Click "Start Recording" to begin.',
      },
    );
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to start presentation';
    console.error('startPresentation failed', e);
    state.value.isPresentationRunning = false;
    presentationSessionId.value = null;
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.value,
      life: 5000,
    });
  }
}

// Start test presentation mode with Lorem Ipsum
async function startTestPresentation() {
  // Clear previous output
  finalizedParagraphsByLang.value = {};
  currentLiveTranslationByLang.value = {};

  // Generate unique session ID and clear storage
  const sessionId = generateSessionId();
  presentationSessionId.value = sessionId;
  clearPresentationWindowStorage();

  try {
    state.value.isTestPresentationRunning = true;
    state.value.presentationWindowsOpenedButNotStarted = true;

    openPresentationWindows(
      sessionId,
      store.settings,
      presentationLanguages.value,
      {
        isTest: true,
        multiWindowSummary: 'Test Presentation Windows Opened',
        multiWindowDetail: `${presentationLanguages.value.length} windows opened. Click "Start Test" to begin.`,
        singleWindowSummary: 'Test Presentation Window Opened',
        singleWindowDetail: 'Click "Start Test" to begin.',
      },
    );

    // Initialize finalized paragraphs for all languages (operator gets all)
    for (const lang of operatorLanguages.value) {
      finalizedParagraphsByLang.value[lang.code] = [];
    }
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to start test presentation';
    console.error('startTestPresentation failed', e);
    state.value.isTestPresentationRunning = false;
    presentationSessionId.value = null;
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.value,
      life: 5000,
    });
  }
}

// Start recording for live presentation
async function startRecording() {
  if (!hasApiCredentials.value) {
    error.value = 'Please configure Azure API credentials first';
    return;
  }

  try {
    state.value.isRecordingStarted = true;
    state.value.presentationWindowsOpenedButNotStarted = false;

    // Signal to presentation windows that recording has started
    if (presentationSessionId.value) {
      setPresentationStartedFlag(presentationSessionId.value);
    }

    // Create captioning service
    captioningService = new CaptioningService(
      {
        inputLanguage: store.settings.inputLanguage,
        outputLanguages: store.settings.outputLanguages,
        profanityOption: store.settings.profanityOption,
        stablePartialResultThreshold:
          store.settings.stablePartialResultThreshold,
        phraseList: store.settings.phraseList,
      },
      {
        onTranslating,
        onTranslated,
        onError,
      },
      store.apiSettings.azureApiKey,
      store.apiSettings.azureRegion,
    );

    captioningService.start();

    // Start session tracking
    await startSessionTracking(
      'presentation',
      store.settings.inputLanguage,
      store.settings.outputLanguages,
    );

    toast.add({
      severity: 'success',
      summary: 'Recording Started',
      detail: 'Speak into your microphone',
      life: 3000,
    });
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to start recording';
    console.error('startRecording failed', e);
    state.value.isRecordingStarted = false;
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.value,
      life: 5000,
    });
  }
}

// Start lorem ipsum generation for test presentation
function startTestGeneration() {
  try {
    state.value.isRecordingStarted = true;
    state.value.presentationWindowsOpenedButNotStarted = false;

    // Signal to presentation windows that test generation has started
    if (presentationSessionId.value) {
      setPresentationStartedFlag(presentationSessionId.value);
    }

    // Start generating lorem ipsum content using composable
    // Create reactive ref for isPaused that the interval can check
    const isPausedRef = computed(() => state.value.isPaused);
    startGeneration(
      isPausedRef,
      operatorLanguages.value,
      presentationLanguages.value,
      addFinalizedParagraph,
      currentLiveTranslationByLang,
      (translations, isLive) =>
        updatePresentationWindow(
          translations,
          isLive,
          isLive ? {} : finalizedParagraphsByLang.value,
        ),
    );

    toast.add({
      severity: 'success',
      summary: 'Test Generation Started',
      detail: 'Lorem ipsum content flowing',
      life: 3000,
    });
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to start test generation';
    console.error('startTestGeneration failed', e);
    state.value.isRecordingStarted = false;
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.value,
      life: 5000,
    });
  }
}

// Pause or resume
function pauseOrResume() {
  if (state.value.isPaused) {
    // Resume
    if (state.value.isTestRunning) {
      captioningService?.start();
    }
    if (state.value.isPresentationRunning) {
      // Clear presenter's state to avoid showing stale content when resuming
      finalizedParagraphsByLang.value = {};
      currentLiveTranslationByLang.value = {};
      clearPresentationWindowStorage();
      if (presentationSessionId.value) {
        setPausedFlag(presentationSessionId.value, false);
      }
      captioningService?.start();
    }
    if (state.value.isTestPresentationRunning) {
      // Resume test presentation - just remove paused flag
      if (presentationSessionId.value) {
        setPausedFlag(presentationSessionId.value, false);
      }
    }

    // Resume session tracking
    resumeSession();
  } else {
    // Pause
    if (captioningService) {
      captioningService.stop();
    }
    if (state.value.isPresentationRunning) {
      // Clear presentation window and presenter's state to avoid showing stale content when paused
      finalizedParagraphsByLang.value = {};
      currentLiveTranslationByLang.value = {};
      clearPresentationWindowStorage();
      if (presentationSessionId.value) {
        setPausedFlag(presentationSessionId.value, true);
      }
    }
    if (state.value.isTestPresentationRunning) {
      // Pause test presentation - keep content, just set paused flag
      if (presentationSessionId.value) {
        setPausedFlag(presentationSessionId.value, true);
      }
    }

    // Pause session tracking
    pauseSession();
  }
  state.value.isPaused = !state.value.isPaused;
}

// Stop
async function stop() {
  // Handle pre-start state (windows opened but not started)
  if (state.value.presentationWindowsOpenedButNotStarted) {
    // Clean up session-based localStorage
    if (presentationSessionId.value) {
      cleanupPresentationStorage(presentationSessionId.value);
    }

    state.value.isPresentationRunning = false;
    state.value.isTestPresentationRunning = false;
    state.value.presentationWindowsOpenedButNotStarted = false;
    presentationSessionId.value = null;

    toast.add({
      severity: 'info',
      summary: 'Presentation Aborted',
      detail: 'Windows will close',
      life: 3000,
    });
    return;
  }

  if (state.value.isTestRunning) {
    captioningService?.stop();
    state.value.isTestRunning = false;
    state.value.isPaused = false;

    // End session tracking
    await endSessionTracking();
  }

  if (state.value.isTestPresentationRunning) {
    // Stop lorem ipsum generation
    stopGeneration();

    // Clean up session-based localStorage
    if (presentationSessionId.value) {
      cleanupPresentationStorage(presentationSessionId.value);
    }

    state.value.isTestPresentationRunning = false;
    state.value.isPaused = false;
    state.value.isRecordingStarted = false;
    state.value.presentationWindowsOpenedButNotStarted = false;
    presentationSessionId.value = null;

    toast.add({
      severity: 'info',
      summary: 'Test Presentation Stopped',
      life: 3000,
    });
  }

  if (state.value.isPresentationRunning) {
    confirm.require({
      message: 'Are you sure you want to stop the presentation?',
      header: 'Confirm Stop',
      icon: 'pi pi-exclamation-triangle',
      rejectProps: {
        label: 'Cancel',
        severity: 'secondary',
      },
      acceptProps: {
        label: 'Stop',
      },
      accept: async () => {
        captioningService?.stop();

        // Clean up session-based localStorage
        if (presentationSessionId.value) {
          cleanupPresentationStorage(presentationSessionId.value);
        }

        state.value.isPresentationRunning = false;
        state.value.isPaused = false;
        state.value.isRecordingStarted = false;
        state.value.presentationWindowsOpenedButNotStarted = false;
        presentationSessionId.value = null;

        // End session tracking
        await endSessionTracking();

        toast.add({
          severity: 'info',
          summary: 'Presentation Stopped',
          life: 3000,
        });
      },
    });
  }
}

// Initialize
loadUser();

// Listen for presentation window close via storage events
async function handleStorageEvent(e: StorageEvent) {
  const sessionId = presentationSessionId.value;
  if (!sessionId) return;

  if (e.key === `translator_settings_${sessionId}` && e.newValue === null) {
    // Presentation window was closed, stop everything
    if (state.value.isPresentationRunning) {
      captioningService?.stop();
      state.value.isPresentationRunning = false;
      state.value.isPaused = false;
      state.value.isRecordingStarted = false;
      state.value.presentationWindowsOpenedButNotStarted = false;
      presentationSessionId.value = null;

      // End session tracking
      await endSessionTracking();

      toast.add({
        severity: 'info',
        summary: 'Presentation Stopped',
        detail: 'Presentation window was closed',
        life: 3000,
      });
    } else if (state.value.isTestPresentationRunning) {
      // Test presentation window was closed
      stopGeneration();

      state.value.isTestPresentationRunning = false;
      state.value.isPaused = false;
      state.value.isRecordingStarted = false;
      state.value.presentationWindowsOpenedButNotStarted = false;
      presentationSessionId.value = null;

      toast.add({
        severity: 'info',
        summary: 'Test Presentation Stopped',
        detail: 'Presentation window was closed',
        life: 3000,
      });
    }
  }
}

// Setup storage event listener
onMounted(() => {
  window.addEventListener('storage', handleStorageEvent);
  // Clean up any stale sessions from previous crashes/abandoned sessions
  cleanupStaleSessions();
});

onBeforeUnmount(() => {
  window.removeEventListener('storage', handleStorageEvent);
});
</script>
