<template>
  <Card class="h-full">
    <template #title>
      <div class="flex items-start justify-between gap-3">
        <div>
          <div class="text-lg font-semibold text-surface-900">
            {{ session.displayName }}
          </div>
          <div class="text-sm text-surface-500">
            Hosted by {{ session.operatorName }}
          </div>
        </div>
        <Chip
          :label="statusLabel"
          :severity="statusSeverity"
          class="text-xs px-2 py-0.5"
        />
      </div>
    </template>

    <template #content>
      <div class="space-y-3 text-sm text-surface-700">
        <div class="flex items-center gap-2">
          <i class="pi pi-microphone text-xs"></i>
          <span class="font-medium">Input:</span>
          <span>{{ inputLanguage }}</span>
        </div>
        <div class="flex items-center gap-2">
          <i class="pi pi-arrow-right text-xs"></i>
          <span class="font-medium">Output:</span>
          <span>{{ outputLanguages }}</span>
        </div>
        <div class="flex flex-col gap-2">
          <div class="flex items-center gap-2">
            <i class="pi pi-clock text-xs"></i>
            <span class="font-medium">Started:</span>
            <span>{{ formatDateTime(session.startTime) }}</span>
          </div>
          <div class="flex items-center gap-2">
            <i class="pi pi-users text-xs"></i>
            <span class="font-medium">Readers:</span>
            <span>{{ clientsDisplay }}</span>
          </div>
        </div>
        <p v-if="isFull" class="text-xs text-surface-500">
          This session is already full.
        </p>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end">
        <Button
          icon="pi pi-sign-in"
          label="Join"
          severity="primary"
          :disabled="isFull"
          @click="emit('join', session)"
        />
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Card from '@churchtools-extensions/prime-volt/Card.vue';
import Chip from '@churchtools-extensions/prime-volt/Chip.vue';
import Button from '@churchtools-extensions/prime-volt/Button.vue';
import type { StreamedSessionMetadata } from '../../types/streamedSession';
import { getLanguageDisplayName } from '../../utils/languageHelpers';

const props = defineProps<{
  session: StreamedSessionMetadata;
}>();

const emit = defineEmits<{
  (event: 'join', session: StreamedSessionMetadata): void;
}>();

const statusSeverity = computed(() =>
  props.session.status === 'running' ? 'success' : 'warn',
);

const statusLabel = computed(() =>
  props.session.status === 'running' ? 'Running' : 'Paused',
);

const inputLanguage = computed(() =>
  getLanguageDisplayName(props.session.inputLanguage, 'input'),
);

const outputLanguages = computed(() =>
  props.session.outputLanguages
    .map((lang) => getLanguageDisplayName(lang, 'output'))
    .join(', '),
);

const isFull = computed(() =>
  props.session.maxClients
    ? props.session.currentClients >= props.session.maxClients
    : false,
);

const clientsDisplay = computed(() =>
  props.session.maxClients
    ? `${props.session.currentClients} / ${props.session.maxClients}`
    : `${props.session.currentClients} / ∞`,
);

function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
</script>
