<template>
  <div class="space-y-4">
    <!-- Header with stats -->
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div class="flex flex-wrap gap-3">
        <div
          class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-100 dark:bg-surface-800"
        >
          <i class="pi pi-users text-primary text-sm"></i>
          <span class="font-semibold">{{ activeMembers.length }}</span>
          <span class="text-sm text-surface-600 dark:text-surface-400"
            >Active</span
          >
        </div>
        <div
          v-if="waitingMembers.length > 0"
          class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-100 dark:bg-orange-900/30"
        >
          <i class="pi pi-clock text-orange-500 text-sm"></i>
          <span class="font-semibold text-orange-700 dark:text-orange-300">{{
            waitingMembers.length
          }}</span>
          <span class="text-sm text-orange-700 dark:text-orange-300"
            >Waitlist</span
          >
        </div>
      </div>
      <div class="relative">
        <i
          class="pi pi-search absolute left-2.5 top-1/2 -translate-y-1/2 text-surface-400 text-sm"
        ></i>
        <InputText
          v-model="searchQuery"
          placeholder="Search..."
          class="pl-8 h-8 text-sm w-48"
        />
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-if="members.length === 0"
      class="text-center py-8 bg-surface-50 dark:bg-surface-800 rounded-lg"
    >
      <i class="pi pi-users text-4xl text-surface-400 mb-2"></i>
      <p class="text-surface-600 dark:text-surface-400">
        No members yet. Share the group link to start collecting registrations.
      </p>
    </div>

    <!-- Members Table -->
    <DataTable
      v-if="members.length > 0"
      :value="filteredMembers"
      :paginator="filteredMembers.length > 10"
      :rows="10"
      :rowsPerPageOptions="[10, 25, 50]"
      dataKey="personId"
      :globalFilterFields="[
        'person.firstName',
        'person.lastName',
        'person.email',
      ]"
      class="p-datatable-sm"
      stripedRows
    >
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
          <span
            v-if="data.fields?.mealPreference"
            class="text-lg"
            :title="getMealLabel(data.fields.mealPreference)"
            >{{ getMealEmoji(data.fields.mealPreference) }}</span
          >
          <span v-else class="text-surface-400 text-sm">—</span>
        </template>
      </Column>

      <!-- Dietary Restrictions Column -->
      <Column header="Dietary" style="width: 150px">
        <template #body="{ data }">
          <div
            v-if="data.fields?.dietaryRestrictions || data.fields?.allergyInfo"
            class="text-xs space-y-0.5"
          >
            <div
              v-if="data.fields?.dietaryRestrictions"
              class="text-surface-600 dark:text-surface-400 truncate"
              :title="data.fields.dietaryRestrictions"
            >
              🍽️ {{ data.fields.dietaryRestrictions }}
            </div>
            <div
              v-if="data.fields?.allergyInfo"
              class="text-red-600 dark:text-red-400 truncate"
              :title="data.fields.allergyInfo"
            >
              ⚠️ {{ data.fields.allergyInfo }}
            </div>
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
import { getMealLabel, getMealEmoji } from '@/types/models';
import DataTable from '@churchtools-extensions/prime-volt/DataTable.vue';
import Column from 'primevue/column';
import Button from '@churchtools-extensions/prime-volt/Button.vue';
import Badge from '@churchtools-extensions/prime-volt/Badge.vue';
import InputText from '@churchtools-extensions/prime-volt/InputText.vue';
import { useToast } from 'primevue/usetoast';

const props = defineProps<{
  members: GroupMember[];
  showPartnerPreferences?: boolean;
}>();

const toast = useToast();
const searchQuery = ref('');

// Computed
const activeMembers = computed(() =>
  props.members.filter((m) => m.groupMemberStatus === 'active'),
);

const waitingMembers = computed(() =>
  props.members.filter((m) => m.groupMemberStatus === 'waiting'),
);

const filteredMembers = computed(() => {
  if (!searchQuery.value) {
    return props.members;
  }

  const query = searchQuery.value.toLowerCase();
  return props.members.filter((m) => {
    // Search in basic person info
    if (m.person.firstName.toLowerCase().includes(query)) return true;
    if (m.person.lastName.toLowerCase().includes(query)) return true;
    if (m.person.email?.toLowerCase().includes(query)) return true;

    // Search in status
    if (m.groupMemberStatus.toLowerCase().includes(query)) return true;

    // Search in meal preference
    if (m.fields?.mealPreference?.toLowerCase().includes(query)) return true;

    // Search in dietary restrictions and allergies
    if (m.fields?.dietaryRestrictions?.toLowerCase().includes(query))
      return true;
    if (m.fields?.allergyInfo?.toLowerCase().includes(query)) return true;

    // Search in partner preference
    if (m.fields?.partnerPreference?.toLowerCase().includes(query)) return true;

    // Search in phone numbers
    const phone = m.person.phoneNumbers?.[0]?.phoneNumber;
    if (phone?.toLowerCase().includes(query)) return true;

    // Search in address
    const address = m.person.addresses?.[0];
    if (address) {
      if (address.street?.toLowerCase().includes(query)) return true;
      if (address.city?.toLowerCase().includes(query)) return true;
      if (address.zip?.toLowerCase().includes(query)) return true;
    }

    return false;
  });
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
