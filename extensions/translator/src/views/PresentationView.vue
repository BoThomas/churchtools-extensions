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
    <!-- Fullscreen Instructions -->
    <div
      v-if="showFullscreenInstructions"
      class="fixed inset-0 flex items-center justify-center z-50"
    >
      <div
        class="bg-primary text-primary-contrast px-8 py-6 rounded-lg shadow-2xl max-w-2xl relative overflow-hidden"
        style="font-size: 16px !important"
      >
        <div class="flex items-start gap-3">
          <i
            class="pi pi-info-circle text-xl mt-0.5"
            style="font-size: 20px !important"
          ></i>
          <div class="flex-1">
            <p class="font-semibold mb-1" style="font-size: 16px !important">
              Enter Fullscreen Mode
            </p>
            <p
              v-if="specificLanguage"
              class="text-sm font-medium mb-1"
              style="font-size: 14px !important"
            >
              Language: {{ getLanguageDisplayName(specificLanguage) }}
            </p>
            <p class="text-sm" style="font-size: 14px !important">
              <span v-if="osType === 'mac'"
                >Press
                <kbd
                  class="px-2 py-1 bg-white/20 rounded"
                  style="font-size: 14px !important"
                  >⌃⌘F</kbd
                >
                or
                <kbd
                  class="px-2 py-1 bg-white/20 rounded"
                  style="font-size: 14px !important"
                  >Ctrl+Cmd+F</kbd
                ></span
              >
              <span v-else
                >Press
                <kbd
                  class="px-2 py-1 bg-white/20 rounded"
                  style="font-size: 14px !important"
                  >F11</kbd
                ></span
              >
              to enter fullscreen mode.
            </p>
          </div>
          <button
            @click="dismissFullscreenInstructions"
            class="text-white/70 hover:text-white cursor-pointer"
            style="font-size: 16px !important"
          >
            <i class="pi pi-times" style="font-size: 16px !important"></i>
          </button>
        </div>
        <!-- Progress bar -->
        <div
          class="absolute bottom-0 left-0 right-0 h-1 bg-white/20 overflow-hidden"
        >
          <div class="progress-bar h-full bg-white/80"></div>
        </div>
      </div>
    </div>

    <!-- Translation Display - Multi-language Split Screen -->
    <div
      v-if="outputLanguages.length > 1"
      class="split-view-container"
      :class="splitViewGridClass"
      data-testid="split-view-container"
    >
      <div
        v-for="lang in outputLanguages"
        :key="lang"
        class="language-pane"
        :data-testid="`language-pane-${lang}`"
      >
        <div class="language-header" :data-testid="`language-header-${lang}`">
          {{ getLanguageDisplayName(lang) }}
        </div>
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
            :data-testid="`finalized-paragraph-${lang}-${index}`"
          >
            {{ paragraph }}
          </p>
          <p
            v-if="currentLiveTranslationByLang[lang]"
            class="live-translation"
            :data-testid="`live-translation-${lang}`"
          >
            {{ currentLiveTranslationByLang[lang] }}
          </p>
        </div>
      </div>
    </div>

    <!-- Translation Display - Single Language -->
    <div
      v-else
      class="translation-content"
      data-testid="single-language-container"
    >
      <p
        v-for="(paragraph, index) in singleLanguageParagraphs"
        :key="'para-' + index"
        class="finalized-paragraph"
        :data-testid="`finalized-paragraph-${index}`"
      >
        {{ paragraph }}
      </p>
      <p
        v-if="singleLanguageLiveTranslation"
        class="live-translation"
        data-testid="live-translation"
      >
        {{ singleLanguageLiveTranslation }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue';
import type { TranslatorSettings } from '../stores/translator';
import { getLanguageDisplayName } from '../utils/languageHelpers';
import { polyfillCountryFlagEmojis } from 'country-flag-emoji-polyfill';

const textEl = ref<HTMLDivElement>();
// Multi-language format (works for single language too)
const finalizedParagraphsByLang = ref<Record<string, string[]>>({});
const currentLiveTranslationByLang = ref<Record<string, string>>({});
const outputLanguages = ref<string[]>([]);
const languagePaneRefs = ref<Record<string, HTMLDivElement>>({});

// Extract session ID and language from URL
const urlParams = new URLSearchParams(window.location.search);
const sessionId = urlParams.get('session') || '';
const specificLanguage = urlParams.get('lang') || null; // For multi-window mode

// Fullscreen instructions
const showFullscreenInstructions = ref(true);
const osType = ref<'mac' | 'windows' | 'linux'>('windows');

// Detect OS for fullscreen instructions
function detectOS() {
  const platform = navigator.platform.toLowerCase();
  const userAgent = navigator.userAgent.toLowerCase();

  if (platform.includes('mac') || userAgent.includes('mac')) {
    osType.value = 'mac';
  } else if (platform.includes('linux') || userAgent.includes('linux')) {
    osType.value = 'linux';
  } else {
    osType.value = 'windows';
  }
}

function dismissFullscreenInstructions() {
  showFullscreenInstructions.value = false;
}

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
  // Single language uses the non-split view
  return 'grid-cols-1';
});

// For single language mode, extract the first language's data from multi-language structure
const singleLanguageParagraphs = computed(() => {
  if (outputLanguages.value.length === 1) {
    const lang = outputLanguages.value[0];
    return finalizedParagraphsByLang.value[lang] || [];
  }
  return [];
});

const singleLanguageLiveTranslation = computed(() => {
  if (outputLanguages.value.length === 1) {
    const lang = outputLanguages.value[0];
    return currentLiveTranslationByLang.value[lang] || '';
  }
  return '';
});

