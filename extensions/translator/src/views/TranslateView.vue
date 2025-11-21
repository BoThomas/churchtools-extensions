<template>
  <div class="space-y-6">
    <h2 class="text-2xl font-semibold">Translation Control</h2>

    <div
      v-if="!hasApiCredentials"
      class="p-4 bg-orange-100 dark:bg-orange-900 rounded"
    >
      <p class="text-sm">
        Please configure your Azure API credentials in the Settings tab first.
      </p>
    </div>

    <div v-else class="space-y-6">
      <!-- Coming soon placeholder -->
      <div class="p-8 text-center bg-surface-100 dark:bg-surface-800 rounded">
        <i class="pi pi-language text-6xl text-primary mb-4"></i>
        <h3 class="text-xl font-semibold mb-2">
          Translation controls coming soon
        </h3>
        <p class="text-surface-600 dark:text-surface-400">
          This will include language selection, presentation controls, and test
          mode.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useTranslatorStore } from '../stores/translator';

const store = useTranslatorStore();

const hasApiCredentials = computed(() => {
  return !!store.settings.azureApiKey && !!store.settings.azureRegion;
});
</script>
