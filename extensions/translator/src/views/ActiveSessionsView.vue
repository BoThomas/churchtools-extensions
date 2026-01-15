<template>
  <div class="space-y-6 max-w-6xl">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-2">
        <Button
          icon="pi pi-refresh"
          label="Refresh"
          severity="secondary"
          :loading="loading"
          @click="loadSessions"
        />
      </div>
    </div>

    <Message v-if="error" severity="error" :closable="false">
      {{ error }}
    </Message>

    <div
      v-if="sessions.length === 0"
      class="bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg p-4"
    >
      <div
        class="flex flex-col items-center justify-center py-10 text-surface-500"
      >
        <i class="pi pi-language text-4xl mb-3 opacity-50"></i>
        <p class="text-sm text-center">
          No active translation sessions are available right now.
        </p>
      </div>
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <ActiveSessionCard
        v-for="session in sortedSessions"
        :key="session.webPubSubRoomId"
        :session="session"
        @join="handleJoin"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import Button from '@churchtools-extensions/prime-volt/Button.vue';
import Message from '@churchtools-extensions/prime-volt/Message.vue';
import { useWebPubSubStore } from '../stores/webpubsub';
import type { StreamedSessionMetadata } from '../types/streamedSession';
import ActiveSessionCard from '../components/active-sessions/ActiveSessionCard.vue';

const props = defineProps<{
  activeTab: string;
}>();

const store = useWebPubSubStore();

const sessions = ref<StreamedSessionMetadata[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

const sortedSessions = computed(() => {
  return [...sessions.value].sort((a, b) => {
    return (
      new Date(b.lastHeartbeat).getTime() - new Date(a.lastHeartbeat).getTime()
    );
  });
});

async function loadSessions() {
  loading.value = true;
  error.value = null;
  try {
    sessions.value = await store.getDiscoverableSessions();
  } catch (e: any) {
    error.value = e?.message ?? 'Failed to load active sessions.';
    console.error('Failed to load active sessions', e);
  } finally {
    loading.value = false;
  }
}

function handleJoin(session: StreamedSessionMetadata) {
  // TODO: Implement join flow (reader auth + opening session view).
  console.info('Join session requested', session);
}

watch(
  () => props.activeTab,
  (newTab) => {
    if (newTab === 'active-sessions') {
      loadSessions();
    }
  },
);
</script>
