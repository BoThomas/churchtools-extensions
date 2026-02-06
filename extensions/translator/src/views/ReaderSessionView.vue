<template>
  <div class="min-h-screen flex flex-col bg-surface-0 dark:bg-surface-900">
    <div
      class="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-surface-200 dark:border-surface-700"
    >
      <div class="min-w-0">
        <div
          class="text-base sm:text-lg font-semibold text-surface-900 dark:text-surface-0 truncate"
        >
          {{ session?.displayName ?? 'Active Session' }}
        </div>
        <div class="text-xs sm:text-sm text-surface-500 truncate">
          Hosted by {{ session?.operatorName ?? 'Unknown' }}
        </div>
      </div>
      <Button
        icon="pi pi-sign-out"
        label="Leave"
        severity="secondary"
        @click="emit('leave')"
        data-testid="button-leave-session"
        class="shrink-0"
      />
    </div>

    <div class="flex-1 p-4 md:p-6">
      <div
        class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4"
      >
        <Select
          v-model="selectedLanguage"
          :options="availableLanguages"
          option-label="name"
          option-value="code"
          placeholder="Select language"
          class="w-full md:w-48"
        />
        <div class="flex flex-wrap items-center gap-2 md:gap-4">
          <ToggleButton
            v-model="showTechnical"
            on-label="Technical"
            off-label="Technical"
            on-icon="pi pi-code"
            off-icon="pi pi-code"
            class="shrink-0"
          />
          <ToggleButton
            v-model="autoScroll"
            on-label="Auto-scroll"
            off-label="Auto-scroll"
            on-icon="pi pi-arrow-down"
            off-icon="pi pi-pause"
            class="shrink-0"
          />
          <div v-if="showTechnical" class="text-sm text-surface-500">
            {{ messageCount }} messages
          </div>
          <div v-if="error" class="text-sm text-red-400">
            {{ error }}
          </div>
        </div>
      </div>
      <div
        ref="scrollContainer"
        class="h-[calc(100vh-220px)] md:h-[70vh] overflow-y-auto rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 p-3 md:p-4"
        @scroll="handleScroll"
      >
        <pre
          v-if="showTechnical"
          class="whitespace-pre-wrap text-sm text-surface-800 dark:text-surface-100"
          >{{ formattedMessages }}</pre
        >
        <div v-else class="space-y-2">
          <div
            v-for="msg in displayMessages"
            :key="msg.id"
            :class="
              msg.isLive
                ? 'text-surface-400'
                : 'text-surface-900 dark:text-surface-0'
            "
            class="text-base sm:text-lg wrap-break-word"
          >
            {{ msg.text }}
          </div>
          <div
            v-if="displayMessages.length === 0"
            class="text-surface-500 text-center py-8"
          >
            Waiting for translations...
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch, nextTick } from 'vue';
import Button from '@churchtools-extensions/prime-volt/Button.vue';
import Select from '@churchtools-extensions/prime-volt/Select.vue';
import ToggleButton from '@churchtools-extensions/prime-volt/ToggleButton.vue';
import type {
  SessionTranslationPayload,
  StreamedSessionMessage,
  StreamedSessionMetadata,
} from '../types/streamedSession';
import translationOptions from '../translation-options.json';

interface DisplayMessage {
  id: string;
  text: string;
  isLive: boolean;
  timestamp: string;
}

const props = defineProps<{
  session: StreamedSessionMetadata | null;
  messages: StreamedSessionMessage[];
  error?: string | null;
}>();

const emit = defineEmits<{
  (event: 'leave'): void;
}>();

const scrollContainer = ref<HTMLElement | null>(null);
const selectedLanguage = ref<string>('original');
const showTechnical = ref<boolean>(false);
const autoScroll = ref<boolean>(true);
const isUserScrolling = ref<boolean>(false);

const availableLanguages = computed(() => {
  const languages: Array<{ code: string; name: string }> = [];

  // Add input language first
  if (props.session?.inputLanguage) {
    const inputLang = translationOptions.inputLanguages.find(
      (l) => l.code === props.session!.inputLanguage,
    );
    languages.push({
      code: 'original',
      name: inputLang?.name ?? `${props.session.inputLanguage} (Original)`,
    });
  }

  // Add output languages
  if (props.session?.outputLanguages) {
    for (const code of props.session.outputLanguages) {
      const lang = translationOptions.outputLanguages.find(
        (l) => l.code === code,
      );
      languages.push({
        code,
        name: lang?.name ?? code,
      });
    }
  }

  return languages;
});

const formattedMessages = computed(() => {
  if (!props.messages.length) {
    return 'Waiting for messages...';
  }

  return props.messages
    .map((message) => {
      const payload = JSON.stringify(message.payload, null, 2);
      return `[${message.type}]\n${payload}`;
    })
    .join('\n\n');
});

const displayMessages = computed(() => {
  if (showTechnical.value) return [];

  const result: DisplayMessage[] = [];
  let lastFinalIndex = -1;
  let lastLiveIndex = -1;

  // Find the index of the last final message
  for (let i = props.messages.length - 1; i >= 0; i--) {
    const msg = props.messages[i];
    if (msg.type === 'translation-final') {
      const payload = msg.payload as SessionTranslationPayload;
      if (payload.translations[selectedLanguage.value]) {
        lastFinalIndex = i;
        break;
      }
    }
  }

  // Find the index of the last live message (after last final)
  for (let i = props.messages.length - 1; i > lastFinalIndex; i--) {
    const msg = props.messages[i];
    if (msg.type === 'translation-live') {
      const payload = msg.payload as SessionTranslationPayload;
      if (payload.translations[selectedLanguage.value]) {
        lastLiveIndex = i;
        break;
      }
    }
  }

  // Build display list: all finals + only the most recent live
  for (let i = 0; i < props.messages.length; i++) {
    const msg = props.messages[i];
    if (msg.type !== 'translation-live' && msg.type !== 'translation-final')
      continue;

    const payload = msg.payload as SessionTranslationPayload;
    const translation =
      selectedLanguage.value === 'original'
        ? payload.original
        : payload.translations[selectedLanguage.value];
    if (!translation) continue;

    if (!payload.isLive) {
      // Keep all finals
      result.push({
        id: `final-${payload.timestamp}-${i}`,
        text: translation,
        isLive: false,
        timestamp: payload.timestamp,
      });
    } else if (i === lastLiveIndex) {
      // Only keep the most recent live (replaces previous lives)
      result.push({
        id: `live-${payload.timestamp}-${i}`,
        text: translation,
        isLive: true,
        timestamp: payload.timestamp,
      });
    }
  }

  return result;
});

const messageCount = computed(() => props.messages.length);

function scrollToBottom() {
  if (!scrollContainer.value || !autoScroll.value || isUserScrolling.value)
    return;
  scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight;
}

function handleScroll() {
  if (!scrollContainer.value) return;

  const { scrollTop, scrollHeight, clientHeight } = scrollContainer.value;
  const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;

  if (!isAtBottom) {
    isUserScrolling.value = true;
    autoScroll.value = false;
  } else {
    isUserScrolling.value = false;
  }
}

watch(
  () => props.messages.length,
  () => {
    nextTick(() => {
      scrollToBottom();
    });
  },
);

watch(autoScroll, (newValue) => {
  if (newValue) {
    isUserScrolling.value = false;
    scrollToBottom();
  }
});

onMounted(() => {
  scrollToBottom();
});
</script>
