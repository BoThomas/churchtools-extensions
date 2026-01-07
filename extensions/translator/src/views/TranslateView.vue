<template>
  <div class="space-y-6 max-w-5xl">
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
        :collapsed="translationOptionsCollapsed"
        @toggle="toggleTranslationOptions"
      />

      <!-- Presentation Options -->
      <PresentationOptionsSection
        v-model="store.settings"
        :disabled="inputsDisabled"
        :presentation-languages-count="presentationLanguages.length"
        :collapsed="presentationOptionsCollapsed"
        :toggleable-enabled="
          isWebPubSubEnabled
            ? store.settings.outputModes?.presentationEnabled
            : undefined
        "
        @toggle="togglePresentationOptions"
        @update:enabled="
          (value) => {
            store.settings.outputModes!.presentationEnabled = value;
          }
        "
      />

      <!-- Session Options (WebPubSub) -->
      <SessionOptionsSection
        v-if="isWebPubSubEnabled"
        v-model="store.settings"
        :enabled="store.settings.outputModes?.streamedSessionEnabled ?? false"
        :collapsed="sessionOptionsCollapsed"
        :disabled="inputsDisabled"
        @update:enabled="
          (value) => {
            store.settings.outputModes!.streamedSessionEnabled = value;
          }
        "
        @toggle="toggleSessionOptions"
      />

      <!-- Controls -->
      <TranslationControlPanel
        :is-test-running="state.isTestRunning"
        :is-live-translation-prepared="state.isLiveTranslationPrepared"
        :is-test-presentation-running="state.isTestPresentationRunning"
        :is-paused="state.isPaused"
        :is-live-translating="state.isLiveTranslating"
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
        :is-web-pub-sub-enabled="isWebPubSubEnabled"
        :is-presentation-enabled="
          store.settings.outputModes?.presentationEnabled ?? true
        "
        :is-session-enabled="
          store.settings.outputModes?.streamedSessionEnabled ?? false
        "
        :has-valid-output-mode="hasValidOutputMode"
        :selected-variant-id="selectedVariantForDisplay"
        :setting-variants="store.settingVariants"
        :has-unsaved-changes="store.hasUnsavedChanges"
        :settings-saving="store.settingsSaving"
        :is-default-variant-selected="isDefaultVariantSelected"
        :has-invalid-languages="hasInvalidLanguages"
        :inputs-disabled="inputsDisabled"
        @start-test="startTest"
        @start-test-presentation="startTestPresentation"
        @start-test-session="startTestSession"
        @prepare-live-translation="prepareLiveTranslation"
        @start-translation="startTranslation"
        @start-test-generation="startTestGeneration"
        @pause-or-resume="pauseOrResume"
        @stop="stop"
        @variant-change="onVariantChange"
        @confirm-delete-variant="confirmDeleteVariant"
        @save-current-variant="saveCurrentVariant"
        @prompt-save-as-new-variant="promptSaveAsNewVariant"
      />

      <!-- Operator Preview -->
      <OperatorPreview
        ref="operatorPreview"
        :is-open="!operatorPreviewCollapsed"
        :is-active="isOperatorPreviewActive"
        :languages="operatorLanguages"
        :finalized-paragraphs-by-lang="finalizedParagraphsByLang"
        :current-live-translation-by-lang="currentLiveTranslationByLang"
        @toggle="toggleOperatorPreview"
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
import SessionOptionsSection from '../components/sections/SessionOptionsSection.vue';
import OperatorPreview from '../components/sections/OperatorPreview.vue';
import TranslationControlPanel from '../components/sections/TranslationControlPanel.vue';
import { useVariantManagement } from '../composables/useVariantManagement';
import { useTranslationState } from '../composables/useTranslationState';
import { useLanguageValidation } from '../composables/useLanguageValidation';
import { useOperatorPreview } from '../composables/useOperatorPreview';
import { usePresentationWindow } from '../composables/usePresentationWindow';
import { useSessionManagement } from '../composables/useSessionManagement';
import { useTestPresentation } from '../composables/useTestPresentation';
import { useTestSession } from '../composables/useTestSession';
import { useFieldsetState } from '../composables/useFieldsetState';

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
} = useOperatorPreview();
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
const { startTestSession } = useTestSession();
const {
  translationOptionsCollapsed,
  presentationOptionsCollapsed,
  sessionOptionsCollapsed,
  operatorPreviewCollapsed,
  toggleTranslationOptions,
  togglePresentationOptions,
  toggleSessionOptions,
  toggleOperatorPreview,
  openOperatorPreview,
} = useFieldsetState();
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

