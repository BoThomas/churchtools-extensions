<template>
  <div class="space-y-6 max-w-7xl">
    <div class="flex items-center justify-between">
      <h2 class="text-2xl font-semibold">Usage Reports</h2>
      <div class="flex gap-2">
        <Button
          icon="pi pi-database"
          label="Add 100 Dummy Sessions"
          @click="addDummySessions"
          :loading="store.sessionsSaving"
          severity="help"
        />
        <Button
          icon="pi pi-refresh"
          label="Refresh"
          @click="loadData"
          :loading="store.sessionsLoading"
          severity="secondary"
        />
        <DangerButton
          icon="pi pi-trash"
          label="Clear All Sessions"
          @click="confirmClearSessions"
          :disabled="store.sessionsLoading || totalSessions === 0"
          :loading="store.sessionsSaving"
        />
      </div>
    </div>

    <Message v-if="store.error" severity="error" :closable="true">
      {{ store.error }}
    </Message>

    <!-- Summary Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div
        class="bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg p-4"
      >
        <div class="flex items-center gap-3">
          <i class="pi pi-users text-3xl text-primary"></i>
          <div>
            <div class="text-2xl font-semibold">{{ totalUsers }}</div>
            <div class="text-sm text-surface-600 dark:text-surface-400">
              Total Users
            </div>
          </div>
        </div>
      </div>

      <div
        class="bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg p-4"
      >
        <div class="flex items-center gap-3">
          <i class="pi pi-list text-3xl text-primary"></i>
          <div>
            <div class="text-2xl font-semibold">{{ totalSessions }}</div>
            <div class="text-sm text-surface-600 dark:text-surface-400">
              Total Sessions
            </div>
          </div>
        </div>
      </div>

      <div
        class="bg-surface-0 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-lg p-4"
      >
        <div class="flex items-center gap-3">
          <i class="pi pi-clock text-3xl text-primary"></i>
          <div>
            <div class="text-2xl font-semibold">{{ totalMinutes }}</div>
            <div class="text-sm text-surface-600 dark:text-surface-400">
              Total Minutes
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <Fieldset>
      <template #legend>
        <div class="flex items-center gap-2">
          <i class="pi pi-filter"></i>
          <span class="font-semibold">Filters</span>
        </div>
      </template>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="flex flex-col gap-2">
          <label for="start-date" class="font-medium text-sm">Start Date</label>
          <DatePicker
            id="start-date"
            v-model="filters.startDate"
            dateFormat="yy-mm-dd"
            placeholder="Select start date"
            showIcon
            @update:modelValue="applyFilters"
          />
        </div>

        <div class="flex flex-col gap-2">
          <label for="end-date" class="font-medium text-sm">End Date</label>
          <DatePicker
            id="end-date"
            v-model="filters.endDate"
            dateFormat="yy-mm-dd"
            placeholder="Select end date"
            showIcon
            @update:modelValue="applyFilters"
          />
        </div>

        <div class="flex flex-col gap-2">
          <label for="mode-filter" class="font-medium text-sm">Mode</label>
          <Select
            id="mode-filter"
            v-model="filters.mode"
            :options="modeOptions"
            placeholder="All modes"
            showClear
            @update:modelValue="applyFilters"
          />
        </div>
      </div>
    </Fieldset>

    <!-- Usage Statistics Table -->
    <Fieldset>
      <template #legend>
        <div class="flex items-center gap-2">
          <i class="pi pi-chart-bar"></i>
          <span class="font-semibold">Usage Statistics by User</span>
        </div>
      </template>

      <DataTable
        :value="filteredStats"
        :loading="store.sessionsLoading"
        removableSort
        stripedRows
        v-model:expandedRows="expandedRows"
        dataKey="userId"
        v-model:sortField="statsSortField"
        v-model:sortOrder="statsSortOrder"
      >
        <template #empty>
          <div class="text-center py-4 text-surface-500">
            No usage data available yet. Start using the translator to see
            statistics here.
          </div>
        </template>

        <Column expander style="width: 3rem" />

        <Column field="userName" header="User" sortable>
          <template #body="{ data }">
            <div class="font-medium">{{ data.userName }}</div>
            <div class="text-sm text-surface-500">{{ data.userEmail }}</div>
          </template>
        </Column>

        <Column field="sessionCount" header="Sessions" sortable>
          <template #body="{ data }">
            <Chip :label="String(data.sessionCount)" />
          </template>
        </Column>

        <Column field="totalMinutes" header="Total Minutes" sortable>
          <template #body="{ data }">
            <span class="font-semibold">{{ data.totalMinutes }}</span> min
            <span class="text-sm text-surface-500"
              >({{ formatDuration(data.totalMinutes) }})</span
            >
          </template>
        </Column>

        <Column field="lastUsed" header="Last Used" sortable>
          <template #body="{ data }">
            {{ formatDate(data.lastUsed) }}
          </template>
        </Column>

        <template #expansion="{ data }">
          <div class="p-4">
            <h4 class="font-semibold mb-3">Daily Usage Breakdown</h4>
            <Chart
              type="bar"
              :data="getChartData(data.sessions)"
              :options="chartOptions"
              class="h-80"
            />
          </div>
        </template>
      </DataTable>
    </Fieldset>

    <!-- All Sessions Table -->
    <Fieldset>
      <template #legend>
        <div class="flex items-center gap-2">
          <i class="pi pi-list"></i>
          <span class="font-semibold">All Sessions</span>
        </div>
      </template>

      <div class="mb-4">
        <InputText
          v-model="sessionSearchText"
          placeholder="Search sessions by user, email, language, or status..."
          class="w-full"
        >
          <template #prefix>
            <i class="pi pi-search"></i>
          </template>
        </InputText>
      </div>

      <DataTable
        :value="filteredSessions"
        :loading="store.sessionsLoading"
        removableSort
        stripedRows
        paginator
        :rows="10"
        :rowsPerPageOptions="[10, 25, 50]"
        v-model:sortField="sessionsSortField"
        v-model:sortOrder="sessionsSortOrder"
      >
        <template #empty>
          <div class="text-center py-4 text-surface-500">
            No sessions found.
          </div>
        </template>

        <Column field="value.userName" header="User" sortable>
          <template #body="{ data }">
            <div>{{ data.value.userName }}</div>
            <div class="text-xs text-surface-500">
              {{ data.value.userEmail }}
            </div>
          </template>
        </Column>

        <Column field="value.startTime" header="Start Time" sortable>
          <template #body="{ data }">
            {{ formatDateTime(data.value.startTime) }}
          </template>
        </Column>

        <Column field="value.endTime" header="End Time" sortable>
          <template #body="{ data }">
            {{
              data.value.endTime ? formatDateTime(data.value.endTime) : 'N/A'
            }}
          </template>
        </Column>

        <Column field="value.durationMinutes" header="Duration" sortable>
          <template #body="{ data }">
            <span v-if="getSessionDuration(data.value) > 0">
              {{ getSessionDuration(data.value) }} min
            </span>
            <span v-else class="text-surface-400">N/A</span>
          </template>
        </Column>

        <Column field="value.mode" header="Mode" sortable>
          <template #body="{ data }">
            <Chip
              :label="data.value.mode"
              :severity="
                data.value.mode === 'presentation' ? 'success' : 'info'
              "
            />
          </template>
        </Column>

        <Column field="value.inputLanguage" header="Languages" sortable>
          <template #body="{ data }">
            <div class="text-sm">
              <div>
                <i class="pi pi-microphone text-xs mr-1"></i>
                {{ data.value.inputLanguage }}
              </div>
              <div>
                <i class="pi pi-arrow-right text-xs mr-1"></i>
                {{ data.value.outputLanguage }}
              </div>
            </div>
          </template>
        </Column>

        <Column field="value.status" header="Status" sortable>
          <template #body="{ data }">
            <Chip
              :label="getSessionStatus(data.value)"
              :severity="getSessionStatusSeverity(data.value)"
            />
          </template>
        </Column>
      </DataTable>
    </Fieldset>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useTranslatorStore } from '../stores/translator';
