<template>
  <!-- Presentation Mode -->
  <PresentationView v-if="isPresentationMode" />

  <!-- Loading State -->
  <div
    v-else-if="settingsStore.initializing"
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
      <Tabs v-model:value="activeTab" data-testid="main-tabs">
        <TabList>
          <Tab value="settings" data-testid="tab-settings">Settings</Tab>
          <Tab value="translate" data-testid="tab-translate">Translate</Tab>
          <Tab value="active-sessions" data-testid="tab-active-sessions">
            Active Sessions
          </Tab>
          <Tab value="reports" data-testid="tab-reports">Reports</Tab>
        </TabList>
        <TabPanels>
          <TabPanel value="settings">
            <SettingsView />
          </TabPanel>
          <TabPanel value="translate">
            <TranslateView />
          </TabPanel>
          <TabPanel value="active-sessions">
            <ActiveSessionsView :active-tab="activeTab" />
          </TabPanel>
          <TabPanel value="reports">
            <ReportsView :active-tab="activeTab" />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  </div>

  <!-- Global Confirm Dialog -->
  <ConfirmDialog :style="{ maxWidth: '90vw' }" />
  <!-- Global Toast -->
  <Toast />
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import type { Person } from '@churchtools-extensions/ct-utils/ct-types';
import { churchtoolsClient } from '@churchtools/churchtools-client';
import SettingsView from './views/SettingsView.vue';
import TranslateView from './views/TranslateView.vue';
import ActiveSessionsView from './views/ActiveSessionsView.vue';
import ReportsView from './views/ReportsView.vue';
import PresentationView from './views/PresentationView.vue';
import Tabs from '@churchtools-extensions/prime-volt/Tabs.vue';
import TabList from '@churchtools-extensions/prime-volt/TabList.vue';
import Tab from '@churchtools-extensions/prime-volt/Tab.vue';
import TabPanels from '@churchtools-extensions/prime-volt/TabPanels.vue';
import TabPanel from '@churchtools-extensions/prime-volt/TabPanel.vue';
import ConfirmDialog from '@churchtools-extensions/prime-volt/ConfirmDialog.vue';
import Toast from '@churchtools-extensions/prime-volt/Toast.vue';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import { useSettingsStore } from './stores/settings';
import { useSessionStore } from './stores/session';

// Check if we're in presentation mode
const isPresentationMode = computed(() => {
  const params = new URLSearchParams(window.location.search);
  return params.get('presentation') === 'true';
});

// Active tab state (default to translate)
const activeTab = ref('translate');

const user = ref<Person | null>(null);
const settingsStore = useSettingsStore();
const sessionStore = useSessionStore();
const confirm = useConfirm();
const toast = useToast();

declare const window: Window &
  typeof globalThis & {
    settings: {
      base_url?: string;
    };
    __USE_MOCK_PERSISTENCE__?: boolean;
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
    // Only auto-login if we are in dev mode AND NOT running E2E tests (mock persistence)
    if (
      import.meta.env.MODE === 'development' &&
      username &&
      password &&
      !window.__USE_MOCK_PERSISTENCE__
    ) {
      await churchtoolsClient.post('/login', { username, password });
    }
    user.value = await churchtoolsClient.get<Person>(`/whoami`);

    // Load API settings and translation setting variants
    await Promise.all([
      settingsStore.loadApiSettings(),
      settingsStore.loadSettingVariants(user.value.id),
      settingsStore.loadOperatorSecret(),
      settingsStore.loadReaderConfig(),
    ]);

    // Check for active session after app loads (non-blocking)
    checkForActiveSessionRecovery();
  } catch (e) {
    console.error('Failed to init', e);
  }
}

async function checkForActiveSessionRecovery() {
  const activeSessionData = await sessionStore.checkForActiveSession();

  if (!activeSessionData) return;

  const { session, reference } = activeSessionData;
  const sessionAge = Date.now() - new Date(reference.startTime).getTime();
  const ageMinutes = Math.floor(sessionAge / 1000 / 60);

  const outputLangs = session.outputLanguages || [session.outputLanguage];
  const sessionDetails = `${session.mode} mode • ${session.status} • ${session.inputLanguage} → ${outputLangs?.join(', ') || 'N/A'}`;

  confirm.require({
    header: 'Active Session Found',
    message: `Session started ${ageMinutes} minute(s) ago (${sessionDetails}). What would you like to do?`,
    icon: 'pi pi-exclamation-triangle',
    rejectProps: {
      label: 'End Session',
      severity: 'danger',
      outlined: true,
    },
    acceptProps: {
      label: 'Resume',
      severity: 'success',
    },
    accept: async () => {
      try {
        await sessionStore.resumeSessionFromCrash(
          reference.sessionId,
          session.status,
        );

        // TODO: Navigate to TranslateView and reconnect UI
        // activeTab.value = 'translate';
        // await reconnectSessionUI(reference.sessionId);

        toast.add({
          severity: 'success',
          summary: 'Session Resumed',
          detail: 'Your translation session has been resumed',
          life: 3000,
        });
      } catch (e: any) {
        toast.add({
          severity: 'error',
          summary: 'Resume Failed',
          detail: e.message || 'Failed to resume session',
          life: 5000,
        });
      }
    },
    reject: async () => {
      try {
        await sessionStore.endSession(reference.sessionId, {
          status: 'completed',
          endTime: new Date().toISOString(),
        });

        toast.add({
          severity: 'info',
          summary: 'Session Ended',
          detail: 'Your previous session has been ended',
          life: 3000,
        });
      } catch (e: any) {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to end session',
          life: 5000,
        });
      }
    },
  });
}

onMounted(() => {
  void init();
});
</script>
