<template>
  <div class="min-h-screen flex flex-col">
    <div class="flex-1 p-4">
      <Tabs :value="activeTab">
        <TabList>
          <Tab value="user">User Demo</Tab>
          <Tab value="showcase">Showcase</Tab>
          <Tab value="running-dinner">Running Dinner</Tab>
          <Tab value="mitmachen">Mitmachen</Tab>
        </TabList>
        <TabPanels>
          <TabPanel value="user">
            <div class="space-y-4">
              <h2 class="text-xl font-semibold">User Demo</h2>
              <div v-if="user" class="text-sm space-y-2">
                <p><span class="font-medium">ID:</span> {{ user.id }}</p>
                <p>
                  <span class="font-medium">Name:</span> {{ user.firstName }}
                  {{ user.lastName }}
                </p>
                <p><span class="font-medium">Email:</span> {{ user.email }}</p>
                <details class="mt-4">
                  <summary class="cursor-pointer text-primary text-sm">
                    Raw user object
                  </summary>
                  <pre
                    class="mt-2 text-xs rounded bg-surface-100 dark:bg-surface-800 p-3 overflow-auto"
                    >{{ user }}</pre
                  >
                </details>
              </div>
              <div
                v-else
                class="text-sm text-surface-500 dark:text-surface-400"
              >
                Benutzerdaten werden geladen…
              </div>
            </div>
          </TabPanel>
          <TabPanel value="showcase">
            <Showcase />
          </TabPanel>
          <TabPanel value="running-dinner">
            <RunningDinner />
          </TabPanel>
          <TabPanel value="mitmachen">
            <Mitmachen />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { Person } from './utils/ct-types';
import { churchtoolsClient } from '@churchtools/churchtools-client';
import Showcase from './Showcase.vue';
import RunningDinner from './RunningDinner.vue';
import Mitmachen from './Mitmachen.vue';
import Tabs from '@/volt/Tabs.vue';
import TabList from '@/volt/TabList.vue';
import Tab from '@/volt/Tab.vue';
import TabPanels from '@/volt/TabPanels.vue';
import TabPanel from '@/volt/TabPanel.vue';

// Active tab state (default to user demo)
const activeTab = ref('user');

const user = ref<Person | null>(null);

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
    user.value = await churchtoolsClient.get<Person>(`/whoami`);
  } catch (e) {
    // optionally surface error state in UI later
    console.error('Failed to init user', e);
  }
}

onMounted(() => {
  void init();
});
</script>
