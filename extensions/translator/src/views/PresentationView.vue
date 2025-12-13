<template>
  <div
    ref="textEl"
    class="fixed inset-0 overflow-auto translator-presentation-root"
    :style="{
      '--presentation-background': presentationSettings.background,
      '--presentation-color': presentationSettings.color,
      '--presentation-font': presentationSettings.font,
      '--presentation-font-size': presentationSettings.fontSize,
      '--presentation-margin': presentationSettings.margin,
      '--presentation-live-color': presentationSettings.liveColor,
    }"
  >
    <!-- Initialization Phase -->
    <div
      v-if="initPhase"
      class="flex flex-col items-center justify-center gap-8 p-8 h-full w-full bg-black/50"
    >
      <Button
        label="Start & Fullscreen"
        icon="pi pi-video"
        class="h-32 w-full max-w-2xl text-4xl"
        severity="success"
        @click="startPresentation"
      />
      <Button
        label="Test & Fullscreen"
        icon="pi pi-compass"
        class="h-24 w-full max-w-2xl text-3xl"
        severity="secondary"
        @click="startTestMode"
      />
    </div>

    <!-- Translation Display - Multi-language Split Screen -->
    <div
      v-else-if="outputLanguages.length > 1"
      class="split-view-container"
      :class="splitViewGridClass"
    >
      <div v-for="lang in outputLanguages" :key="lang" class="language-pane">
        <div class="language-header">{{ getLanguageDisplayName(lang) }}</div>
        <div
          :ref="
            (el) => {
              if (el) languagePaneRefs[lang] = el as HTMLDivElement;
            }
          "
          class="translation-content"
        >
          <p
            v-for="(paragraph, index) in finalizedParagraphsByLang[lang] || []"
            :key="'para-' + lang + '-' + index"
            class="finalized-paragraph"
          >
            {{ paragraph }}
          </p>
          <p v-if="currentLiveTranslationByLang[lang]" class="live-translation">
            {{ currentLiveTranslationByLang[lang] }}
          </p>
        </div>
      </div>
    </div>

    <!-- Translation Display - Single Language -->
    <div v-else class="translation-content">
      <p
        v-for="(paragraph, index) in singleLanguageParagraphs"
        :key="'para-' + index"
        class="finalized-paragraph"
      >
        {{ paragraph }}
      </p>
      <p v-if="singleLanguageLiveTranslation" class="live-translation">
        {{ singleLanguageLiveTranslation }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue';
import { LoremIpsum } from 'lorem-ipsum';
import Button from '@churchtools-extensions/prime-volt/Button.vue';
import type { TranslatorSettings } from '../stores/translator';
import { getLanguageDisplayName } from '../utils/languageHelpers';
import { polyfillCountryFlagEmojis } from 'country-flag-emoji-polyfill';

const textEl = ref<HTMLDivElement>();
// Single-language support
const finalizedParagraphs = ref<string[]>([]);
const currentLiveTranslation = ref('');
// Multi-language support
const finalizedParagraphsByLang = ref<Record<string, string[]>>({});
const currentLiveTranslationByLang = ref<Record<string, string>>({});
const outputLanguages = ref<string[]>([]);
const languagePaneRefs = ref<Record<string, HTMLDivElement>>({});

const initPhase = ref(true);
const isTestMode = ref(false);
const isRunning = ref(false);

const lorem = new LoremIpsum({
  sentencesPerParagraph: {
    max: 5,
    min: 1,
  },
  wordsPerSentence: {
    max: 20,
    min: 4,
  },
});

// Default presentation settings
const presentationSettings = ref({
  font: 'Arial',
  fontSize: '2em',
  margin: '1em 2em',
  color: 'white',
  liveColor: '#999',
  background: 'black',
  mode: 'split' as 'split' | 'multi-window',
});

// Computed class for split view grid layout
const splitViewGridClass = computed(() => {
  const count = outputLanguages.value.length;
  if (count === 2) return 'grid-cols-2';
  if (count === 3) return 'grid-cols-3';
  if (count === 4) return 'grid-cols-2 grid-rows-2';
  if (count === 5) return 'grid-5-lang';
  if (count === 6) return 'grid-cols-3 grid-rows-2';
  return 'grid-cols-1';
});

// For single language mode, extract the first language's data
const singleLanguageParagraphs = computed(() => {
  if (outputLanguages.value.length === 1) {
    const lang = outputLanguages.value[0];
    return finalizedParagraphsByLang.value[lang] || [];
  }
  // Fallback to legacy data if no output languages set
  return finalizedParagraphs.value;
});

const singleLanguageLiveTranslation = computed(() => {
  if (outputLanguages.value.length === 1) {
    const lang = outputLanguages.value[0];
    return currentLiveTranslationByLang.value[lang] || '';
  }
  // Fallback to legacy data if no output languages set
  return currentLiveTranslation.value;
});

// Load settings from localStorage
function loadSettings() {
  const settingsStr = localStorage.getItem('translator_settings');
  if (settingsStr) {
    try {
      const settings: TranslatorSettings = JSON.parse(settingsStr);
      presentationSettings.value = settings.presentation;
      outputLanguages.value = settings.outputLanguages || [];
    } catch (e) {
      console.error('Failed to load settings from localStorage', e);
    }
  }
}

// Listen for storage events (cross-window communication)
function handleStorageEvent(e: StorageEvent) {
  if (e.key === 'translator_presentation' && e.newValue) {
    try {
      const data = JSON.parse(e.newValue);

      // Handle new multi-language format
      if (data.translations && typeof data.translations === 'object') {
        if (data.isLive) {
          currentLiveTranslationByLang.value = data.translations;
        } else {
          finalizedParagraphsByLang.value = data.finalized || {};
          currentLiveTranslationByLang.value = {};
        }
      } else {
        // Fallback to single-language format
        if (data.isLive) {
          currentLiveTranslation.value = data.text || '';
        } else {
          finalizedParagraphs.value = data.finalized || [];
          currentLiveTranslation.value = '';
        }
      }
      scrollToBottom();
    } catch (err) {
      console.error('Failed to parse presentation data', err);
    }
  } else if (e.key === 'translator_settings' && e.newValue === null) {
    // Settings removed means presentation stopped
    window.close();
  } else if (e.key === 'translator_paused') {
    if (initPhase.value) {
      return;
    }
    if (e.newValue === null) {
      // Resumed
      initPhase.value = false;
      if (isTestMode.value) {
        isRunning.value = true;
      }
    } else {
      // Paused
      finalizedParagraphs.value = [];
      currentLiveTranslation.value = '';
      if (isTestMode.value) {
        isRunning.value = false;
      }
    }
  }
}

// Scroll to bottom of text container
function scrollToBottom() {
  nextTick(() => {
    // For multi-language split view, scroll each pane independently
    if (outputLanguages.value.length > 1) {
      Object.values(languagePaneRefs.value).forEach((pane) => {
        if (pane) {
          pane.scrollTop = pane.scrollHeight;
        }
      });
    } else {
      // For single language, scroll the main container
      if (textEl.value) {
        textEl.value.scrollTop = textEl.value.scrollHeight;
      }
    }
  });
}

// Start presentation and enter fullscreen
function startPresentation() {
  initPhase.value = false;
  isRunning.value = true;

  // Signal to control window that we're ready to start recording
  localStorage.setItem(
    'translator_recording_started',
    JSON.stringify({ started: true, timestamp: Date.now() }),
  );

  // Request fullscreen
  const elem = document.documentElement;
  if (elem.requestFullscreen) {
    elem.requestFullscreen().catch((err) => {
      console.error('Failed to enter fullscreen', err);
    });
  }
}

// Start test mode with Lorem Ipsum text
function startTestMode() {
  initPhase.value = false;
  isRunning.value = true;
  isTestMode.value = true;

  // Generate dummy text in an endless loop
  (async function generateLoop() {
    while (isTestMode.value) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      if (isRunning.value) {
        // If not paused
        const paragraph = lorem.generateParagraphs(1);
        finalizedParagraphs.value.push(paragraph);
        currentLiveTranslation.value =
          finalizedParagraphs.value.length + ' ' + lorem.generateSentences(1);
        scrollToBottom();
      }
    }
  })();

  // Request fullscreen
  const elem = document.documentElement;
  if (elem.requestFullscreen) {
    elem.requestFullscreen().catch((err) => {
      console.error('Failed to enter fullscreen', err);
    });
  }
}

