<template>
  <div class="space-y-6 max-w-6xl">
    <div class="flex items-center justify-between">
      <h2 class="text-2xl font-semibold">Translation Control</h2>
      <div v-if="stateText" class="flex items-center gap-2">
        <Chip :label="stateText" :class="stateColorClass" />
      </div>
    </div>

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

    <div v-if="hasApiCredentials" class="space-y-6">
      <!-- Translation Options -->
      <Fieldset>
        <template #legend>
          <div class="flex items-center gap-2">
            <i class="pi pi-language"></i>
            <span class="font-semibold">Translation Options</span>
          </div>
        </template>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Input Language -->
          <div class="flex flex-col gap-2">
            <label for="input-lang" class="font-medium text-sm"
              >Input Language (Speech)</label
            >
            <Select
              id="input-lang"
              v-model="store.settings.inputLanguage"
              :options="inputLanguages"
              optionLabel="name"
              :disabled="inputsDisabled"
              placeholder="Select input language"
              class="w-full"
            />
          </div>

          <!-- Output Language -->
          <div class="flex flex-col gap-2">
            <label for="output-lang" class="font-medium text-sm"
              >Output Language (Translation)</label
            >
            <Select
              id="output-lang"
              v-model="store.settings.outputLanguage"
              :options="outputLanguages"
              optionLabel="name"
              :disabled="inputsDisabled"
              placeholder="Select output language"
              class="w-full"
            />
          </div>

          <!-- Profanity Filter -->
          <div class="flex flex-col gap-2">
            <label for="profanity" class="font-medium text-sm"
              >Profanity Filter</label
            >
            <Select
              id="profanity"
              v-model="store.settings.profanityOption"
              :options="profanityOptions"
              :disabled="inputsDisabled"
              placeholder="Select profanity option"
              class="w-full"
            />
            <p class="text-xs text-surface-600 dark:text-surface-400">
              How to handle profanity in the speech
            </p>
          </div>

          <!-- Stable Partial Result Threshold -->
          <div class="flex flex-col gap-2">
            <label for="threshold" class="font-medium text-sm"
              >Stable Partial Result Threshold</label
            >
            <Select
              id="threshold"
              v-model="store.settings.stablePartialResultThreshold"
              :options="partialThresholds"
              :disabled="inputsDisabled"
              placeholder="Select threshold"
              class="w-full"
            />
            <p class="text-xs text-surface-600 dark:text-surface-400">
              Number of words before displaying live translation
            </p>
          </div>

          <!-- Phrase List -->
          <div class="flex flex-col gap-2 md:col-span-2">
            <label for="phrases" class="font-medium text-sm"
              >Phrase List (semicolon-separated)</label
            >
            <InputText
              id="phrases"
              v-model="store.settings.phraseList"
              placeholder="Name1;Location2;TechnicalTerm3"
              :disabled="inputsDisabled"
              class="w-full"
            />
            <p class="text-xs text-surface-600 dark:text-surface-400">
              Important words/phrases that should be recognized accurately
              (names, locations, technical terms)
            </p>
          </div>
        </div>
      </Fieldset>

      <!-- Presentation Styling Options -->
      <Fieldset>
        <template #legend>
          <div class="flex items-center gap-2">
            <i class="pi pi-palette"></i>
            <span class="font-semibold">Presentation Options</span>
          </div>
        </template>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <!-- Font -->
          <div class="flex flex-col gap-2">
            <label for="font" class="font-medium text-sm">Font</label>
            <Select
              id="font"
              v-model="store.settings.presentation.font"
              :options="presentationFonts"
              :disabled="inputsDisabled"
              placeholder="Select font"
              class="w-full"
            >
              <template #option="{ option }">
                <span :style="{ fontFamily: option }">{{ option }}</span>
              </template>
            </Select>
          </div>

          <!-- Font Size -->
          <div class="flex flex-col gap-2">
            <label for="font-size" class="font-medium text-sm">Font Size</label>
            <InputText
              id="font-size"
              v-model="store.settings.presentation.fontSize"
              placeholder="2em / 30px"
              :disabled="inputsDisabled"
            />
          </div>

          <!-- Margin -->
          <div class="flex flex-col gap-2">
            <label for="margin" class="font-medium text-sm"
              >Paragraph Margin</label
            >
            <InputText
              id="margin"
              v-model="store.settings.presentation.margin"
              placeholder="1em 2em"
              :disabled="inputsDisabled"
            />
          </div>

          <!-- Text Color -->
          <div class="flex flex-col gap-2">
            <label for="color" class="font-medium text-sm">Text Color</label>
            <InputText
              id="color"
              v-model="store.settings.presentation.color"
              placeholder="white / #fff"
              :disabled="inputsDisabled"
            />
          </div>

          <!-- Live Text Color -->
          <div class="flex flex-col gap-2">
            <label for="live-color" class="font-medium text-sm"
              >Live Text Color</label
            >
            <InputText
              id="live-color"
              v-model="store.settings.presentation.liveColor"
              placeholder="gray / #999"
              :disabled="inputsDisabled"
            />
          </div>

          <!-- Background -->
          <div class="flex flex-col gap-2">
            <label for="background" class="font-medium text-sm"
              >Background</label
            >
            <InputText
              id="background"
              v-model="store.settings.presentation.background"
              placeholder="black / #000"
              :disabled="inputsDisabled"
            />
          </div>
        </div>
      </Fieldset>

      <!-- Controls -->
      <Fieldset>
        <template #legend>
          <div class="flex items-center gap-2">
            <i class="pi pi-sitemap"></i>
            <span class="font-semibold">Controls</span>
          </div>
        </template>
        <div class="flex flex-col gap-4 items-center">
          <!-- Test Button -->
          <Button
            label="Test in here"
            icon="pi pi-compass"
            @click="startTest"
            :disabled="state.isPresentationRunning || state.isTestRunning"
            class="w-full max-w-xs"
          />

          <!-- Presentation Controls -->
          <div class="flex gap-2 flex-wrap justify-center">
            <Button
              label="Start Presentation"
              icon="pi pi-video"
              severity="success"
              @click="startPresentation"
              :disabled="state.isPresentationRunning || state.isTestRunning"
            />
            <Button
              v-if="state.isPaused"
              label="Resume"
              icon="pi pi-play"
              severity="success"
              @click="pauseOrResume"
              :disabled="!(state.isPresentationRunning || state.isTestRunning)"
            />
            <Button
              v-else
              label="Pause"
              icon="pi pi-pause"
              severity="warning"
              @click="pauseOrResume"
              :disabled="!(state.isPresentationRunning || state.isTestRunning)"
            />
            <Button
              label="Stop"
              icon="pi pi-stop"
              severity="danger"
              @click="stop"
              :disabled="!(state.isPresentationRunning || state.isTestRunning)"
            />
          </div>

          <!-- Save/Load Settings -->
          <div class="flex gap-2 flex-wrap justify-center pt-4 border-t">
            <Button
              label="Save Settings"
              icon="pi pi-save"
              severity="secondary"
              @click="saveSettings"
              :disabled="inputsDisabled || store.settingsSaving"
              :loading="store.settingsSaving"
            />
          </div>
        </div>
      </Fieldset>

      <!-- Test Mode Output -->
      <div
        v-if="state.isTestRunning"
        class="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <Fieldset>
          <template #legend>
            <span class="font-semibold">Speech to Text</span>
          </template>
          <div class="space-y-2 max-h-96 overflow-y-auto">
            <p
              v-for="(paragraph, index) in finalizedParagraphsOri"
              :key="'ori-' + index"
              class="text-sm"
            >
              {{ paragraph }}
            </p>
            <p
              v-if="currentLiveTranslationOri"
              class="text-sm text-surface-500"
            >
              {{ currentLiveTranslationOri }}
            </p>
          </div>
        </Fieldset>

        <Fieldset>
          <template #legend>
            <span class="font-semibold">Translation</span>
          </template>
          <div class="space-y-2 max-h-96 overflow-y-auto">
            <p
              v-for="(paragraph, index) in finalizedParagraphs"
              :key="'trans-' + index"
              class="text-sm"
            >
              {{ paragraph }}
            </p>
            <p v-if="currentLiveTranslation" class="text-sm text-surface-500">
              {{ currentLiveTranslation }}
            </p>
          </div>
        </Fieldset>
      </div>
    </div>

    <!-- Confirm Dialog -->
    <ConfirmDialog />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useTranslatorStore } from '../stores/translator';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import { CaptioningService } from '../services/captioning';
