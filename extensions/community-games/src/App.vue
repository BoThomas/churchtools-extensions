<template>
  <div
    v-if="store.initializing"
    class="min-h-screen flex items-center justify-center"
  >
    <div class="text-center space-y-4">
      <i class="pi pi-spin pi-spinner text-4xl text-primary"></i>
      <p class="text-lg text-surface-600 dark:text-surface-400">
        Loading games...
      </p>
    </div>
  </div>

  <div v-else-if="activeGameId" class="min-h-screen flex flex-col">
    <GameView :game-id="activeGameId" @back="activeGameId = null" />
  </div>

  <div v-else class="min-h-screen flex flex-col">
    <div class="flex-1 p-4">
      <Tabs v-model:value="activeTab">
        <TabList>
          <Tab value="settings">Settings</Tab>
          <Tab value="lobby">Lobby</Tab>
        </TabList>
        <TabPanels>
          <TabPanel value="settings">
            <SettingsView />
          </TabPanel>
          <TabPanel value="lobby">
            <LobbyView @select-game="activeGameId = $event" />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  </div>

  <ConfirmDialog />
  <Toast />
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { churchtoolsClient } from '@churchtools/churchtools-client';
import SettingsView from './views/SettingsView.vue';
import LobbyView from './views/LobbyView.vue';
import GameView from './views/GameView.vue';
import Tabs from '@churchtools-extensions/prime-volt/Tabs.vue';
import TabList from '@churchtools-extensions/prime-volt/TabList.vue';
import Tab from '@churchtools-extensions/prime-volt/Tab.vue';
import TabPanels from '@churchtools-extensions/prime-volt/TabPanels.vue';
import TabPanel from '@churchtools-extensions/prime-volt/TabPanel.vue';
import ConfirmDialog from '@churchtools-extensions/prime-volt/ConfirmDialog.vue';
import Toast from '@churchtools-extensions/prime-volt/Toast.vue';
import { useGamesStore } from './stores/games';

const activeTab = ref('lobby');
const activeGameId = ref<string | null>(null);
const store = useGamesStore();

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

    await store.init();
  } catch (e) {
    console.error('Failed to init', e);
  }
}

onMounted(() => {
  void init();
});
</script>