// Check for existing presentation data on mount
function checkExistingData() {
  const presentationStr = localStorage.getItem('translator_presentation');
  if (presentationStr) {
    try {
      const data = JSON.parse(presentationStr);
      // Handle multi-language format
      if (
        data.finalized &&
        typeof data.finalized === 'object' &&
        !Array.isArray(data.finalized)
      ) {
        const hasData = Object.values(data.finalized).some(
          (arr: any) => Array.isArray(arr) && arr.length > 0,
        );
        if (hasData) {
          finalizedParagraphsByLang.value = data.finalized;
          initPhase.value = false;
        }
      } else if (data.finalized && data.finalized.length > 0) {
        // Single-language format
        finalizedParagraphs.value = data.finalized;
        initPhase.value = false;
      }
    } catch (e) {
      console.error('Failed to load existing presentation data', e);
    }
  }
}

onMounted(() => {
  loadSettings();
  checkExistingData();

  // Hide the outer navigation element
  const navigation = document.getElementById('navigation');
  if (navigation) {
    navigation.style.display = 'none';
  }

  // Polyfill country flag emojis
  polyfillCountryFlagEmojis();

  // Listen for storage changes from the control window
  window.addEventListener('storage', handleStorageEvent);

  // Clean up on window close - signal to control window
  window.addEventListener('beforeunload', () => {
    // Stop test mode
    isTestMode.value = false;
    isRunning.value = false;

    // Remove settings to signal the control window that presentation closed
    localStorage.removeItem('translator_settings');
    localStorage.removeItem('translator_paused');
    localStorage.removeItem('translator_presentation');
    localStorage.removeItem('translator_recording_started');
  });
});

