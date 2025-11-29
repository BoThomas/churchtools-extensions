<template>
  <div class="space-y-4">
    <!-- Header with stats -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-4">
        <div
          class="text-center px-4 py-2 bg-surface-100 dark:bg-surface-800 rounded"
        >
          <div class="text-2xl font-bold text-primary">
            {{ activeMembers.length }}
          </div>
          <div class="text-xs text-surface-600 dark:text-surface-400">
            Active
          </div>
        </div>
        <div
          v-if="waitingMembers.length > 0"
          class="text-center px-4 py-2 bg-surface-100 dark:bg-surface-800 rounded"
        >
          <div class="text-2xl font-bold text-orange-500">
            {{ waitingMembers.length }}
          </div>
          <div class="text-xs text-surface-600 dark:text-surface-400">
            Waitlist
          </div>
        </div>
      </div>
      <Button
        icon="pi pi-refresh"
        size="small"
        text
        @click="$emit('refresh')"
        :loading="loading"
        v-tooltip="'Refresh members'"
      />
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-8">
      <i class="pi pi-spin pi-spinner text-2xl text-primary"></i>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="members.length === 0"
      class="text-center py-8 bg-surface-50 dark:bg-surface-800 rounded-lg"
    >
      <i class="pi pi-users text-4xl text-surface-400 mb-2"></i>
      <p class="text-surface-600 dark:text-surface-400">
        No members yet. Share the group link to start collecting registrations.
      </p>
    </div>

    <!-- Members Table -->
    <DataTable
      v-else
      :value="filteredMembers"
      :paginator="filteredMembers.length > 10"
      :rows="10"
      :rowsPerPageOptions="[10, 25, 50]"
      dataKey="personId"
      filterDisplay="row"
      :globalFilterFields="[
        'person.firstName',
        'person.lastName',
        'person.email',
      ]"
      class="p-datatable-sm"
      stripedRows
    >
      <!-- Global Search -->
      <template #header>
        <div class="flex items-center justify-between gap-4">
          <div class="relative">
            <i
              class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-surface-400"
            ></i>
            <InputText
              v-model="searchQuery"
              placeholder="Search members..."
              class="pl-10 w-64"
            />
          </div>
          <div class="flex items-center gap-2">
            <label class="text-sm text-surface-600 dark:text-surface-400"
              >Filter:</label
            >
            <Select
              v-model="statusFilter"
              :options="statusOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="All Statuses"
              class="w-40"
            />
          </div>
        </div>
      </template>

      <!-- Name Column -->
      <template #empty>
        <div class="text-center py-4 text-surface-500">
          No members match your search.
        </div>
      </template>

      <Column field="person.firstName" header="Name" sortable>
        <template #body="{ data }">
          <div class="flex items-center gap-2">
            <div>
              <div class="font-medium">
                {{ data.person.firstName }} {{ data.person.lastName }}
              </div>
              <div v-if="data.person.email" class="text-xs text-surface-500">
                {{ data.person.email }}
              </div>
            </div>
          </div>
        </template>
      </Column>

      <!-- Status Column -->
      <Column
        field="groupMemberStatus"
        header="Status"
        sortable
        style="width: 120px"
      >
        <template #body="{ data }">
          <Badge
            :value="getStatusLabel(data.groupMemberStatus)"
            :severity="getStatusSeverity(data.groupMemberStatus)"
          />
          <span
            v-if="data.waitinglistPosition"
            class="ml-2 text-xs text-surface-500"
          >
            #{{ data.waitinglistPosition }}
          </span>
        </template>
      </Column>

      <!-- Meal Preference Column -->
      <Column header="Meal Pref." style="width: 130px">
        <template #body="{ data }">
          <div
            v-if="data.fields?.mealPreference"
            class="flex items-center gap-1"
          >
            <i
              :class="getMealIcon(data.fields.mealPreference)"
              class="text-xs"
            ></i>
            <span class="text-sm">{{
              getMealLabel(data.fields.mealPreference)
            }}</span>
          </div>
          <span v-else class="text-surface-400 text-sm">None</span>
        </template>
      </Column>

      <!-- Dietary Restrictions Column -->
      <Column header="Dietary" style="width: 150px">
        <template #body="{ data }">
          <div
            v-if="data.fields?.dietaryRestrictions || data.fields?.allergyInfo"
            class="space-y-1"
          >
            <Chip
              v-if="data.fields?.dietaryRestrictions"
              :label="data.fields.dietaryRestrictions"
              class="text-xs"
            />
            <Chip
              v-if="data.fields?.allergyInfo"
              :label="'⚠️ ' + data.fields.allergyInfo"
              class="text-xs bg-red-100 text-red-800"
            />
          </div>
          <span v-else class="text-surface-400 text-sm">—</span>
        </template>
      </Column>

      <!-- Partner Preference Column -->
      <Column
        v-if="showPartnerPreferences"
        header="Partner Pref."
        style="width: 150px"
      >
        <template #body="{ data }">
          <span v-if="data.fields?.partnerPreference" class="text-sm">
            {{ data.fields.partnerPreference }}
          </span>
          <span v-else class="text-surface-400 text-sm">—</span>
        </template>
      </Column>

      <!-- Contact Column -->
      <Column header="Contact" style="width: 120px">
        <template #body="{ data }">
          <div class="flex items-center gap-2">
            <Button
              v-if="data.person.email"
              icon="pi pi-envelope"
              size="small"
              text
              severity="secondary"
              @click="copyToClipboard(data.person.email)"
              v-tooltip="data.person.email"
            />
            <Button
              v-if="getPhone(data)"
              icon="pi pi-phone"
              size="small"
              text
              severity="secondary"
              @click="copyToClipboard(getPhone(data))"
              v-tooltip="getPhone(data)"
            />
          </div>
        </template>
      </Column>

      <!-- Registered Date Column -->
      <Column
        field="memberStartDate"
        header="Registered"
        sortable
        style="width: 120px"
      >
        <template #body="{ data }">
          <span class="text-sm text-surface-600 dark:text-surface-400">
            {{ formatDate(data.memberStartDate) }}
          </span>
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { GroupMember } from '@/types/models';
import DataTable from '@churchtools-extensions/prime-volt/DataTable.vue';
import Column from 'primevue/column';
import Button from '@churchtools-extensions/prime-volt/Button.vue';
import Badge from '@churchtools-extensions/prime-volt/Badge.vue';
import Chip from '@churchtools-extensions/prime-volt/Chip.vue';
import InputText from '@churchtools-extensions/prime-volt/InputText.vue';
import Select from '@churchtools-extensions/prime-volt/Select.vue';
import { useToast } from 'primevue/usetoast';

