<template>
  <!-- Loading State -->
  <div
    v-if="initializing"
    class="min-h-screen flex items-center justify-center"
  >
    <div class="text-center space-y-4">
      <i class="pi pi-spin pi-spinner text-4xl text-primary"></i>
      <p class="text-lg text-surface-600 dark:text-surface-400">
        Loading Running Dinner Groups...
      </p>
    </div>
  </div>

  <!-- Main Application -->
  <div v-else class="min-h-screen flex flex-col">
    <div class="flex-1 p-4">
      <OrganizerView />
    </div>
  </div>

  <!-- Global Dialogs -->
  <ConfirmDialog :style="{ maxWidth: '90vw', maxHeight: '90vh' }" />
  <Toast />
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { churchtoolsClient } from '@churchtools/churchtools-client';
import { useEventMetadataStore } from './stores/eventMetadata';
import { useDinnerGroupStore } from './stores/dinnerGroup';
import { useRouteStore } from './stores/route';
import OrganizerView from './views/OrganizerView.vue';
import Toast from '@churchtools-extensions/prime-volt/Toast.vue';
import ConfirmDialog from '@churchtools-extensions/prime-volt/ConfirmDialog.vue';

const initializing = ref(true);

const eventMetadataStore = useEventMetadataStore();
const dinnerGroupStore = useDinnerGroupStore();
const routeStore = useRouteStore();

declare const window: Window &
  typeof globalThis & {
    settings: {
      base_url?: string;
    };
  };

const baseUrl = window.settings?.base_url ?? import.meta.env.VITE_API_BASE_URL;
churchtoolsClient.setBaseUrl(baseUrl);

async function init() {
  try {
    // Development mode login
    const username = import.meta.env.VITE_USERNAME;
    const password = import.meta.env.VITE_PASSWORD;
    if (import.meta.env.MODE === 'development' && username && password) {
      await churchtoolsClient.post('/login', { username, password });
    }

    // Load all data from KV stores in parallel
    await Promise.all([
      eventMetadataStore.fetchAll(),
      dinnerGroupStore.fetchAll(),
      routeStore.fetchAll(),
    ]);
  } catch (error) {
    console.error('Failed to initialize app:', error);
  } finally {
    initializing.value = false;
  }
}

onMounted(() => {
  void init();
});
</script>