import { SessionLogger } from '../services/sessionLogger';
import type { Person } from '@churchtools-extensions/ct-utils/ct-types';
import { churchtoolsClient } from '@churchtools/churchtools-client';

import Fieldset from '@churchtools-extensions/prime-volt/Fieldset.vue';
import Button from '@churchtools-extensions/prime-volt/Button.vue';
import Select from '@churchtools-extensions/prime-volt/Select.vue';
import InputText from '@churchtools-extensions/prime-volt/InputText.vue';
import Chip from '@churchtools-extensions/prime-volt/Chip.vue';
import Message from '@churchtools-extensions/prime-volt/Message.vue';
import ConfirmDialog from '@churchtools-extensions/prime-volt/ConfirmDialog.vue';

const store = useTranslatorStore();
const confirm = useConfirm();
const toast = useToast();

// State
const state = ref({
  isTestRunning: false,
  isPresentationRunning: false,
  isPaused: false,
});

const error = ref<string | null>(null);
const user = ref<Person | null>(null);
const currentSession = ref<any>(null);

// Captioning service instance
let captioningService: CaptioningService | null = null;
const sessionLogger = new SessionLogger();

// Test mode output
const finalizedParagraphsOri = ref<string[]>([]);
const currentLiveTranslationOri = ref('');
const finalizedParagraphs = ref<string[]>([]);
const currentLiveTranslation = ref('');

