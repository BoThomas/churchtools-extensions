<template>
  <div class="min-h-screen flex flex-col bg-surface-0 dark:bg-surface-900">
    <div
      class="flex items-center justify-between px-6 py-4 border-b border-surface-200 dark:border-surface-700"
    >
      <div>
        <div class="text-lg font-semibold text-surface-900 dark:text-surface-0">
          {{ session?.displayName ?? 'Active Session' }}
        </div>
        <div class="text-sm text-surface-500">
          Hosted by {{ session?.operatorName ?? 'Unknown' }}
        </div>
      </div>
      <Button
        icon="pi pi-sign-out"
        label="Leave"
        severity="secondary"
        @click="emit('leave')"
        data-testid="button-leave-session"
      />
    </div>

    <div class="flex-1 p-6">
      <div class="flex items-center justify-between mb-4">
        <div class="text-sm text-surface-500">
          {{ messageCount }} messages received
        </div>
        <div v-if="error" class="text-sm text-red-400">
          {{ error }}
        </div>
      </div>
      <div
        ref="scrollContainer"
        class="h-[70vh] overflow-y-auto rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 p-4"
      >
        <pre
          class="whitespace-pre-wrap text-sm text-surface-800 dark:text-surface-100"
          >{{ formattedMessages }}</pre
        >
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import Button from '@churchtools-extensions/prime-volt/Button.vue';
import type {
  StreamedSessionMessage,
  StreamedSessionMetadata,
} from '../types/streamedSession';

const props = defineProps<{
  session: StreamedSessionMetadata | null;
  messages: StreamedSessionMessage[];
  error?: string | null;
}>();

const emit = defineEmits<{
  (event: 'leave'): void;
}>();

const scrollContainer = ref<HTMLElement | null>(null);

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

const messageCount = computed(() => props.messages.length);

function scrollToBottom() {
  if (!scrollContainer.value) return;
  scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight;
}

watch(
  () => props.messages.length,
  () => {
    scrollToBottom();
  },
);

onMounted(() => {
  scrollToBottom();
});
</script>
