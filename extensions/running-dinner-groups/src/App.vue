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
import { useEventMetadataStore } from './stores/eventMetadata';
import { useDinnerGroupStore } from './stores/dinnerGroup';
import { useRouteStore } from './stores/route';
import OrganizerView from './views/OrganizerView.vue';
import Toast from '@churchtools-extensions/prime-volt/volt/Toast.vue';
import ConfirmDialog from '@churchtools-extensions/prime-volt/volt/ConfirmDialog.vue';

const initializing = ref(true);

const eventMetadataStore = useEventMetadataStore();
const dinnerGroupStore = useDinnerGroupStore();
const routeStore = useRouteStore();

onMounted(async () => {
  try {
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
});
</script>