// Load settings from localStorage
function loadSettings() {
  const settingsStr = localStorage.getItem(`translator_settings_${sessionId}`);
  if (settingsStr) {
    try {
      const settings: TranslatorSettings = JSON.parse(settingsStr);
      presentationSettings.value = settings.presentation;

      // Build list of all languages to display (output + input if enabled)
      const allLanguages = [...settings.outputLanguages];
      if (settings.presentation.showInputLanguage) {
        // Prepend input language to show it first
        allLanguages.unshift(settings.inputLanguage);
      }

      // If specific language is set (multi-window mode), only show that language
      if (specificLanguage) {
        outputLanguages.value = [specificLanguage];
      } else {
        outputLanguages.value = allLanguages;
      }
    } catch (e) {
      console.error('Failed to load settings from localStorage', e);
    }
  }
}

// Listen for storage events (cross-window communication)
function handleStorageEvent(e: StorageEvent) {
  const presentationKey = `translator_presentation_${sessionId}`;
  const settingsKey = `translator_settings_${sessionId}`;
  const pausedKey = `translator_paused_${sessionId}`;
  const closeKey = `translator_close_${sessionId}`;

  // Listen for close signal from another window
  if (e.key === closeKey && e.newValue) {
    window.close();
    return;
  }

  if (e.key === presentationKey && e.newValue) {
    try {
      const data = JSON.parse(e.newValue);

      if (data.isLive) {
        // Filter to specific language if in multi-window mode
        if (specificLanguage) {
          currentLiveTranslationByLang.value = {
            [specificLanguage]: data.translations[specificLanguage] || '',
          };
        } else {
          currentLiveTranslationByLang.value = data.translations;
        }
      } else {
        // Filter to specific language if in multi-window mode
        if (specificLanguage) {
          finalizedParagraphsByLang.value = {
            [specificLanguage]: data.finalized[specificLanguage] || [],
          };
        } else {
          finalizedParagraphsByLang.value = data.finalized || {};
        }
        currentLiveTranslationByLang.value = {};
      }
      scrollToBottom();
    } catch (err) {
      console.error('Failed to parse presentation data', err);
    }
  } else if (e.key === settingsKey && e.newValue === null) {
    // Settings removed means presentation stopped
    console.log(
      '[PresentationView] Settings removed, closing window. Session:',
      sessionId,
      'Lang:',
      specificLanguage || 'all',
    );
    window.close();
  } else if (e.key === pausedKey) {
    if (e.newValue === null) {
      // Resumed - clear to avoid showing stale content
      finalizedParagraphsByLang.value = {};
      currentLiveTranslationByLang.value = {};
    } else {
      // Paused - clear display
      finalizedParagraphsByLang.value = {};
      currentLiveTranslationByLang.value = {};
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

// Check for existing presentation data on mount
function checkExistingData() {
  const presentationStr = localStorage.getItem(
    `translator_presentation_${sessionId}`,
  );
  if (presentationStr) {
    try {
      const data = JSON.parse(presentationStr);
      // Always expect multi-language format
      if (
        data.finalized &&
        typeof data.finalized === 'object' &&
        !Array.isArray(data.finalized)
      ) {
        // Filter to specific language if in multi-window mode
        if (specificLanguage) {
          if (data.finalized[specificLanguage]) {
            finalizedParagraphsByLang.value = {
              [specificLanguage]: data.finalized[specificLanguage],
            };
          }
        } else {
          finalizedParagraphsByLang.value = data.finalized;
        }
      }
    } catch (e) {
      console.error('Failed to load existing presentation data', e);
    }
  }
}

onMounted(() => {
  loadSettings();
  checkExistingData();
  detectOS();

  // Hide the outer navigation element
  const navigation = document.getElementById('navigation');
  if (navigation) {
    navigation.style.display = 'none';
  }

  // Polyfill country flag emojis
  polyfillCountryFlagEmojis();

  // Listen for storage changes from the control window
  window.addEventListener('storage', handleStorageEvent);

  // Auto-dismiss fullscreen instructions after 10 seconds
  setTimeout(() => {
    showFullscreenInstructions.value = false;
  }, 10000);

  // Clean up on window close - signal to control window and other presentation windows
  // Use both beforeunload and unload for better browser compatibility
  const cleanupStorage = () => {
    // Signal to close all windows by setting a close flag
    localStorage.setItem(
      `translator_close_${sessionId}`,
      JSON.stringify({ timestamp: Date.now() }),
    );
    // Then remove all session data
    localStorage.removeItem(`translator_settings_${sessionId}`);
    localStorage.removeItem(`translator_paused_${sessionId}`);
    localStorage.removeItem(`translator_presentation_${sessionId}`);
    localStorage.removeItem(`translator_close_${sessionId}`);
  };

  window.addEventListener('beforeunload', cleanupStorage);
  window.addEventListener('unload', cleanupStorage);

  // Also listen for page hide (more reliable for programmatic closes)
  window.addEventListener('pagehide', cleanupStorage);
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
  box-sizing: border-box !important;
}

/* Language header */
.language-header {
  flex-shrink: 0 !important;
  background: rgba(0, 0, 0, 0.5) !important;
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

/* Fullscreen instructions keyboard shortcut styling */
kbd {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 0.25rem;
  font-family: monospace;
  font-size: 0.875rem;
}

/* Progress bar animation for fullscreen instructions */
.progress-bar {
  animation: progressAnimation 10s linear forwards;
  transform-origin: left;
}

@keyframes progressAnimation {
  from {
    transform: scaleX(0);
  }
  to {
    transform: scaleX(1);
  }
}
</style>
