<template>
  <div class="space-y-6">
    <div class="mt-2 flex justify-center items-center">
      <Button
        label="Create New Dinner"
        icon="pi pi-plus"
        class="w-full max-w-md"
        @click="openCreateDialog"
      />
    </div>

    <!-- Loading State -->
    <div v-if="dinnerStore.loading" class="flex justify-center py-12">
      <i class="pi pi-spin pi-spinner text-4xl text-primary"></i>
    </div>

    <!-- Dinners List -->
    <div v-else class="space-y-4">
      <div v-if="dinnerStore.dinners.length === 0" class="text-center py-12">
        <i class="pi pi-calendar-times text-6xl text-surface-400 mb-4"></i>
        <p class="text-lg text-surface-600 dark:text-surface-400">
          No running dinners yet. Create one to get started!
        </p>
      </div>

      <div v-else class="space-y-4">
        <!-- Active Dinners -->
        <Fieldset v-if="dinnerStore.activeDinners.length > 0">
          <template #legend>
            <div class="flex items-center gap-2">
              <i class="pi pi-calendar-check"></i>
              <span class="font-semibold">Active Dinners</span>
            </div>
          </template>
          <div class="grid gap-4">
            <DinnerCard
              v-for="dinner in dinnerStore.activeDinners"
              :key="dinner.id"
              :dinner="dinner.value"
              :participant-count="getParticipantCount(dinner.id!)"
              :show-actions="true"
              @edit="openEditDialog(dinner)"
              @delete="confirmDelete(dinner)"
            >
              <template #actions>
                <Button
                  v-if="dinner.value.status === 'draft'"
                  label="Publish"
                  icon="pi pi-send"
                  size="small"
                  @click="publishDinner(dinner.id!)"
                />
                <Button
                  label="View Details"
                  icon="pi pi-eye"
                  size="small"
                  outlined
                  @click="viewDetails(dinner)"
                />
              </template>
            </DinnerCard>
          </div>
        </Fieldset>

        <!-- Draft Dinners -->
        <Fieldset v-if="dinnerStore.draftDinners.length > 0">
          <template #legend>
            <div class="flex items-center gap-2">
              <i class="pi pi-file-edit"></i>
              <span class="font-semibold">Drafts</span>
            </div>
          </template>
          <div class="grid gap-4">
            <DinnerCard
              v-for="dinner in dinnerStore.draftDinners"
              :key="dinner.id"
              :dinner="dinner.value"
              :show-actions="true"
              @edit="openEditDialog(dinner)"
              @delete="confirmDelete(dinner)"
            >
              <template #actions>
                <Button
                  label="Publish"
                  icon="pi pi-send"
                  size="small"
                  @click="publishDinner(dinner.id!)"
                />
              </template>
            </DinnerCard>
          </div>
        </Fieldset>
      </div>
    </div>

    <!-- Create/Edit Dialog -->
    <Dialog
      v-model:visible="showFormDialog"
      :header="editingDinner ? 'Edit Running Dinner' : 'Create Running Dinner'"
      :modal="true"
      :style="{ width: '90vw', maxWidth: '1200px', maxHeight: '90vh' }"
    >
      <DinnerForm
        :initial-data="editingDinner?.value"
        :organizer-id="currentUserId"
        :saving="dinnerStore.saving"
        @submit="handleSubmit"
        @cancel="closeFormDialog"
      />
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { Person } from '@churchtools-extensions/ct-utils/ct-types';
import type { RunningDinner } from '../types/models';
import type { CategoryValue } from '@churchtools-extensions/persistance';
import { churchtoolsClient } from '@churchtools/churchtools-client';
import { useRunningDinnerStore } from '../stores/runningDinner';
import { useParticipantStore } from '../stores/participant';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import Button from '@churchtools-extensions/prime-volt/Button.vue';
import Dialog from '@churchtools-extensions/prime-volt/Dialog.vue';
import Fieldset from '@churchtools-extensions/prime-volt/Fieldset.vue';
import DinnerCard from '../components/DinnerCard.vue';
import DinnerForm from '../components/DinnerForm.vue';

const dinnerStore = useRunningDinnerStore();
const participantStore = useParticipantStore();
const confirm = useConfirm();
const toast = useToast();

const showFormDialog = ref(false);
const editingDinner = ref<CategoryValue<RunningDinner> | null>(null);
const currentUserId = ref(0);

onMounted(async () => {
  try {
    const user = (await churchtoolsClient.get('/whoami')) as Person;
    currentUserId.value = user.id;
    await Promise.all([dinnerStore.fetchAll(), participantStore.fetchAll()]);
  } catch (e) {
    console.error('Failed to initialize', e);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load data',
      life: 3000,
    });
  }
});

function getParticipantCount(dinnerId: number): number {
  return participantStore.getConfirmedByDinnerId(dinnerId).length;
}

function openCreateDialog() {
  editingDinner.value = null;
  showFormDialog.value = true;
}

function openEditDialog(dinner: CategoryValue<RunningDinner>) {
  editingDinner.value = dinner;
  showFormDialog.value = true;
}

function closeFormDialog() {
  showFormDialog.value = false;
  editingDinner.value = null;
}

async function handleSubmit(
  data: Omit<RunningDinner, 'id' | 'createdAt' | 'updatedAt'>,
) {
  try {
    if (editingDinner.value) {
      await dinnerStore.update(editingDinner.value.id!, data);
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Dinner updated successfully',
        life: 3000,
      });
    } else {
      await dinnerStore.create(data);
      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Dinner created successfully',
        life: 3000,
      });
    }
    closeFormDialog();
  } catch (e) {
    console.error('Failed to save dinner', e);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to save dinner',
      life: 3000,
    });
  }
}

async function publishDinner(id: number) {
  try {
    await dinnerStore.publish(id);
    toast.add({
      severity: 'success',
      summary: 'Published',
      detail: 'Dinner is now visible to participants',
      life: 3000,
    });
  } catch (e) {
    console.error('Failed to publish dinner', e);
  }
}

function confirmDelete(dinner: CategoryValue<RunningDinner>) {
  confirm.require({
    message: `Are you sure you want to delete "${dinner.value.name}"?`,
    header: 'Confirm Deletion',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await dinnerStore.remove(dinner.id!);
        toast.add({
          severity: 'success',
          summary: 'Deleted',
          detail: 'Dinner deleted successfully',
          life: 3000,
        });
      } catch (e) {
        console.error('Failed to delete dinner', e);
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to delete dinner',
          life: 3000,
        });
      }
    },
  });
}

function viewDetails(dinner: CategoryValue<RunningDinner>) {
  // TODO: Navigate to detail view
  console.log('View details for dinner', dinner.id);
  toast.add({
    severity: 'info',
    summary: 'Coming Soon',
    detail: 'Detail view will be implemented in the next phase',
    life: 3000,
  });
}
</script>