// Language options
const inputLanguages = ref([
  { name: 'German', code: 'de-DE' },
  { name: 'English', code: 'en-US' },
  { name: 'Spanish', code: 'es-ES' },
  { name: 'French', code: 'fr-FR' },
  { name: 'Turkish', code: 'tr-TR' },
  { name: 'Arabic (EG)', code: 'ar-EG' },
  { name: 'Tamil', code: 'ta-IN' },
]);

const outputLanguages = ref([
  { name: 'German', code: 'de' },
  { name: 'English', code: 'en' },
  { name: 'Spanish', code: 'es' },
  { name: 'Portuguese', code: 'pt' },
  { name: 'French', code: 'fr' },
  { name: 'Italian', code: 'it' },
  { name: 'Polish', code: 'pl' },
  { name: 'Turkish', code: 'tr' },
  { name: 'Arabic', code: 'ar' },
  { name: 'Kurdish', code: 'ku' },
  { name: 'Croatian', code: 'hr' },
  { name: 'Russian', code: 'ru' },
  { name: 'Ukrainian', code: 'uk' },
  { name: 'Tamil', code: 'ta' },
]);

const profanityOptions = ref(['raw', 'remove', 'mask']);

const partialThresholds = ref([
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  '11',
  '12',
  '13',
  '14',
  '15',
]);

const presentationFonts = ref([
  'Arial',
  'Verdana',
  'Times New Roman',
  'Palatino',
]);

// Computed
const hasApiCredentials = computed(() => {
  return !!store.settings.azureApiKey && !!store.settings.azureRegion;
});

const inputsDisabled = computed(() => {
  return (
    state.value.isTestRunning ||
    state.value.isPresentationRunning ||
    store.settingsSaving
  );
});

const stateText = computed(() => {
  if (state.value.isPaused) {
    return state.value.isTestRunning ? 'Test Paused' : 'Presentation Paused';
  } else if (state.value.isTestRunning) {
    return 'Testing';
  } else if (state.value.isPresentationRunning) {
    return 'Presenting';
  }
  return '';
});

