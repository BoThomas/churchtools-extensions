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
            <TranslateView ref="translateViewRef" />
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

  <!-- Resume Session Dialog -->
  <Dialog
    v-model:visible="resumeDialogVisible"
    :header="resumeDialogHeader"
    :modal="true"
    :closable="!resumeDialogLoading"
    :style="{ maxWidth: '90vw' }"
  >
    <div class="flex items-start gap-3">
      <i class="pi pi-exclamation-triangle text-xl text-surface-600"></i>
      <div>{{ resumeDialogMessage }}</div>
    </div>
    <template #footer>
      <div class="flex justify-end gap-2">
        <SecondaryButton
          :label="'End Session'"
          severity="danger"
          outlined
          :disabled="resumeDialogLoading"
          @click="handleResumeDialogEnd"
        />
        <Button
          :label="resumeDialogLoading ? 'Resuming...' : 'Resume'"
          severity="success"
          :loading="resumeDialogLoading"
          :disabled="resumeDialogLoading"
          @click="handleResumeDialogResume"
        />
      </div>
    </template>
  </Dialog>

  <!-- Global Confirm Dialog -->
  <ConfirmDialog :style="{ maxWidth: '90vw' }" />
  <!-- Global Toast -->
  <Toast />
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import type { Person } from '@churchtools-extensions/ct-utils/ct-types';
import type { StreamedSessionMetadata } from './types/streamedSession';
import type { TranslationSession } from './services/sessionLogger';
import type { ActiveSessionReference } from './types/streamedSession';
import { churchtoolsClient } from '@churchtools/churchtools-client';
import { useActiveTab } from './composables/useActiveTab';
import { KEY } from './config';
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
import Dialog from '@churchtools-extensions/prime-volt/Dialog.vue';
import Button from '@churchtools-extensions/prime-volt/Button.vue';
import SecondaryButton from '@churchtools-extensions/prime-volt/SecondaryButton.vue';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import { useSettingsStore } from './stores/settings';
import { useSessionStore } from './stores/session';
import { useWebPubSubStore } from './stores/webpubsub';
import {
  ensureTranslatorPersistance,
  getStreamedSessionsCategory,
} from './services/translatorPersistance';

// Check if we're in presentation mode
const isPresentationMode = computed(() => {
  const params = new URLSearchParams(window.location.search);
  return params.get('presentation') === 'true';
});

// Active tab state (persisted to localStorage)
const activeTab = useActiveTab(KEY, 'translate', [
  'settings',
  'translate',
  'active-sessions',
  'reports',
] as const);

const user = ref<Person | null>(null);
const settingsStore = useSettingsStore();
const sessionStore = useSessionStore();
const webPubSubStore = useWebPubSubStore();
const confirm = useConfirm();
const toast = useToast();

// Resume session dialog state
const resumeDialogVisible = ref(false);
const resumeDialogLoading = ref(false);
const resumeDialogHeader = ref('');
const resumeDialogMessage = ref('');
const resumeDialogParams = ref<ResumeSessionParams | null>(null);
const resumeDialogResolve = ref<(() => void) | null>(null);

// Ref to TranslateView for session restoration
const translateViewRef = ref<InstanceType<typeof TranslateView> | null>(null);

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

    // Handle session recovery with proper priority
    await handleSessionRecovery();
  } catch (e) {
    console.error('Failed to init', e);
  }
}

async function handleSessionRecovery() {
  const localSessionData = await sessionStore.checkForActiveSession();

  if (localSessionData) {
    const { session, reference } = localSessionData;
    await promptLocalSessionRecovery(session, reference);
    return;
  }

  const realSessionResumed = await cleanupOrphanedRealSessions();
  if (!realSessionResumed) {
    await cleanupOrphanedTestSessions();
  }
}

interface ResumeSessionParams {
  header: string;
  session: {
    sessionId: number;
    displayName?: string;
    mode?: string;
    inputLanguage: string;
    outputLanguages?: string[] | string;
    status: string;
    startTime: string;
  };
  onResume: () => Promise<void>;
  onEnd: () => Promise<void>;
}

async function promptSessionResume(params: ResumeSessionParams): Promise<void> {
  const sessionAge = Date.now() - new Date(params.session.startTime).getTime();
  const ageMinutes = Math.floor(sessionAge / 1000 / 60);

  const outputLangs = params.session.outputLanguages || 'N/A';
  const outputStr = Array.isArray(outputLangs)
    ? outputLangs.join(', ')
    : outputLangs;
  const details = params.session.displayName
    ? `${params.session.displayName} • ${params.session.status} • ${params.session.inputLanguage} → ${outputStr}`
    : `${params.session.mode || 'Session'} • ${params.session.status} • ${params.session.inputLanguage} → ${outputStr}`;

  resumeDialogHeader.value = params.header;
  resumeDialogMessage.value = `Session started ${ageMinutes} minute(s) ago (${details}). What would you like to do?`;
  resumeDialogParams.value = params;
  resumeDialogVisible.value = true;

  return new Promise<void>((resolve) => {
    resumeDialogResolve.value = resolve;
  });
}

async function handleResumeDialogResume() {
  if (!resumeDialogParams.value) return;
  try {
    resumeDialogLoading.value = true;
    await resumeDialogParams.value.onResume();
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
  } finally {
    resumeDialogLoading.value = false;
    resumeDialogVisible.value = false;
    resumeDialogResolve.value?.();
    resumeDialogResolve.value = null;
  }
}