import type { UsageStats } from '../stores/translator';
import type { CategoryValue } from '@churchtools-extensions/persistance';
import {
  SessionLogger,
  type TranslationSession,
} from '../services/sessionLogger';

import Fieldset from '@churchtools-extensions/prime-volt/Fieldset.vue';
import Button from '@churchtools-extensions/prime-volt/Button.vue';
import DangerButton from '@churchtools-extensions/prime-volt/DangerButton.vue';
import Message from '@churchtools-extensions/prime-volt/Message.vue';
import DataTable from '@churchtools-extensions/prime-volt/DataTable.vue';
import Column from 'primevue/column';
import Chip from '@churchtools-extensions/prime-volt/Chip.vue';
import DatePicker from '@churchtools-extensions/prime-volt/DatePicker.vue';
import Select from '@churchtools-extensions/prime-volt/Select.vue';
import InputText from '@churchtools-extensions/prime-volt/InputText.vue';
import Chart from 'primevue/chart';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';

const store = useTranslatorStore();
const confirm = useConfirm();
const toast = useToast();

// State
const usageStats = ref<UsageStats[]>([]);
const expandedRows = ref<any>({});
const filters = ref({
  startDate: null as Date | null,
  endDate: null as Date | null,
  mode: null as string | null,
});
const sessionSearchText = ref<string>('');

