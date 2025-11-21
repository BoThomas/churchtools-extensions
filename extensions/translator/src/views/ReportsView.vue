<template>
  <div class="space-y-6 max-w-7xl">
    <div class="flex items-center justify-between">
      <h2 class="text-2xl font-semibold">Usage Reports</h2>
      <Button
        icon="pi pi-refresh"
        label="Refresh"
        @click="loadData"
        :loading="store.sessionsLoading"
        severity="secondary"
      />
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
        stripedRows
        showGridlines
        v-model:expandedRows="expandedRows"
        dataKey="userId"
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
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <div
                v-for="session in data.sessions"
                :key="session.date"
                class="bg-surface-50 dark:bg-surface-800 p-3 rounded"
              >
                <div class="font-medium">{{ formatDate(session.date) }}</div>
                <div class="text-sm text-surface-600 dark:text-surface-400">
                  {{ session.minutes }} minutes
                </div>
              </div>
            </div>
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

      <DataTable
        :value="filteredSessions"
        :loading="store.sessionsLoading"
        stripedRows
        showGridlines
        paginator
        :rows="10"
        :rowsPerPageOptions="[10, 25, 50]"
        sortField="startTime"
        :sortOrder="-1"
      >
        <template #empty>
          <div class="text-center py-4 text-surface-500">
            No sessions found.
          </div>
        </template>

        <Column field="userName" header="User" sortable>
          <template #body="{ data }">
            <div>{{ data.value.userName }}</div>
            <div class="text-xs text-surface-500">
              {{ data.value.userEmail }}
            </div>
          </template>
        </Column>

        <Column field="startTime" header="Start Time" sortable>
          <template #body="{ data }">
            {{ formatDateTime(data.value.startTime) }}
          </template>
        </Column>

        <Column field="endTime" header="End Time" sortable>
          <template #body="{ data }">
            {{
              data.value.endTime ? formatDateTime(data.value.endTime) : 'N/A'
            }}
          </template>
        </Column>

        <Column field="durationMinutes" header="Duration" sortable>
          <template #body="{ data }">
            <span v-if="data.value.durationMinutes">
              {{ data.value.durationMinutes }} min
            </span>
            <span v-else class="text-surface-400">N/A</span>
          </template>
        </Column>

        <Column field="mode" header="Mode" sortable>
          <template #body="{ data }">
            <Chip
              :label="data.value.mode"
              :severity="
                data.value.mode === 'presentation' ? 'success' : 'info'
              "
            />
          </template>
        </Column>

        <Column field="inputLanguage" header="Languages" sortable>
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

        <Column field="status" header="Status" sortable>
          <template #body="{ data }">
            <Chip
              :label="data.value.status"
              :severity="
                data.value.status === 'completed'
                  ? 'success'
                  : data.value.status === 'error'
                    ? 'danger'
                    : 'warn'
              "
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
import type { TranslationSession } from '../services/sessionLogger';

import Fieldset from '@churchtools-extensions/prime-volt/Fieldset.vue';
import Button from '@churchtools-extensions/prime-volt/Button.vue';
import Message from '@churchtools-extensions/prime-volt/Message.vue';
import DataTable from '@churchtools-extensions/prime-volt/DataTable.vue';
import Column from 'primevue/column';
import Chip from '@churchtools-extensions/prime-volt/Chip.vue';
import DatePicker from '@churchtools-extensions/prime-volt/DatePicker.vue';
import Select from '@churchtools-extensions/prime-volt/Select.vue';

const store = useTranslatorStore();

// State
const usageStats = ref<UsageStats[]>([]);
const expandedRows = ref<any>({});
const filters = ref({
  startDate: null as Date | null,
  endDate: null as Date | null,
  mode: null as string | null,
});

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
      stats.totalMinutes += session.durationMinutes || 0;

      if (new Date(session.startTime) > new Date(stats.lastUsed)) {
        stats.lastUsed = session.startTime;
      }

      const date = session.startTime.split('T')[0];
      const existingDay = stats.sessions.find((s) => s.date === date);
      if (existingDay) {
        existingDay.minutes += session.durationMinutes || 0;
      } else {
        stats.sessions.push({
          date,
          minutes: session.durationMinutes || 0,
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

// Initialize
onMounted(() => {
  loadData();
});
</script>