// Ref for OperatorPreview component
const operatorPreview = ref<InstanceType<typeof OperatorPreview> | null>(null);

// Computed: is any translation mode active (running or paused)
const isOperatorPreviewActive = computed(
  () =>
    state.value.isTestRunning ||
    state.value.isLiveTranslationPrepared ||
    state.value.isTestPresentationRunning,
);

// Computed
const hasApiCredentials = computed(() => {
  return !!store.apiSettings.azureApiKey && !!store.apiSettings.azureRegion;
});

// Check if WebPubSub is fully configured
const isWebPubSubEnabled = computed(() => {
  return (
    store.readerConfig.enabled &&
    !!store.readerConfig.authFunctionUrl &&
    !!store.readerConfig.readerSecret &&
    !!store.operatorSecret.secret
  );
});

// Valid output mode: at least one of presentation or streamed session enabled
const hasValidOutputMode = computed(() => {
  const presentationEnabled =
    store.settings.outputModes?.presentationEnabled ?? true;
  const sessionEnabled =
    store.settings.outputModes?.streamedSessionEnabled ?? false;
  return !!(presentationEnabled || sessionEnabled);
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

  // Scroll operator preview to bottom (all active modes)
  scrollOperatorPreviewToBottom();

  // Update presentation window if running (filter for audience)
  if (state.value.isLiveTranslationPrepared) {
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

  // Scroll operator preview to bottom (all active modes)
  scrollOperatorPreviewToBottom();

  // Update presentation window if running
  if (state.value.isLiveTranslationPrepared) {
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

// Scroll operator preview containers to bottom
function scrollOperatorPreviewToBottom() {
  nextTick(() => {
    // Scroll all language containers via the OperatorPreview component
    if (operatorPreview.value?.langRefs) {
      Object.values(operatorPreview.value.langRefs).forEach((element) => {
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

  // Auto-open operator preview if it's closed
  openOperatorPreview();

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

// Prepare live translation
async function prepareLiveTranslation() {
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
    state.value.isLiveTranslationPrepared = true;
    state.value.presentationWindowsOpenedButNotStarted = true;

    openPresentationWindows(
      sessionId,
      store.settings,
      presentationLanguages.value,
      {
        isTest: false,
        multiWindowSummary: 'Presentation Windows Opened',
        multiWindowDetail: `${presentationLanguages.value.length} windows opened. Click "Start Translation" to begin.`,
        singleWindowSummary: 'Presentation Window Opened',
        singleWindowDetail: 'Click "Start Translation" to begin.',
      },
    );
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to start presentation';
    console.error('startPresentation failed', e);
    state.value.isLiveTranslationPrepared = false;
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

// Start translation for live presentation
async function startTranslation() {
  if (!hasApiCredentials.value) {
    error.value = 'Please configure Azure API credentials first';
    return;
  }

  try {
    state.value.isLiveTranslating = true;
    state.value.presentationWindowsOpenedButNotStarted = false;

    // Signal to presentation windows that translation has started
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
      summary: 'Translation Started',
      detail: 'Audio input is being translated live',
      life: 3000,
    });
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to start translation';
    console.error('startTranslation failed', e);
    state.value.isLiveTranslating = false;
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
    state.value.isLiveTranslating = true;
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
      scrollOperatorPreviewToBottom,
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
    state.value.isLiveTranslating = false;
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
    if (state.value.isLiveTranslationPrepared) {
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
    if (state.value.isLiveTranslationPrepared) {
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

    state.value.isLiveTranslationPrepared = false;
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
    state.value.isLiveTranslating = false;
    state.value.presentationWindowsOpenedButNotStarted = false;
    presentationSessionId.value = null;

    toast.add({
      severity: 'info',
      summary: 'Test Presentation Stopped',
      life: 3000,
    });
  }

  if (state.value.isLiveTranslationPrepared) {
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

        state.value.isLiveTranslationPrepared = false;
        state.value.isPaused = false;
        state.value.isLiveTranslating = false;
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
    if (state.value.isLiveTranslationPrepared) {
      captioningService?.stop();
      state.value.isLiveTranslationPrepared = false;
      state.value.isPaused = false;
      state.value.isLiveTranslating = false;
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
      state.value.isLiveTranslating = false;
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