onUnmounted(() => {
  window.removeEventListener('storage', handleStorageEvent);

  // Restore the navigation element visibility
  const navigation = document.getElementById('navigation');
  if (navigation) {
    navigation.style.display = '';
  }
});
</script>

<style scoped>
/* Force presentation styles to override parent page styles */
.translator-presentation-root {
  /* Hide scrollbars without removing scrolling support. Applies cross-browser. */
  -ms-overflow-style: none !important; /* IE and Edge */
  scrollbar-width: none !important; /* Firefox */

  /* Force presentation styles */
  background: var(--presentation-background) !important;
  color: var(--presentation-color) !important;
  /* Prepend Twemoji Country Flags for flag emoji support */
  font-family: 'Twemoji Country Flags', var(--presentation-font) !important;
  font-size: var(--presentation-font-size) !important;
  line-height: 1.5 !important;
  z-index: 9999 !important;
}

.translator-presentation-root::-webkit-scrollbar {
  display: none !important; /* Chrome, Safari, Opera */
  width: 0 !important;
  height: 0 !important;
}

/* Override any parent styles on paragraphs */
.translator-presentation-root .translation-content {
  width: 100% !important;
  max-width: 100% !important;
  box-sizing: border-box !important;
}

.translator-presentation-root .finalized-paragraph,
.translator-presentation-root .live-translation {
  margin: var(--presentation-margin) !important;
  /* Prepend Twemoji Country Flags for flag emoji support */
  font-family: 'Twemoji Country Flags', var(--presentation-font) !important;
  font-size: var(--presentation-font-size) !important;
  color: var(--presentation-color) !important;
  line-height: 1.5 !important;
  max-width: none !important;
  width: auto !important;
  box-sizing: border-box !important;
}

.translator-presentation-root .live-translation {
  color: var(--presentation-live-color) !important;
}

/* Ensure buttons and init phase aren't affected by font size */
.translator-presentation-root .flex.flex-col.items-center {
  font-size: 16px !important;
}

/* Split-screen layout styles */
.split-view-container {
  display: grid;
  width: 100% !important;
  height: 100% !important;
  gap: 0 !important;
  overflow: hidden !important;
}

/* Grid layouts for different language counts */
.grid-cols-2 {
  grid-template-columns: repeat(2, 1fr) !important;
}

.grid-cols-3 {
  grid-template-columns: repeat(3, 1fr) !important;
}

.grid-rows-2 {
  grid-template-rows: repeat(2, 1fr) !important;
}

/* Special layout for 5 languages: 2 on top, 3 on bottom */
.grid-5-lang {
  grid-template-columns: repeat(6, 1fr) !important;
  grid-template-rows: repeat(2, 1fr) !important;
}

.grid-5-lang .language-pane:nth-child(1) {
  grid-column: 1 / 4 !important;
}

.grid-5-lang .language-pane:nth-child(2) {
  grid-column: 4 / 7 !important;
}

.grid-5-lang .language-pane:nth-child(3) {
  grid-column: 1 / 3 !important;
}

.grid-5-lang .language-pane:nth-child(4) {
  grid-column: 3 / 5 !important;
}

.grid-5-lang .language-pane:nth-child(5) {
  grid-column: 5 / 7 !important;
}

/* Individual language pane */
.language-pane {
  display: flex !important;
  flex-direction: column !important;
  height: 100% !important;
  overflow: hidden !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  box-sizing: border-box !important;
}

/* Language header */
.language-header {
  flex-shrink: 0 !important;
  background: rgba(0, 0, 0, 0.8) !important;
  color: var(--presentation-color) !important;
  /* Prepend Twemoji Country Flags for flag emoji support */
  font-family: 'Twemoji Country Flags', var(--presentation-font) !important;
  font-size: calc(var(--presentation-font-size) * 0.6) !important;
  padding: 0.5em 1em !important;
  text-align: center !important;
  font-weight: bold !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2) !important;
  z-index: 10 !important;
  backdrop-filter: blur(10px) !important;
}

/* Translation content within language pane - this is the scrollable element */
.language-pane .translation-content {
  flex: 1 !important;
  padding: 0 !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;

  /* Hide scrollbars */
  -ms-overflow-style: none !important;
  scrollbar-width: none !important;
}

.language-pane .translation-content::-webkit-scrollbar {
  display: none !important;
}

/* Adjust paragraph margins for split view - use the configured margin in all directions */
.language-pane .finalized-paragraph,
.language-pane .live-translation {
  margin: var(--presentation-margin) !important;
  font-size: calc(var(--presentation-font-size) * 0.85) !important;
}
</style>
