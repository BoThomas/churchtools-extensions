<template>
  <div class="space-y-6">
    <h1 class="text-3xl font-bold">Browse Running Dinners</h1>

    <!-- Loading State -->
    <div v-if="dinnerStore.loading" class="flex justify-center py-12">
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

      <div v-else class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <DinnerCard
          v-for="dinner in dinnerStore.publishedDinners"
          :key="dinner.id"
          :dinner="dinner.value"
          :participant-count="getParticipantCount(dinner.id!)"
        >
          <template #actions>
            <Button
              label="Join Now"
              icon="pi pi-plus"
              size="small"
              @click="joinDinner(dinner)"
            />
          </template>
        </DinnerCard>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRunningDinnerStore } from '../stores/runningDinner';
import { useParticipantStore } from '../stores/participant';
import { useToast } from 'primevue/usetoast';
import Button from '@churchtools-extensions/prime-volt/Button.vue';
import DinnerCard from '../components/DinnerCard.vue';

const dinnerStore = useRunningDinnerStore();
const participantStore = useParticipantStore();
const toast = useToast();

onMounted(async () => {
  await Promise.all([dinnerStore.fetchAll(), participantStore.fetchAll()]);
});

function getParticipantCount(dinnerId: number): number {
  return participantStore.getConfirmedByDinnerId(dinnerId).length;
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