// Sort state for statistics table
const statsSortField = ref<string | undefined>(undefined);
const statsSortOrder = ref<number | undefined>(undefined);

// Sort state for sessions table
const sessionsSortField = ref<string>('value.startTime');
const sessionsSortOrder = ref<number>(-1);

const modeOptions = ref(['test', 'presentation']);

// Load data
async function loadData() {
  try {
    usageStats.value = await store.getUsageStats();
  } catch (e) {
    console.error('Failed to load usage stats', e);
  }
}

// Apply filters
function applyFilters() {
  // This will trigger computed properties to recalculate
  loadData();
}

// Computed
const totalUsers = computed(() => usageStats.value.length);

const totalSessions = computed(() => {
  return usageStats.value.reduce((sum, user) => sum + user.sessionCount, 0);
});

const totalMinutes = computed(() => {
  return usageStats.value.reduce((sum, user) => sum + user.totalMinutes, 0);
});

const filteredSessions = computed(() => {
  let filtered = store.sessions;

  // Date range filter
  if (filters.value.startDate) {
    const startTime = filters.value.startDate.getTime();
    filtered = filtered.filter(
      (s: CategoryValue<TranslationSession>) =>
        new Date(s.value.startTime).getTime() >= startTime,
    );
  }

  if (filters.value.endDate) {
    const endTime = filters.value.endDate.getTime() + 24 * 60 * 60 * 1000; // End of day
    filtered = filtered.filter(
      (s: CategoryValue<TranslationSession>) =>
        new Date(s.value.startTime).getTime() <= endTime,
    );
  }

  // Mode filter
  if (filters.value.mode) {
    filtered = filtered.filter(
      (s: CategoryValue<TranslationSession>) =>
        s.value.mode === filters.value.mode,
    );
  }

  // Text search filter
  if (sessionSearchText.value.trim()) {
    const searchLower = sessionSearchText.value.toLowerCase().trim();
    filtered = filtered.filter((s: CategoryValue<TranslationSession>) => {
      const session = s.value;
      return (
        session.userName.toLowerCase().includes(searchLower) ||
        session.userEmail.toLowerCase().includes(searchLower) ||
        session.inputLanguage.toLowerCase().includes(searchLower) ||
        session.outputLanguage.toLowerCase().includes(searchLower) ||
        session.mode.toLowerCase().includes(searchLower) ||
        session.status.toLowerCase().includes(searchLower)
      );
    });
  }

  return filtered;
});

