<template>
  <div class="space-y-6 max-w-6xl">
    <div class="flex items-center justify-between">
      <h2 class="text-2xl font-semibold">Translation Control</h2>
      <div v-if="stateText" class="flex items-center gap-2">
        <div
          class="inline-flex items-center rounded-2xl gap-2 px-3 py-2"
          :class="{
            'bg-orange-500 text-white': state.isPaused,
            'bg-green-500 text-white':
              state.isTestRunning || state.isPresentationRunning,
            'bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-0':
              !state.isPaused &&
              !state.isTestRunning &&
              !state.isPresentationRunning,
          }"
        >
          {{ stateText }}
        </div>
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
              >Spoken Input Language</label
            >
            <div class="flex items-stretch w-full">
              <Select
                id="input-lang"
                v-model="store.settings.inputLanguage"
                :options="inputLanguages"
                optionLabel="name"
                :disabled="inputsDisabled"
                placeholder="Select input language"
                pt:root="flex-1 rounded-e-none"
              />
              <span
                class="flex items-center justify-center border-y border-e border-surface-300 dark:border-surface-700 rounded-e-md overflow-hidden"
              >
                <Button
                  icon="pi pi-question-circle"
                  severity="secondary"
                  text
                  pt:root="rounded-none"
                  @click="(e) => inputLangPopover.toggle(e)"
                  :disabled="inputsDisabled"
                />
              </span>
            </div>
            <Popover ref="inputLangPopover">
              <div class="max-w-xs">
                <p class="text-sm">The spoken language to be translated.</p>
              </div>
            </Popover>
          </div>

          <!-- Output Language -->
          <div class="flex flex-col gap-2">
            <label for="output-lang" class="font-medium text-sm"
              >Written Output Language</label
            >
            <div class="flex items-stretch w-full">
              <Select
                id="output-lang"
                v-model="store.settings.outputLanguage"
                :options="outputLanguages"
                optionLabel="name"
                :disabled="inputsDisabled"
                placeholder="Select output language"
                pt:root="flex-1 rounded-e-none"
              />
              <span
                class="flex items-center justify-center border-y border-e border-surface-300 dark:border-surface-700 rounded-e-md overflow-hidden"
              >
                <Button
                  icon="pi pi-question-circle"
                  severity="secondary"
                  text
                  pt:root="rounded-none"
                  @click="(e) => outputLangPopover.toggle(e)"
                  :disabled="inputsDisabled"
                />
              </span>
            </div>
            <Popover ref="outputLangPopover">
              <div class="max-w-xs">
                <p class="text-sm">
                  The written language to which is translated.
                </p>
              </div>
            </Popover>
          </div>

          <!-- Profanity Filter -->
          <div class="flex flex-col gap-2">
            <label for="profanity" class="font-medium text-sm"
              >Profanity Option</label
            >
            <div class="flex items-stretch w-full">
              <Select
                id="profanity"
                v-model="store.settings.profanityOption"
                :options="profanityOptions"
                :disabled="inputsDisabled"
                placeholder="Select profanity option"
                pt:root="flex-1 rounded-e-none"
              />
              <span
                class="flex items-center justify-center border-y border-e border-surface-300 dark:border-surface-700 rounded-e-md overflow-hidden"
              >
                <Button
                  icon="pi pi-question-circle"
                  severity="secondary"
                  text
                  pt:root="rounded-none"
                  @click="(e) => profanityPopover.toggle(e)"
                  :disabled="inputsDisabled"
                />
              </span>
            </div>
            <Popover ref="profanityPopover">
              <div class="max-w-xs">
                <p class="text-sm mb-2">Setting for dealing with profanity:</p>
                <p class="text-sm">
                  <strong>raw</strong>: swear words are kept<br />
                  <strong>remove</strong>: swear words are removed<br />
                  <strong>mask</strong>: swear words are replaced by ***
                </p>
              </div>
            </Popover>
          </div>

          <!-- Stable Partial Result Threshold -->
          <div class="flex flex-col gap-2">
            <label for="threshold" class="font-medium text-sm"
              >Partial Result Threshold</label
            >
            <div class="flex items-stretch w-full">
              <Select
                id="threshold"
                v-model="store.settings.stablePartialResultThreshold"
                :options="partialThresholds"
                :disabled="inputsDisabled"
                placeholder="Select threshold"
                pt:root="flex-1 rounded-e-none"
              />
              <span
                class="flex items-center justify-center border-y border-e border-surface-300 dark:border-surface-700 rounded-e-md overflow-hidden"
              >
                <Button
                  icon="pi pi-question-circle"
                  severity="secondary"
                  text
                  pt:root="rounded-none"
                  @click="(e) => thresholdPopover.toggle(e)"
                  :disabled="inputsDisabled"
                />
              </span>
            </div>
            <Popover ref="thresholdPopover">
              <div class="max-w-sm">
                <p class="text-sm mb-2">
                  Real-time translation presents tradeoffs with respect to
                  latency versus accuracy. You could show the text as soon as
                  possible. However, if you can accept some latency, you can
                  improve the accuracy of the caption by setting a higher
                  'partial results threshold'.
                </p>
                <p class="text-sm">
                  The value that you set is the number of times a word has to be
                  recognized before the Speech service returns a live
                  translation.
                </p>
              </div>
            </Popover>
          </div>

          <!-- Phrase List -->
          <div class="flex flex-col gap-2 md:col-span-2">
            <label for="phrases" class="font-medium text-sm">Phrase List</label>
            <div class="flex items-stretch w-full">
              <InputText
                id="phrases"
                v-model="store.settings.phraseList"
                placeholder="Oeschelbronn;Schaan;Paul"
                :disabled="inputsDisabled"
                pt:root="flex-1 rounded-e-none"
              />
              <span
                class="flex items-center justify-center border-y border-e border-surface-300 dark:border-surface-700 rounded-e-md overflow-hidden"
              >
                <Button
                  icon="pi pi-question-circle"
                  severity="secondary"
                  text
                  pt:root="rounded-none"
                  @click="(e) => phraseListPopover.toggle(e)"
                  :disabled="inputsDisabled"
                />
              </span>
            </div>
            <Popover ref="phraseListPopover">
              <div class="max-w-sm">
                <p class="text-sm mb-2">
                  A phrase list is a list of words or phrases that you can
                  provide before starting the translation. Adding a phrase to a
                  phrase list increases its importance, thus making it more
                  likely to be recognized.
                </p>
                <p class="text-sm mb-2">
                  Examples of phrases include: Names, Geographical locations,
                  Homonyms, Words or acronyms unique to your industry or
                  organization.
                </p>
                <p class="text-sm">
                  Phrases need to be separated by a semicolon.
                </p>
              </div>
            </Popover>
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
            <div class="flex items-stretch w-full">
              <Select
                id="font"
                v-model="store.settings.presentation.font"
                :options="presentationFonts"
                :disabled="inputsDisabled"
                placeholder="Select font"
                pt:root="flex-1 rounded-e-none"
              >
                <template #option="{ option }">
                  <span :style="{ fontFamily: option }">{{ option }}</span>
                </template>
              </Select>
              <span
                class="flex items-center justify-center border-y border-e border-surface-300 dark:border-surface-700 rounded-e-md overflow-hidden"
              >
                <Button
                  icon="pi pi-question-circle"
                  severity="secondary"
                  text
                  pt:root="rounded-none"
                  @click="(e) => fontPopover.toggle(e)"
                  :disabled="inputsDisabled"
                />
              </span>
            </div>
            <Popover ref="fontPopover">
              <div class="max-w-xs">
                <p class="text-sm">Font used to display the translated text.</p>
              </div>
            </Popover>
          </div>

          <!-- Font Size -->
          <div class="flex flex-col gap-2">
            <label for="font-size" class="font-medium text-sm">Font Size</label>
            <div class="flex items-stretch w-full">
              <InputText
                id="font-size"
                v-model="store.settings.presentation.fontSize"
                placeholder="2em / 30px"
                :disabled="inputsDisabled"
                pt:root="flex-1 rounded-e-none"
              />
              <span
                class="flex items-center justify-center border-y border-e border-surface-300 dark:border-surface-700 rounded-e-md overflow-hidden"
              >
                <Button
                  icon="pi pi-question-circle"
                  severity="secondary"
                  text
                  pt:root="rounded-none"
                  @click="(e) => fontSizePopover.toggle(e)"
                  :disabled="inputsDisabled"
                />
              </span>
            </div>
            <Popover ref="fontSizePopover">
              <div class="max-w-xs">
                <p class="text-sm">
                  Font size of the translated text. You can specify the size in
                  any CSS unit (px, em, rem...).
                </p>
              </div>
            </Popover>
          </div>

          <!-- Margin -->
          <div class="flex flex-col gap-2">
            <label for="margin" class="font-medium text-sm"
              >Paragraph Margin</label
            >
            <div class="flex items-stretch w-full">
              <InputText
                id="margin"
                v-model="store.settings.presentation.margin"
                placeholder="1em 2em"
                :disabled="inputsDisabled"
                pt:root="flex-1 rounded-e-none"
              />
              <span
                class="flex items-center justify-center border-y border-e border-surface-300 dark:border-surface-700 rounded-e-md overflow-hidden"
              >
                <Button
                  icon="pi pi-question-circle"
                  severity="secondary"
                  text
                  pt:root="rounded-none"
                  @click="(e) => marginPopover.toggle(e)"
                  :disabled="inputsDisabled"
                />
              </span>
            </div>
            <Popover ref="marginPopover">
              <div class="max-w-sm">
                <p class="text-sm">
                  Distance of the translated paragraphs to each other and to the
                  screen border. Specifications in 'px' and in 'em' are allowed.
                  To control all sides individually, e.g. '1em 4em 1em 2em' can
                  be used (top, right, bottom, left).
                </p>
              </div>
            </Popover>
          </div>

          <!-- Text Color -->
          <div class="flex flex-col gap-2">
            <label for="color" class="font-medium text-sm">Text Color</label>
            <div class="flex items-stretch w-full">
              <InputText
                id="color"
                v-model="store.settings.presentation.color"
                placeholder="white / #fff"
                :disabled="inputsDisabled"
                pt:root="flex-1 rounded-e-none"
              />
              <span
                class="flex items-center justify-center border-y border-e border-surface-300 dark:border-surface-700 rounded-e-md overflow-hidden"
              >
                <Button
                  icon="pi pi-question-circle"
                  severity="secondary"
                  text
                  pt:root="rounded-none"
                  @click="(e) => colorPopover.toggle(e)"
                  :disabled="inputsDisabled"
                />
              </span>
            </div>
            <Popover ref="colorPopover">
              <div class="max-w-xs">
                <p class="text-sm">
                  Color of the translated text. You can specify colors with html
                  names, rgb, and hex.
                </p>
              </div>
            </Popover>
          </div>

          <!-- Live Text Color -->
          <div class="flex flex-col gap-2">
            <label for="live-color" class="font-medium text-sm"
              >Live Text Color</label
            >
            <div class="flex items-stretch w-full">
              <InputText
                id="live-color"
                v-model="store.settings.presentation.liveColor"
                placeholder="gray / #999"
                :disabled="inputsDisabled"
                pt:root="flex-1 rounded-e-none"
              />
              <span
                class="flex items-center justify-center border-y border-e border-surface-300 dark:border-surface-700 rounded-e-md overflow-hidden"
              >
                <Button
                  icon="pi pi-question-circle"
                  severity="secondary"
                  text
                  pt:root="rounded-none"
                  @click="(e) => liveColorPopover.toggle(e)"
                  :disabled="inputsDisabled"
                />
              </span>
            </div>
            <Popover ref="liveColorPopover">
              <div class="max-w-xs">
                <p class="text-sm">
                  Color of the live translated text. You can specify colors with
                  html names, rgb, and hex.
                </p>
              </div>
            </Popover>
          </div>

          <!-- Background -->
          <div class="flex flex-col gap-2">
            <label for="background" class="font-medium text-sm"
              >Background</label
            >
            <div class="flex items-stretch w-full">
              <InputText
                id="background"
                v-model="store.settings.presentation.background"
                placeholder="black / #000"
                :disabled="inputsDisabled"
                pt:root="flex-1 rounded-e-none"
              />
              <span
                class="flex items-center justify-center border-y border-e border-surface-300 dark:border-surface-700 rounded-e-md overflow-hidden"
              >
                <Button
                  icon="pi pi-question-circle"
                  severity="secondary"
                  text
                  pt:root="rounded-none"
                  @click="(e) => backgroundPopover.toggle(e)"
                  :disabled="inputsDisabled"
                />
              </span>
            </div>
            <Popover ref="backgroundPopover">
              <div class="max-w-sm">
                <p class="text-sm">
                  Background of the presentation view. You can specify colors
                  with html names, rgb, and hex. Also images with e.g. the
                  following syntax: 'center / cover no-repeat
                  url(https://picsum.photos/1920/1080)', or color-gradients
                  with: 'linear-gradient(red, yellow)'.
                </p>
              </div>
            </Popover>
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
              :disabled="
                !(
                  (state.isPresentationRunning && state.isRecordingStarted) ||
                  state.isTestRunning
                )
              "
            />
            <Button
              v-else
              label="Pause"
              icon="pi pi-pause"
              severity="warning"
              @click="pauseOrResume"
              :disabled="
                !(
                  (state.isPresentationRunning && state.isRecordingStarted) ||
                  state.isTestRunning
                )
              "
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
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
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
import Message from '@churchtools-extensions/prime-volt/Message.vue';
import ConfirmDialog from '@churchtools-extensions/prime-volt/ConfirmDialog.vue';
import Popover from '@churchtools-extensions/prime-volt/Popover.vue';

const store = useTranslatorStore();
const confirm = useConfirm();
const toast = useToast();

// Popover refs for info buttons
const inputLangPopover = ref();
const outputLangPopover = ref();
const profanityPopover = ref();
const thresholdPopover = ref();
const phraseListPopover = ref();
const fontPopover = ref();
const fontSizePopover = ref();
const marginPopover = ref();
const colorPopover = ref();
const liveColorPopover = ref();
const backgroundPopover = ref();

// State
const state = ref({
  isTestRunning: false,
  isPresentationRunning: false,
  isPaused: false,
  isRecordingStarted: false, // Tracks if presentation window clicked start
});

const error = ref<string | null>(null);
const user = ref<Person | null>(null);
const currentSession = ref<any>(null);

// Captioning service instance
let captioningService: CaptioningService | null = null;
const sessionLogger = new SessionLogger();
let heartbeatInterval: NodeJS.Timeout | null = null;

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

// Load current user
async function loadUser() {
  try {
    user.value = await churchtoolsClient.get<Person>('/whoami');
  } catch (e) {
    console.error('Failed to load user', e);
  }
}

// Start sending heartbeat updates every 30 seconds
function startHeartbeat() {
  stopHeartbeat(); // Clear any existing interval

  heartbeatInterval = setInterval(() => {
    const sessionId = sessionLogger.getCurrentSessionId();
    if (sessionId) {
      // Non-blocking heartbeat update
      store.updateHeartbeat(sessionId).catch(() => {
        // Silent fail - already logged in store
      });
    }
  }, 30000); // 30 seconds
}

// Stop heartbeat updates
function stopHeartbeat() {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
}

// Handle window close - try to end session gracefully
function handleWindowClose() {
  const sessionId = sessionLogger.getCurrentSessionId();
  if (sessionId && currentSession.value) {
    try {
      // Attempt to end session (may not complete if browser closes quickly)
      const endedSession = sessionLogger.endSession(
        currentSession.value,
        'completed',
      );
      // Use navigator.sendBeacon for better reliability on page unload
      // Note: This is best-effort, not guaranteed to complete
      store.endSession(sessionId, endedSession);
    } catch (e) {
      // Silent fail on unload
      console.warn('Could not end session on close:', e);
    }
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

      // Start heartbeat updates
      startHeartbeat();
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
    localStorage.removeItem('translator_recording_started');

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

    // Stop heartbeat
    stopHeartbeat();

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
      rejectProps: {
        label: 'Cancel',
        severity: 'secondary',
      },
      acceptProps: {
        label: 'Stop',
      },
      accept: () => {
        captioningService?.stop();
        localStorage.removeItem('translator_settings');
        localStorage.removeItem('translator_paused');
        localStorage.removeItem('translator_presentation');
        localStorage.removeItem('translator_recording_started');
        state.value.isPresentationRunning = false;
        state.value.isPaused = false;
        state.value.isRecordingStarted = false;

        // Stop heartbeat
        stopHeartbeat();

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

// Start recording (called when presentation window signals ready)
async function startRecording() {
  if (!state.value.isPresentationRunning || state.value.isRecordingStarted) {
    return;
  }

  try {
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

      // Start heartbeat updates
      startHeartbeat();
    }

    // Create and start captioning service
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
    state.value.isRecordingStarted = true;

    toast.add({
      severity: 'success',
      summary: 'Recording Started',
      detail: 'Translation is now active',
      life: 3000,
    });
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to start recording';
    console.error('startRecording failed', e);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.value,
      life: 5000,
    });
  }
}

// Initialize
loadUser();

// Listen for presentation window close via storage events
function handleStorageEvent(e: StorageEvent) {
  if (e.key === 'translator_recording_started' && e.newValue) {
    // Presentation window clicked "Start & Fullscreen"
    startRecording();
  } else if (
    e.key === 'translator_settings' &&
    e.newValue === null &&
    state.value.isPresentationRunning
  ) {
    // Presentation window was closed, stop everything
    captioningService?.stop();
    state.value.isPresentationRunning = false;
    state.value.isPaused = false;
    state.value.isRecordingStarted = false;

    // Stop heartbeat
    stopHeartbeat();

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
      detail: 'Presentation window was closed',
      life: 3000,
    });
  }
}

// Setup window close handler
onMounted(() => {
  window.addEventListener('beforeunload', handleWindowClose);
  window.addEventListener('storage', handleStorageEvent);
});

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', handleWindowClose);
  window.removeEventListener('storage', handleStorageEvent);
  stopHeartbeat();
});
</script>
