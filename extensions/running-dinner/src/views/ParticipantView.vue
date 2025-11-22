<template>
  <div class="space-y-6">
    <h1 class="text-3xl font-bold">My Registrations</h1>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-12">
      <i class="pi pi-spin pi-spinner text-4xl text-primary"></i>
    </div>

    <!-- Content -->
    <div v-else class="space-y-6">
      <!-- My Registrations -->
      <Card v-if="myRegistrations.length > 0">
        <template #title>Your Registrations</template>
        <template #content>
          <div class="space-y-4">
            <div
              v-for="reg in myRegistrations"
              :key="reg.id"
              class="p-4 border rounded-lg bg-surface-50 dark:bg-surface-800"
            >
              <div class="flex justify-between items-start">
                <div>
                  <p class="font-semibold">
                    {{ getDinnerName(reg.value.dinnerId) }}
                  </p>
                  <Badge
                    :value="reg.value.registrationStatus"
                    :severity="getStatusSeverity(reg.value.registrationStatus)"
                    class="mt-2"
                  />
                </div>
                <div class="flex gap-2">
                  <Button
                    icon="pi pi-pencil"
                    text
                    rounded
                    size="small"
                    @click="editRegistration(reg)"
                    v-tooltip.top="'Edit Registration'"
                  />
                </div>
              </div>
              <p class="text-sm text-surface-600 dark:text-surface-400 mt-2">
                Registered: {{ formatDate(reg.value.registeredAt) }}
              </p>
            </div>
          </div>
        </template>
      </Card>

      <!-- Available Dinners -->
      <div>
        <h2 class="text-xl font-semibold mb-3">Available Dinners</h2>
        <div
          v-if="dinnerStore.publishedDinners.length === 0"
          class="text-center py-12"
        >
          <i class="pi pi-calendar-times text-6xl text-surface-400 mb-4"></i>
          <p class="text-lg text-surface-600 dark:text-surface-400">
            No published dinners available at the moment.
          </p>
        </div>

        <div v-else class="grid gap-4">
          <DinnerCard
            v-for="dinner in dinnerStore.publishedDinners"
            :key="dinner.id"
            :dinner="dinner.value"
            :participant-count="getParticipantCount(dinner.id!)"
          >
            <template #actions>
              <Button
                v-if="!isRegistered(dinner.id!)"
                label="Join"
                icon="pi pi-plus"
                size="small"
                @click="joinDinner(dinner)"
              />
              <Button
                v-else
                label="Already Registered"
                icon="pi pi-check"
                size="small"
                severity="success"
                disabled
              />
            </template>
          </DinnerCard>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { Person } from '@churchtools-extensions/ct-utils/ct-types';
import { churchtoolsClient } from '@churchtools/churchtools-client';
import { useRunningDinnerStore } from '../stores/runningDinner';
import { useParticipantStore } from '../stores/participant';
import { useToast } from 'primevue/usetoast';
import Button from '@churchtools-extensions/prime-volt/Button.vue';
import Card from '@churchtools-extensions/prime-volt/Card.vue';
import Badge from '@churchtools-extensions/prime-volt/Badge.vue';
import DinnerCard from '../components/DinnerCard.vue';

const dinnerStore = useRunningDinnerStore();
const participantStore = useParticipantStore();
const toast = useToast();
const loading = ref(true);
const currentUser = ref<Person | null>(null);

const myRegistrations = computed(() => {
  if (!currentUser.value?.id) return [];
  return participantStore.getByPersonId(currentUser.value.id);
});

onMounted(async () => {
  try {
    currentUser.value = (await churchtoolsClient.get('/whoami')) as Person;
    await Promise.all([dinnerStore.fetchAll(), participantStore.fetchAll()]);
  } catch (e) {
    console.error('Failed to load data', e);
  } finally {
    loading.value = false;
  }
});

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString();
}

function getDinnerName(dinnerId: number): string {
  const dinner = dinnerStore.getDinnerById(dinnerId);
  return dinner?.value.name || 'Unknown Dinner';
}

function getStatusSeverity(
  status: string,
): 'secondary' | 'success' | 'info' | 'warn' | 'danger' | 'contrast' {
  const severities: Record<
    string,
    'secondary' | 'success' | 'info' | 'warn' | 'danger' | 'contrast'
  > = {
    confirmed: 'success',
    pending: 'warn',
    waitlist: 'secondary',
    cancelled: 'danger',
  };
  return severities[status] || 'secondary';
}

function getParticipantCount(dinnerId: number): number {
  return participantStore.getConfirmedByDinnerId(dinnerId).length;
}

function isRegistered(dinnerId: number): boolean {
  return myRegistrations.value.some((reg) => reg.value.dinnerId === dinnerId);
}

function editRegistration(registration: any) {
  // TODO: Implement edit registration
  console.log('Edit registration', registration);
  toast.add({
    severity: 'info',
    summary: 'Coming Soon',
    detail: 'Edit registration will be implemented in the next phase',
    life: 3000,
  });
}

function joinDinner(dinner: any) {
  // TODO: Implement join dinner
  console.log('Join dinner', dinner);
  toast.add({
    severity: 'info',
    summary: 'Coming Soon',
    detail: 'Registration form will be implemented in the next phase',
    life: 3000,
  });
}
</script>