const filteredStats = computed(() => {
  if (
    !filters.value.startDate &&
    !filters.value.endDate &&
    !filters.value.mode
  ) {
    return usageStats.value;
  }

  // Recalculate stats based on filtered sessions
  const userMap = new Map<number, UsageStats>();

  filteredSessions.value.forEach(
    (sessionWrapper: CategoryValue<TranslationSession>) => {
      const session = sessionWrapper.value;
      const userId = session.userId;

      if (!userMap.has(userId)) {
        userMap.set(userId, {
          userId: session.userId,
          userEmail: session.userEmail,
          userName: session.userName,
          totalMinutes: 0,
          sessionCount: 0,
          lastUsed: session.startTime,
          sessions: [],
        });
      }

      const stats = userMap.get(userId)!;
      stats.sessionCount++;

      // Use smart duration calculation
      const duration = SessionLogger.calculateSessionDuration(session);
      stats.totalMinutes += duration;

      if (new Date(session.startTime) > new Date(stats.lastUsed)) {
        stats.lastUsed = session.startTime;
      }

      const date = session.startTime.split('T')[0];
      const existingDay = stats.sessions.find((s) => s.date === date);
      if (existingDay) {
        existingDay.minutes += duration;
      } else {
        stats.sessions.push({
          date,
          minutes: duration,
        });
      }
    },
  );

  userMap.forEach((stats) => {
    stats.sessions.sort((a, b) => b.date.localeCompare(a.date));
  });

  return Array.from(userMap.values()).sort(
    (a, b) => b.totalMinutes - a.totalMinutes,
  );
});

// Helper functions for session display
function getSessionDuration(session: TranslationSession): number {
  return SessionLogger.calculateSessionDuration(session);
}

function getSessionStatus(session: TranslationSession): string {
  if (SessionLogger.isSessionAbandoned(session)) {
    return 'abandoned';
  }
  return session.status;
}

function getSessionStatusSeverity(
  session: TranslationSession,
): 'success' | 'warn' | 'danger' | 'secondary' {
  if (SessionLogger.isSessionAbandoned(session)) {
    return 'warn';
  }

  switch (session.status) {
    case 'completed':
      return 'success';
    case 'error':
      return 'danger';
    case 'running':
      return 'secondary';
    case 'abandoned':
      return 'warn';
    default:
      return 'secondary';
  }
}

// Formatting functions
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

// Clear all sessions with confirmation
function confirmClearSessions() {
  confirm.require({
    message:
      'Are you sure you want to delete all session records? This action cannot be undone.',
    header: 'Confirm Clear All Sessions',
    icon: 'pi pi-exclamation-triangle',
    rejectProps: {
      label: 'Cancel',
      severity: 'secondary',
    },
    acceptProps: {
      label: 'Delete All',
      severity: 'danger',
    },
    accept: async () => {
      try {
        await store.clearAllSessions();
        await loadData(); // Refresh the data
        toast.add({
          severity: 'success',
          summary: 'Sessions Cleared',
          detail: 'All session records have been deleted',
          life: 3000,
        });
      } catch (e: any) {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to clear session records',
          life: 5000,
        });
      }
    },
  });
}

// Chart data and options for daily usage breakdown
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
  },
  scales: {
    x: {
      grid: {
        display: false,
      },
    },
    y: {
      beginAtZero: true,
      ticks: {
        stepSize: 30,
      },
      title: {
        display: true,
        text: 'Minutes',
      },
    },
  },
};

function getChartData(sessions: { date: string; minutes: number }[]) {
  // Sort sessions by date
  const sortedSessions = [...sessions].sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  return {
    labels: sortedSessions.map((s) => formatDate(s.date)),
    datasets: [
      {
        label: 'Minutes',
        data: sortedSessions.map((s) => s.minutes),
        backgroundColor: 'rgba(99, 102, 241, 0.8)',
        borderColor: 'rgb(99, 102, 241)',
        borderWidth: 1,
      },
    ],
  };
}

// Generate dummy data for performance testing
async function addDummySessions() {
  try {
    await store.generateDummySessions(100);
    await loadData();
    toast.add({
      severity: 'success',
      summary: 'Dummy Sessions Added',
      detail: '100 dummy sessions were created for testing.',
      life: 3000,
    });
  } catch (e: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to generate dummy sessions',
      life: 5000,
    });
  }
}

// Initialize
onMounted(() => {
  loadData();
});
</script>