const props = defineProps<{
  members: GroupMember[];
  loading?: boolean;
  showPartnerPreferences?: boolean;
}>();

defineEmits<{
  refresh: [];
}>();

const toast = useToast();
const searchQuery = ref('');
const statusFilter = ref<string | null>(null);

const statusOptions = [
  { label: 'All', value: null },
  { label: 'Active', value: 'active' },
  { label: 'Waitlist', value: 'waiting' },
];

// Computed
const activeMembers = computed(() =>
  props.members.filter((m) => m.groupMemberStatus === 'active'),
);

const waitingMembers = computed(() =>
  props.members.filter((m) => m.groupMemberStatus === 'waiting'),
);

const filteredMembers = computed(() => {
  let result = props.members;

  // Status filter
  if (statusFilter.value) {
    result = result.filter((m) => m.groupMemberStatus === statusFilter.value);
  }

  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(
      (m) =>
        m.person.firstName.toLowerCase().includes(query) ||
        m.person.lastName.toLowerCase().includes(query) ||
        m.person.email?.toLowerCase().includes(query),
    );
  }

  return result;
});

// Helpers
function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    active: 'Active',
    waiting: 'Waitlist',
    inactive: 'Inactive',
  };
  return labels[status] || status;
}

function getStatusSeverity(
  status: string,
): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
  const severities: Record<
    string,
    'success' | 'info' | 'warn' | 'danger' | 'secondary'
  > = {
    active: 'success',
    waiting: 'warn',
    inactive: 'secondary',
  };
  return severities[status] || 'secondary';
}

function getMealLabel(meal: string): string {
  const labels: Record<string, string> = {
    starter: 'Starter',
    mainCourse: 'Main',
    dessert: 'Dessert',
    none: 'None',
  };
  return labels[meal] || meal;
}

function getMealIcon(meal: string): string {
  const icons: Record<string, string> = {
    starter: 'pi pi-star',
    mainCourse: 'pi pi-circle-fill',
    dessert: 'pi pi-heart-fill',
    none: 'pi pi-minus',
  };
  return icons[meal] || 'pi pi-question';
}

function getPhone(member: GroupMember): string | null {
  return member.person.phoneNumbers?.[0]?.phoneNumber || null;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

async function copyToClipboard(text: string | null) {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    toast.add({
      severity: 'success',
      summary: 'Copied',
      detail: 'Copied to clipboard',
      life: 2000,
    });
  } catch {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to copy',
      life: 2000,
    });
  }
}
</script>
