<template>
  <div class="space-y-6">
    <h1 class="text-3xl font-bold">Participate in Running Dinners</h1>

    <!-- Loading State -->
    <div v-if="loading" class="flex justify-center py-12">
      <i class="pi pi-spin pi-spinner text-4xl text-primary"></i>
    </div>

    <!-- Content -->
    <div v-else>
      <div
        v-if="dinnerStore.publishedDinners.length === 0"
        class="text-center py-12"
      >
        <i class="pi pi-calendar-times text-6xl text-surface-400 mb-4"></i>
        <p class="text-lg text-surface-600 dark:text-surface-400">
          No published dinners available at the moment.
        </p>
      </div>

      <div v-else class="grid gap-4 md:grid-cols-2">
        <DinnerCard
          v-for="dinner in dinnerStore.publishedDinners"
          :key="dinner.id"
          :dinner="dinner.value"
          :participant-count="getParticipantCount(dinner.id!)"
        >
          <template #header>
            <Badge
              v-if="isRegistered(dinner.id!)"
              value="Registered"
              severity="success"
              class="absolute top-4 right-4"
            />
          </template>
          <template #actions>
            <Button
              v-if="!isRegistered(dinner.id!)"
              label="Join"
              icon="pi pi-plus"
              size="small"
              @click="joinDinner(dinner)"
            />
            <div v-else class="flex gap-2">
              <Button
                label="Edit Registration"
                icon="pi pi-pencil"
                size="small"
                severity="secondary"
                @click="editRegistration(getRegistration(dinner.id!))"
              />
            </div>
          </template>
        </DinnerCard>
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

function getParticipantCount(dinnerId: number): number {
  return participantStore.getConfirmedByDinnerId(dinnerId).length;
}

function isRegistered(dinnerId: number): boolean {
  return myRegistrations.value.some((reg) => reg.value.dinnerId === dinnerId);
}

function getRegistration(dinnerId: number) {
  return myRegistrations.value.find((reg) => reg.value.dinnerId === dinnerId);
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
