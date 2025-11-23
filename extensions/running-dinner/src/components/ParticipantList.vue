<template>
  <Card>
    <template #title>
      <div class="flex justify-between items-center">
        <span>Participants ({{ participants.length }})</span>
        <div class="flex gap-2">
          <Button
            icon="pi pi-filter"
            text
            rounded
            @click="showFilters = !showFilters"
            v-tooltip.top="'Filter'"
          />
          <Button
            icon="pi pi-download"
            text
            rounded
            @click="exportList"
            v-tooltip.top="'Export'"
          />
        </div>
      </div>
    </template>
    <template #content>
      <!-- Filters -->
      <div
        v-if="showFilters"
        class="mb-4 p-4 border rounded-lg bg-surface-50 dark:bg-surface-800"
      >
        <div class="grid grid-cols-3 gap-4">
          <div class="flex flex-col gap-2">
            <label class="font-medium text-sm">Status</label>
            <Select
              v-model="filters.status"
              :options="statusOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="All statuses"
              class="w-full"
            />
          </div>
          <div class="flex flex-col gap-2">
            <label class="font-medium text-sm">Meal Preference</label>
            <Select
              v-model="filters.mealPreference"
              :options="mealOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="All meals"
              class="w-full"
            />
          </div>
          <div class="flex flex-col gap-2">
            <label class="font-medium text-sm">Search</label>
            <InputText
              v-model="filters.search"
              placeholder="Name or email..."
              icon="pi pi-search"
            />
          </div>
        </div>
      </div>

      <!-- Data Table -->
      <DataTable
        :value="filteredParticipants"
        :paginator="true"
        :rows="10"
        :rowsPerPageOptions="[5, 10, 20, 50]"
        :loading="loading"
        stripedRows
      >
        <template #empty>
          <div class="text-center py-8">
            <i class="pi pi-users text-4xl text-surface-400 mb-3"></i>
            <p class="text-surface-600 dark:text-surface-400">
              No participants yet
            </p>
          </div>
        </template>

        <Column field="name" header="Name" sortable>
          <template #body="{ data }">
            <div>
              <div class="font-medium">{{ data.value.name }}</div>
              <div class="text-sm text-surface-500">{{ data.value.email }}</div>
            </div>
          </template>
        </Column>

        <Column field="phone" header="Phone" sortable>
          <template #body="{ data }">
            {{ data.value.phone }}
          </template>
        </Column>

        <Column field="address" header="Address">
          <template #body="{ data }">
            <div class="text-sm">
              {{ data.value.address.street }}<br />
              {{ data.value.address.zip }} {{ data.value.address.city }}
            </div>
          </template>
        </Column>

        <Column field="preferredMeal" header="Meal Preference">
          <template #body="{ data }">
            <Chip
              v-if="data.value.preferredMeal"
              :label="formatMeal(data.value.preferredMeal)"
            />
            <span v-else class="text-surface-400">None</span>
          </template>
        </Column>

        <Column field="registrationStatus" header="Status">
          <template #body="{ data }">
            <Badge
              :value="data.value.registrationStatus"
              :severity="getStatusSeverity(data.value.registrationStatus)"
            />
          </template>
        </Column>

        <Column field="dietaryRestrictions" header="Dietary">
          <template #body="{ data }">
            <span v-if="data.value.dietaryRestrictions" class="text-sm">
              {{ data.value.dietaryRestrictions }}
            </span>
            <span v-else class="text-surface-400">None</span>
          </template>
        </Column>

        <Column header="Actions" :exportable="false">
          <template #body="{ data }">
            <div class="flex gap-1">
              <Button
                v-if="data.value.registrationStatus === 'waitlist'"
                icon="pi pi-check"
                text
                rounded
                size="small"
                severity="success"
                @click="$emit('confirm', data)"
                v-tooltip.top="'Confirm Registration'"
              />
              <Button
                icon="pi pi-pencil"
                text
                rounded
                size="small"
                @click="$emit('edit', data)"
                v-tooltip.top="'Edit'"
              />
              <Button
                icon="pi pi-trash"
                text
                rounded
                size="small"
                severity="danger"
                @click="$emit('delete', data)"
                v-tooltip.top="'Delete'"
              />
            </div>
          </template>
        </Column>
      </DataTable>
    </template>
  </Card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Participant } from '../types/models';
import type { CategoryValue } from '@churchtools-extensions/persistance';
import Card from '@churchtools-extensions/prime-volt/Card.vue';
import Button from '@churchtools-extensions/prime-volt/Button.vue';
import DataTable from '@churchtools-extensions/prime-volt/DataTable.vue';
import Column from 'primevue/column';
import Select from '@churchtools-extensions/prime-volt/Select.vue';
import InputText from '@churchtools-extensions/prime-volt/InputText.vue';
import Badge from '@churchtools-extensions/prime-volt/Badge.vue';
import Chip from '@churchtools-extensions/prime-volt/Chip.vue';

interface Props {
  participants: CategoryValue<Participant>[];
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
});

defineEmits<{
  edit: [participant: CategoryValue<Participant>];
  delete: [participant: CategoryValue<Participant>];
  confirm: [participant: CategoryValue<Participant>];
}>();

const showFilters = ref(false);
const filters = ref({
  status: null as string | null,
  mealPreference: null as string | null,
  search: '',
});

const statusOptions = [
  { label: 'All Statuses', value: null },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Waitlist', value: 'waitlist' },
  { label: 'Cancelled', value: 'cancelled' },
];

const mealOptions = [
  { label: 'All Meals', value: null },
  { label: 'Starter', value: 'starter' },
  { label: 'Main Course', value: 'mainCourse' },
  { label: 'Dessert', value: 'dessert' },
];

const filteredParticipants = computed(() => {
  let result = props.participants;

  if (filters.value.status) {
    result = result.filter(
      (p) => p.value.registrationStatus === filters.value.status,
    );
  }

  if (filters.value.mealPreference) {
    result = result.filter(
      (p) => p.value.preferredMeal === filters.value.mealPreference,
    );
  }

  if (filters.value.search) {
    const search = filters.value.search.toLowerCase();
    result = result.filter(
      (p) =>
        p.value.name.toLowerCase().includes(search) ||
        p.value.email.toLowerCase().includes(search),
    );
  }

  return result;
});

function formatMeal(meal: string): string {
  const labels: Record<string, string> = {
    starter: 'Starter',
    mainCourse: 'Main Course',
    dessert: 'Dessert',
  };
  return labels[meal] || meal;
}

function getStatusSeverity(
  status: string,
): 'secondary' | 'success' | 'info' | 'warn' | 'danger' | 'contrast' {
  const severities: Record<
    string,
    'secondary' | 'success' | 'info' | 'warn' | 'danger' | 'contrast'
  > = {
    confirmed: 'success',
    waitlist: 'secondary',
    cancelled: 'danger',
  };
  return severities[status] || 'secondary';
}

function exportList() {
  // TODO: Implement CSV export
  console.log('Export participants list');
}
</script>
