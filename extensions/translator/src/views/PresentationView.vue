<template>
  <div
    ref="textEl"
    class="fixed inset-0 overflow-auto translator-presentation-root"
    :style="{
      background: presentationSettings.background,
      color: presentationSettings.color,
      fontFamily: presentationSettings.font,
      fontSize: presentationSettings.fontSize,
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

    <!-- Translation Display -->
    <div v-else>
      <p
        v-for="(paragraph, index) in finalizedParagraphs"
        :key="'para-' + index"
        :style="{ margin: presentationSettings.margin }"
      >
        {{ paragraph }}
      </p>
      <p
        v-if="currentLiveTranslation"
        :style="{
          margin: presentationSettings.margin,
          color: presentationSettings.liveColor,
        }"
      >
        {{ currentLiveTranslation }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { LoremIpsum } from 'lorem-ipsum';
import Button from '@churchtools-extensions/prime-volt/Button.vue';
import type { TranslatorSettings } from '../stores/translator';

const textEl = ref<HTMLDivElement>();
const finalizedParagraphs = ref<string[]>([]);
const currentLiveTranslation = ref('');
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
});

// Load settings from localStorage
function loadSettings() {
  const settingsStr = localStorage.getItem('translator_settings');
  if (settingsStr) {
    try {
      const settings: TranslatorSettings = JSON.parse(settingsStr);
      presentationSettings.value = settings.presentation;
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
      if (data.isLive) {
        currentLiveTranslation.value = data.text;
      } else {
        finalizedParagraphs.value = data.finalized || [];
        currentLiveTranslation.value = '';
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
    if (textEl.value) {
      textEl.value.scrollTop = textEl.value.scrollHeight;
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
      if (data.finalized && data.finalized.length > 0) {
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
});
</script>

<style scoped>
/* Hide scrollbars without removing scrolling support. Applies cross-browser. */
.translator-presentation-root {
  -ms-overflow-style: none; /* IE and Edge */
  scrollbar-width: none; /* Firefox */
}
.translator-presentation-root::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Opera */
  width: 0;
  height: 0;
}
</style>