async function handleResumeDialogEnd() {
  if (!resumeDialogParams.value) return;
  try {
    resumeDialogLoading.value = true;
    await resumeDialogParams.value.onEnd();
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
  } finally {
    resumeDialogLoading.value = false;
    resumeDialogVisible.value = false;
    resumeDialogResolve.value?.();
    resumeDialogResolve.value = null;
  }
}

async function promptLocalSessionRecovery(
  session: TranslationSession,
  reference: ActiveSessionReference,
) {
  await promptSessionResume({
    header: 'Active Session Found',
    session: {
      sessionId: reference.sessionId,
      mode: session.mode,
      inputLanguage: session.inputLanguage,
      outputLanguages: session.outputLanguages || session.outputLanguage,
      status: session.status,
      startTime: reference.startTime,
    },
    onResume: async () => {
      const { settings, session: resumedSession } =
        await sessionStore.resumeSessionFromCrash(
          reference.sessionId,
          session.status,
        );
      // Restore the session UI with the stored settings and full session data
      translateViewRef.value?.restoreResumedSession(
        settings,
        reference.sessionId,
        resumedSession,
      );
    },
    onEnd: async () => {
      await sessionStore.endSession(reference.sessionId, {
        status: 'completed',
        endTime: new Date().toISOString(),
      });
      const realSessionResumed = await cleanupOrphanedRealSessions();
      if (!realSessionResumed) {
        await cleanupOrphanedTestSessions();
      }
    },
  });
}

async function cleanupStreamedSession(
  session: StreamedSessionMetadata,
): Promise<void> {
  await ensureTranslatorPersistance();
  const streamedSessionsCategory = await getStreamedSessionsCategory();
  if (!streamedSessionsCategory) return;

  const allCategoryItems = await streamedSessionsCategory.list();
  const categoryItem = allCategoryItems.find(
    (item) => item.value.sessionId === session.sessionId,
  );
  if (categoryItem) {
    await streamedSessionsCategory.delete(categoryItem.id);
  }
}

async function cleanupOrphanedRealSessions(): Promise<boolean> {
  if (!user.value) return false;

  const currentUserName = `${user.value.firstName} ${user.value.lastName}`;

  try {
    const sessions = await webPubSubStore.getDiscoverableSessions();
    const orphanedRealSessions = sessions.filter((s) => {
      if (s.isTestSession === true) return false;
      if (s.operatorName !== currentUserName) return false;
      return true;
    });

    if (orphanedRealSessions.length === 0) return false;

    const mostRecentSession = orphanedRealSessions.reduce((prev, current) => {
      return new Date(current.startTime) > new Date(prev.startTime)
        ? current
        : prev;
    });

    let userResumed = false;
    await promptSessionResume({
      header: 'Active Streamed Session Found',
      session: {
        sessionId: mostRecentSession.sessionId,
        displayName: mostRecentSession.displayName,
        inputLanguage: mostRecentSession.inputLanguage,
        outputLanguages: mostRecentSession.outputLanguages,
        status: mostRecentSession.status,
        startTime: mostRecentSession.startTime,
      },
      onResume: async () => {
        const { settings, session: resumedSession } =
          await sessionStore.resumeSessionFromCrash(
            mostRecentSession.sessionId,
            mostRecentSession.status,
          );
        // Restore the session UI with the stored settings
        translateViewRef.value?.restoreResumedSession(
          settings,
          mostRecentSession.sessionId,
          resumedSession,
        );
        userResumed = true;
      },
      onEnd: async () => {
        await cleanupStreamedSession(mostRecentSession);
      },
    });

    return userResumed;
  } catch (e) {
    console.warn('Failed to check for orphaned real sessions:', e);
    return false;
  }
}

async function cleanupOrphanedTestSessions(): Promise<void> {
  if (!user.value) return;

  const currentUserName = `${user.value.firstName} ${user.value.lastName}`;

  try {
    const sessions = await webPubSubStore.getDiscoverableSessions();
    const orphanedTestSessions = sessions.filter((s) => {
      if (!s.isTestSession) return false;
      if (s.operatorName !== currentUserName) return false;
      return true;
    });

    if (orphanedTestSessions.length === 0) return;

    confirm.require({
      header: 'Orphaned Test Sessions Found',
      message: `Found ${orphanedTestSessions.length} orphaned test session(s) from a previous visit. Clean them up?`,
      icon: 'pi pi-trash',
      acceptProps: {
        label: 'Clean Up',
        severity: 'danger',
      },
      rejectProps: {
        label: 'Leave Them',
        severity: 'secondary',
        outlined: true,
      },
      accept: async () => {
        await ensureTranslatorPersistance();
        const streamedSessionsCategory = await getStreamedSessionsCategory();
        if (!streamedSessionsCategory) return;

        const allCategoryItems = await streamedSessionsCategory.list();

        for (const session of orphanedTestSessions) {
          try {
            const categoryItem = allCategoryItems.find(
              (item) => item.value.sessionId === session.sessionId,
            );
            if (categoryItem) {
              await streamedSessionsCategory.delete(categoryItem.id);
            }
          } catch (e) {
            console.warn('Failed to delete orphaned session:', e);
          }
        }
        toast.add({
          severity: 'success',
          summary: 'Cleanup Complete',
          detail: `Removed ${orphanedTestSessions.length} orphaned test session(s)`,
          life: 3000,
        });
      },
    });
  } catch (e) {
    console.warn('Failed to check for orphaned test sessions:', e);
  }
}

onMounted(() => {
  void init();
});
</script>