const stateColorClass = computed(() => {
  if (state.value.isPaused) {
    return 'bg-orange-500 text-white';
  } else if (state.value.isTestRunning || state.value.isPresentationRunning) {
    return 'bg-green-500 text-white';
  }
  return '';
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
function onTranslating(translation: string, original: string) {
  currentLiveTranslation.value = translation;
  currentLiveTranslationOri.value = original;

  // Update presentation window if running
  if (state.value.isPresentationRunning) {
    updatePresentationWindow(translation, true);
  }
}

function onTranslated(translation: string, original: string) {
  finalizedParagraphs.value.push(translation);
  finalizedParagraphsOri.value.push(original);
  currentLiveTranslation.value = '';
  currentLiveTranslationOri.value = '';

  // Update presentation window if running
  if (state.value.isPresentationRunning) {
    updatePresentationWindow(translation, false);
  }
}

function onError(errorMsg: string) {
  error.value = errorMsg;
  stop();
}

// Update presentation window via localStorage
function updatePresentationWindow(text: string, isLive: boolean) {
  const data = {
    text,
    isLive,
    finalized: isLive
      ? finalizedParagraphs.value
      : [...finalizedParagraphs.value, text],
    timestamp: Date.now(),
  };
  localStorage.setItem('translator_presentation', JSON.stringify(data));
}

// Start test mode
async function startTest() {
  if (!hasApiCredentials.value) {
    error.value = 'Please configure Azure API credentials first';
    return;
  }

  // Clear previous test output
  finalizedParagraphs.value = [];
  finalizedParagraphsOri.value = [];
  currentLiveTranslation.value = '';
  currentLiveTranslationOri.value = '';

  try {
    // Create captioning service
    captioningService = new CaptioningService(
      {
        inputLanguage: store.settings.inputLanguage,
        outputLanguage: store.settings.outputLanguage,
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
      store.settings.azureApiKey!,
      store.settings.azureRegion!,
    );

    captioningService.start();
    state.value.isTestRunning = true;

    // Start session logging
    if (user.value) {
      const session = sessionLogger.createSession({
        userId: user.value.id!,
        userEmail: user.value.email ?? '',
        userName: `${user.value.firstName} ${user.value.lastName}`,
        inputLanguage: store.settings.inputLanguage.code,
        outputLanguage: store.settings.outputLanguage.code,
        mode: 'test',
      });
      const sessionId = await store.startSession(session);
      sessionLogger.setCurrentSessionId(sessionId);
      currentSession.value = session;
    }

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

  try {
    state.value.isPresentationRunning = true;

    // Save settings to localStorage for presentation window
    localStorage.setItem('translator_settings', JSON.stringify(store.settings));
    localStorage.removeItem('translator_paused');

    // Start session logging
    if (user.value) {
      const session = sessionLogger.createSession({
        userId: user.value.id!,
        userEmail: user.value.email ?? '',
        userName: `${user.value.firstName} ${user.value.lastName}`,
        inputLanguage: store.settings.inputLanguage.code,
        outputLanguage: store.settings.outputLanguage.code,
        mode: 'presentation',
      });
      const sessionId = await store.startSession(session);
      sessionLogger.setCurrentSessionId(sessionId);
      currentSession.value = session;
    }

    // Create captioning service
    captioningService = new CaptioningService(
      {
        inputLanguage: store.settings.inputLanguage,
        outputLanguage: store.settings.outputLanguage,
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
      store.settings.azureApiKey!,
      store.settings.azureRegion!,
    );

    captioningService.start();

    // Open presentation window - just open the same page which will detect the hash
    const presentationUrl = `${window.location.origin}${window.location.pathname}?presentation=true`;
    window.open(presentationUrl, '_blank', 'toolbar=0,location=0,menubar=0');

    toast.add({
      severity: 'success',
      summary: 'Presentation Started',
      detail: 'Presentation window opened',
      life: 3000,
    });
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to start presentation';
    console.error('startPresentation failed', e);
    state.value.isPresentationRunning = false;
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
      localStorage.removeItem('translator_paused');
      captioningService?.start();
    }
  } else {
    // Pause
    if (captioningService) {
      captioningService.stop();
    }
    if (state.value.isPresentationRunning) {
      localStorage.setItem(
        'translator_paused',
        JSON.stringify({ isPaused: true }),
      );
    }
  }
  state.value.isPaused = !state.value.isPaused;
}

// Stop
function stop() {
  if (state.value.isTestRunning) {
    captioningService?.stop();
    state.value.isTestRunning = false;
    state.value.isPaused = false;

    // End session
    const sessionId = sessionLogger.getCurrentSessionId();
    if (sessionId && currentSession.value) {
      const endedSession = sessionLogger.endSession(
        currentSession.value,
        'completed',
      );
      store.endSession(sessionId, endedSession);
      sessionLogger.clearCurrentSession();
      currentSession.value = null;
    }
  }

  if (state.value.isPresentationRunning) {
    confirm.require({
      message: 'Are you sure you want to stop the presentation?',
      header: 'Confirm Stop',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        captioningService?.stop();
        localStorage.removeItem('translator_settings');
        localStorage.removeItem('translator_paused');
        localStorage.removeItem('translator_presentation');
        state.value.isPresentationRunning = false;
        state.value.isPaused = false;

        // End session
        const sessionId = sessionLogger.getCurrentSessionId();
        if (sessionId && currentSession.value) {
          const endedSession = sessionLogger.endSession(
            currentSession.value,
            'completed',
          );
          store.endSession(sessionId, endedSession);
          sessionLogger.clearCurrentSession();
          currentSession.value = null;
        }

        toast.add({
          severity: 'info',
          summary: 'Presentation Stopped',
          life: 3000,
        });
      },
    });
  }
}

// Save settings
async function saveSettings() {
  try {
    await store.saveSettings(store.settings);
    toast.add({
      severity: 'success',
      summary: 'Settings Saved',
      detail: 'Your configuration has been saved',
      life: 3000,
    });
  } catch (e: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to save settings',
      life: 5000,
    });
  }
}

// Initialize
loadUser();
</script>
