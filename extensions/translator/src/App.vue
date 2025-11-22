<template>
  <!-- Presentation Mode -->
  <PresentationView v-if="isPresentationMode" />

  <!-- Loading State -->
  <div
    v-else-if="store.initializing"
    class="min-h-screen flex items-center justify-center"
  >
    <div class="text-center space-y-4">
      <i class="pi pi-spin pi-spinner text-4xl text-primary"></i>
      <p class="text-lg text-surface-600 dark:text-surface-400">
        Loading translator...
      </p>
    </div>
  </div>

  <!-- Normal Mode -->
  <div v-else class="min-h-screen flex flex-col">
    <div class="flex-1 p-4">
      <Tabs v-model:value="activeTab">
        <TabList>
          <Tab value="settings">Settings</Tab>
          <Tab value="translate">Translate</Tab>
          <Tab value="reports">Reports</Tab>
        </TabList>
        <TabPanels>
          <TabPanel value="settings">
            <SettingsView />
          </TabPanel>
          <TabPanel value="translate">
            <TranslateView />
          </TabPanel>
          <TabPanel value="reports">
            <ReportsView />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  </div>

  <!-- Global Confirm Dialog -->
  <ConfirmDialog />
  <!-- Global Toast -->
  <Toast />
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import type { Person } from '@churchtools-extensions/ct-utils/ct-types';
import { churchtoolsClient } from '@churchtools/churchtools-client';
import SettingsView from './views/SettingsView.vue';
import TranslateView from './views/TranslateView.vue';
import ReportsView from './views/ReportsView.vue';
import PresentationView from './views/PresentationView.vue';
import Tabs from '@churchtools-extensions/prime-volt/Tabs.vue';
import TabList from '@churchtools-extensions/prime-volt/TabList.vue';
import Tab from '@churchtools-extensions/prime-volt/Tab.vue';
import TabPanels from '@churchtools-extensions/prime-volt/TabPanels.vue';
import TabPanel from '@churchtools-extensions/prime-volt/TabPanel.vue';
import ConfirmDialog from '@churchtools-extensions/prime-volt/ConfirmDialog.vue';
import Toast from '@churchtools-extensions/prime-volt/Toast.vue';
import { useTranslatorStore } from './stores/translator';

// Check if we're in presentation mode
const isPresentationMode = computed(() => {
  const params = new URLSearchParams(window.location.search);
  return params.get('presentation') === 'true';
});

// Active tab state (default to translate)
const activeTab = ref('translate');

const user = ref<Person | null>(null);
const store = useTranslatorStore();

declare const window: Window &
  typeof globalThis & {
    settings: {
      base_url?: string;
    };
  };

const baseUrl = window.settings?.base_url ?? import.meta.env.VITE_API_BASE_URL;
churchtoolsClient.setBaseUrl(baseUrl);

async function init() {
  // Skip initialization in presentation mode
  if (isPresentationMode.value) {
    return;
  }

  try {
    const username = import.meta.env.VITE_USERNAME;
    const password = import.meta.env.VITE_PASSWORD;
    if (import.meta.env.MODE === 'development' && username && password) {
      await churchtoolsClient.post('/login', { username, password });
    }
    user.value = await churchtoolsClient.get<Person>(`/whoami`);

    // Load settings
    await store.loadSettings();
  } catch (e) {
    console.error('Failed to init', e);
  }
}

onMounted(() => {
  void init();
});
</script>
