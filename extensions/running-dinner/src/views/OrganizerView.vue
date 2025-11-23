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
                  label="Manage"
                  icon="pi pi-cog"
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

    <!-- Details Dialog with Group Management -->
    <Dialog
      v-model:visible="showDetailsDialog"
      :header="selectedDinner?.value.name"
      :modal="true"
      :style="{ width: '95vw', maxWidth: '1400px', maxHeight: '95vh' }"
    >
      <div v-if="selectedDinner" class="space-y-4">
        <!-- Tabs for different sections -->
        <Tabs value="participants">
          <TabList>
            <Tab value="participants">
              <i class="pi pi-users mr-2"></i>
              Participants
            </Tab>
            <Tab value="groups">
              <i class="pi pi-sitemap mr-2"></i>
              Groups
            </Tab>
            <Tab value="routes">
              <i class="pi pi-map mr-2"></i>
              Routes
            </Tab>
          </TabList>

          <TabPanels>
            <!-- Participants Panel -->
            <TabPanel value="participants">
              <ParticipantList
                :participants="getDinnerParticipants(selectedDinner.id!)"
              />
            </TabPanel>

            <!-- Groups Panel -->
            <TabPanel value="groups">
              <GroupBuilder
                :dinner="selectedDinner.value"
                :participants="getDinnerParticipants(selectedDinner.id!)"
                @groups-saved="handleGroupsSaved"
                @groups-reset="handleGroupsReset"
              />
            </TabPanel>

            <!-- Routes Panel -->
            <TabPanel value="routes">
              <RouteAssignment
                :dinner="selectedDinner.value"
                :groups="getDinnerGroups(selectedDinner.id!)"
                :participants="getDinnerParticipants(selectedDinner.id!)"
                @routes-saved="handleRoutesSaved"
                @routes-reset="handleRoutesReset"
              />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </div>
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
import { useGroupStore } from '../stores/group';
import { useRouteStore } from '../stores/route';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import Button from '@churchtools-extensions/prime-volt/Button.vue';
import Dialog from '@churchtools-extensions/prime-volt/Dialog.vue';
import Fieldset from '@churchtools-extensions/prime-volt/Fieldset.vue';
import Tabs from '@churchtools-extensions/prime-volt/Tabs.vue';
import TabList from '@churchtools-extensions/prime-volt/TabList.vue';
import Tab from '@churchtools-extensions/prime-volt/Tab.vue';
import TabPanels from '@churchtools-extensions/prime-volt/TabPanels.vue';
import TabPanel from '@churchtools-extensions/prime-volt/TabPanel.vue';
import DinnerCard from '../components/DinnerCard.vue';
import DinnerForm from '../components/DinnerForm.vue';
import ParticipantList from '../components/ParticipantList.vue';
import GroupBuilder from '../components/GroupBuilder.vue';
import RouteAssignment from '../components/RouteAssignment.vue';

const dinnerStore = useRunningDinnerStore();
const participantStore = useParticipantStore();
const groupStore = useGroupStore();
const routeStore = useRouteStore();
const confirm = useConfirm();
const toast = useToast();

const showFormDialog = ref(false);
const showDetailsDialog = ref(false);
const editingDinner = ref<CategoryValue<RunningDinner> | null>(null);
const selectedDinner = ref<CategoryValue<RunningDinner> | null>(null);
const currentUserId = ref(0);

onMounted(async () => {
  try {
    const user = (await churchtoolsClient.get('/whoami')) as Person;
    currentUserId.value = user.id;
    await Promise.all([
      dinnerStore.fetchAll(),
      participantStore.fetchAll(),
      groupStore.fetchAll(),
    ]);
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

function getDinnerParticipants(dinnerId: number) {
  return participantStore.getByDinnerId(dinnerId);
}

function getDinnerGroups(dinnerId: number) {
  return groupStore.getByDinnerId(dinnerId);
}

async function handleGroupsSaved() {
  // Update dinner status to groups-created
  if (selectedDinner.value) {
    await dinnerStore.markGroupsCreated(selectedDinner.value.id!);
    await groupStore.fetchAll();
    toast.add({
      severity: 'success',
      summary: 'Groups Saved',
      detail: 'Groups have been saved and status updated',
      life: 3000,
    });
  }
}

async function handleGroupsReset() {
  // Reset dinner status to registration-closed when groups are removed
  if (selectedDinner.value) {
    await dinnerStore.resetToRegistrationClosed(selectedDinner.value.id!);
    await groupStore.fetchAll();
    await routeStore.fetchAll();
    toast.add({
      severity: 'info',
      summary: 'Status Reset',
      detail: 'Dinner status has been reset to registration-closed',
      life: 3000,
    });
  }
}

async function handleRoutesSaved() {
  // Update dinner status to routes-assigned
  if (selectedDinner.value) {
    await dinnerStore.update(selectedDinner.value.id!, {
      status: 'routes-assigned',
    });
    toast.add({
      severity: 'success',
      summary: 'Routes Assigned',
      detail: 'Routes have been assigned and saved successfully',
      life: 3000,
    });
  }
}

async function handleRoutesReset() {
  // Reset dinner status to groups-created when routes are removed
  if (selectedDinner.value) {
    await dinnerStore.resetToGroupsCreated(selectedDinner.value.id!);
    await routeStore.fetchAll();
    toast.add({
      severity: 'info',
      summary: 'Status Reset',
      detail: 'Dinner status has been reset to groups-created',
      life: 3000,
    });
  }
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
  selectedDinner.value = dinner;
  showDetailsDialog.value = true;
}
</script>
