<template>
  <div class="space-y-6">
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
              <SecondaryButton
                label="Edit Registration"
                icon="pi pi-pencil"
                size="small"
                @click="editRegistration(dinner, getRegistration(dinner.id!))"
              />
            </div>
          </template>
        </DinnerCard>
      </div>
    </div>

    <!-- Registration Dialog -->
    <Dialog
      v-model:visible="showRegistrationDialog"
      :header="
        editingRegistration
          ? 'Edit Your Registration'
          : 'Register for Running Dinner'
      "
      :modal="true"
      :style="{ width: '90vw', maxWidth: '800px', maxHeight: '90vh' }"
    >
      <ParticipantForm
        v-if="selectedDinner"
        :dinner-id="selectedDinner.id!"
        :current-user="currentUser"
        :initial-data="editingRegistration?.value"
        :allow-preferred-meal="selectedDinner.value.allowPreferredMeal"
        :saving="participantStore.saving"
        @submit="handleRegistrationSubmit"
        @cancel="closeRegistrationDialog"
      />
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { Person } from '@churchtools-extensions/ct-utils/ct-types';
import type { Participant } from '../types/models';
import type { CategoryValue } from '@churchtools-extensions/persistance';
import { churchtoolsClient } from '@churchtools/churchtools-client';
import { useRunningDinnerStore } from '../stores/runningDinner';
import { useParticipantStore } from '../stores/participant';
import { useToast } from 'primevue/usetoast';
import Button from '@churchtools-extensions/prime-volt/Button.vue';
import SecondaryButton from '@churchtools-extensions/prime-volt/SecondaryButton.vue';
import Badge from '@churchtools-extensions/prime-volt/Badge.vue';
import Dialog from '@churchtools-extensions/prime-volt/Dialog.vue';
import DinnerCard from '../components/DinnerCard.vue';
import ParticipantForm from '../components/ParticipantForm.vue';

const dinnerStore = useRunningDinnerStore();
const participantStore = useParticipantStore();
const toast = useToast();
const loading = ref(true);
const currentUser = ref<Person | null>(null);
const showRegistrationDialog = ref(false);
const selectedDinner = ref<CategoryValue<any> | null>(null);
const editingRegistration = ref<CategoryValue<Participant> | null>(null);

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

function editRegistration(
  dinner: CategoryValue<any>,
  registration: CategoryValue<Participant> | undefined,
) {
  if (!registration) return;
  selectedDinner.value = dinner;
  editingRegistration.value = registration;
  showRegistrationDialog.value = true;
}

function joinDinner(dinner: CategoryValue<any>) {
  selectedDinner.value = dinner;
  editingRegistration.value = null;
  showRegistrationDialog.value = true;
}

async function handleRegistrationSubmit(data: Omit<Participant, 'id'>) {
  try {
    if (editingRegistration.value?.id) {
      // Update existing registration
      await participantStore.update(editingRegistration.value.id, data);
      toast.add({
        severity: 'success',
        summary: 'Updated',
        detail: 'Your registration has been updated successfully',
        life: 3000,
      });
    } else {
      // Create new registration
      await participantStore.create(data);
      toast.add({
        severity: 'success',
        summary: 'Registered',
        detail: 'You have been registered for this dinner',
        life: 3000,
      });
    }
    closeRegistrationDialog();
    // Refresh participant list
    await participantStore.fetchAll();
  } catch (e) {
    console.error('Failed to save registration', e);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to save registration. Please try again.',
      life: 3000,
    });
  }
}

function closeRegistrationDialog() {
  showRegistrationDialog.value = false;
  selectedDinner.value = null;
  editingRegistration.value = null;
}
</script>
