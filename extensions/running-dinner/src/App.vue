<template>
  <!-- Loading State -->
  <div
    v-if="initializing"
    class="min-h-screen flex items-center justify-center"
  >
    <div class="text-center space-y-4">
      <i class="pi pi-spin pi-spinner text-4xl text-primary"></i>
      <p class="text-lg text-surface-600 dark:text-surface-400">
        Loading Running Dinner...
      </p>
    </div>
  </div>

  <!-- Main Application -->
  <div v-else class="min-h-screen flex flex-col">
    <div class="flex-1 p-4">
      <Tabs v-model:value="activeTab">
        <TabList>
          <Tab value="organizer">Organize</Tab>
          <Tab value="participant">Participate</Tab>
        </TabList>
        <TabPanels>
          <TabPanel value="organizer">
            <OrganizerView />
          </TabPanel>
          <TabPanel value="participant">
            <ParticipantView />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  </div>

  <!-- Global Dialogs -->
  <ConfirmDialog />
  <Toast />
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { churchtoolsClient } from '@churchtools/churchtools-client';
import OrganizerView from './views/OrganizerView.vue';
import ParticipantView from './views/ParticipantView.vue';
import Tabs from '@churchtools-extensions/prime-volt/Tabs.vue';
import TabList from '@churchtools-extensions/prime-volt/TabList.vue';
import Tab from '@churchtools-extensions/prime-volt/Tab.vue';
import TabPanels from '@churchtools-extensions/prime-volt/TabPanels.vue';
import TabPanel from '@churchtools-extensions/prime-volt/TabPanel.vue';
import ConfirmDialog from '@churchtools-extensions/prime-volt/ConfirmDialog.vue';
import Toast from '@churchtools-extensions/prime-volt/Toast.vue';

const activeTab = ref('participant');
const initializing = ref(true);

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
    const username = import.meta.env.VITE_USERNAME;
    const password = import.meta.env.VITE_PASSWORD;
    if (import.meta.env.MODE === 'development' && username && password) {
      await churchtoolsClient.post('/login', { username, password });
    }
  } catch (e) {
    console.error('Failed to init', e);
  } finally {
    initializing.value = false;
  }
}

onMounted(() => {
  init();
});
</script>
