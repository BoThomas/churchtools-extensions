<template>
  <div class="space-y-6">
    <div class="mt-2 flex justify-center items-center gap-4">
      <Button
        label="Create New Dinner"
        icon="pi pi-plus"
        class="w-full max-w-md"
        @click="openCreateDialog"
      />
      <Button
        label="Create from Group"
        icon="pi pi-users"
        class="w-full max-w-md"
        outlined
        @click="openGroupSelectorDialog"
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
        :initial-group-name="selectedGroup?.name"
        :saving="dinnerStore.saving"
        @submit="handleSubmit"
        @cancel="closeFormDialog"
      />
    </Dialog>

    <!-- Details Dialog with Group Management -->
    <Dialog
      v-model:visible="showDetailsDialog"
      :modal="true"
      :style="{ width: '95vw', maxWidth: '1400px', maxHeight: '95vh' }"
    >
      <template #header>
        <div class="flex items-center gap-3">
          <span class="text-xl font-semibold">{{
            selectedDinner?.value.name
          }}</span>
          <Badge
            v-if="selectedDinner"
            :value="getStatusLabel(selectedDinner.value.status)"
            :severity="getStatusSeverity(selectedDinner.value.status)"
          />
        </div>
      </template>
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
              <!-- Registration Control -->
              <Card class="mb-4">
                <template #content>
                  <div class="flex items-center justify-between">
                    <div>
                      <div class="font-semibold mb-1">Registration Status</div>
                      <div
                        class="text-sm text-surface-600 dark:text-surface-400"
                      >
                        <span
                          v-if="selectedDinner.value.status === 'published'"
                        >
                          Registration is currently open. Participants can join.
                        </span>
                        <span
                          v-else-if="
                            selectedDinner.value.status ===
                            'registration-closed'
                          "
                        >
                          Registration is closed. New participants cannot join.
                        </span>
                        <span v-else>
                          Registration controls are only available when status
                          is Published or Registration Closed.
                        </span>
                      </div>
                    </div>
                    <div class="flex gap-2">
                      <Button
                        v-if="selectedDinner.value.status === 'published'"
                        label="Close Registration"
                        icon="pi pi-lock"
                        severity="warn"
                        @click="handleCloseRegistration(selectedDinner.id!)"
                      />
                      <Button
                        v-if="
                          selectedDinner.value.status === 'registration-closed'
                        "
                        label="Open Registration"
                        icon="pi pi-unlock"
                        severity="success"
                        @click="handleOpenRegistration(selectedDinner.id!)"
                      />
                    </div>
                  </div>
                </template>
              </Card>

              <ParticipantList
                :participants="getDinnerParticipants(selectedDinner.id!)"
                @confirm="handleConfirmParticipant"
                @edit="handleEditParticipant"
                @delete="handleDeleteParticipant"
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

    <!-- Edit Participant Dialog -->
    <Dialog
      v-model:visible="showEditParticipantDialog"
      :header="'Edit Participant'"
      :modal="true"
      :style="{ width: '90vw', maxWidth: '800px', maxHeight: '90vh' }"
    >
      <ParticipantForm
        v-if="editingParticipant && selectedDinner"
        :dinner-id="selectedDinner.id!"
        :initial-data="editingParticipant.value"
        :allow-preferred-meal="selectedDinner.value.allowPreferredMeal"
        :saving="participantStore.saving"
        @submit="handleParticipantSubmit"
        @cancel="closeEditParticipantDialog"
      />
    </Dialog>

    <!-- Group Selector Dialog -->
    <Dialog
      v-model:visible="showGroupSelectorDialog"
      header="Create Dinner from ChurchTools Group"
      :modal="true"
      :style="{ width: '90vw', maxWidth: '800px', maxHeight: '90vh' }"
    >
      <GroupSelector
        @continue="handleGroupSelected"
        @cancel="closeGroupSelectorDialog"
      />
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { Person, Group } from '@churchtools-extensions/ct-utils/ct-types';
import type { RunningDinner, Participant } from '../types/models';
import type { CategoryValue } from '@churchtools-extensions/persistance';
import { churchtoolsClient } from '@churchtools/churchtools-client';
import { useRunningDinnerStore } from '../stores/runningDinner';
import { useParticipantStore } from '../stores/participant';
import { useGroupStore } from '../stores/group';
import { useRouteStore } from '../stores/route';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import Badge from '@churchtools-extensions/prime-volt/Badge.vue';
import Button from '@churchtools-extensions/prime-volt/Button.vue';
import Card from '@churchtools-extensions/prime-volt/Card.vue';
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
import ParticipantForm from '../components/ParticipantForm.vue';
import GroupBuilder from '../components/GroupBuilder.vue';
import RouteAssignment from '../components/RouteAssignment.vue';
import GroupSelector from '../components/GroupSelector.vue';

const dinnerStore = useRunningDinnerStore();
const participantStore = useParticipantStore();
const groupStore = useGroupStore();
const routeStore = useRouteStore();
const confirm = useConfirm();
const toast = useToast();

const showFormDialog = ref(false);
const showDetailsDialog = ref(false);
const showEditParticipantDialog = ref(false);
const showGroupSelectorDialog = ref(false);
const editingDinner = ref<CategoryValue<RunningDinner> | null>(null);
const editingParticipant = ref<CategoryValue<Participant> | null>(null);
const selectedDinnerId = ref<number | null>(null);
const selectedGroup = ref<Group | null>(null);
const isCreatingFromGroup = ref(false);
const selectedDinner = computed(() => {
  if (!selectedDinnerId.value) return null;
  return dinnerStore.getDinnerById(selectedDinnerId.value);
});
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

async function handleCloseRegistration(dinnerId: number) {
  confirm.require({
    message:
      'Are you sure you want to close registration? No new participants will be able to join.',
    header: 'Close Registration',
    icon: 'pi pi-exclamation-triangle',
    accept: async () => {
      await dinnerStore.closeRegistration(dinnerId);
      toast.add({
        severity: 'info',
        summary: 'Registration Closed',
        detail: 'Participants can no longer join this dinner',
        life: 3000,
      });
    },
  });
}

async function handleOpenRegistration(dinnerId: number) {
  confirm.require({
    message:
      'Are you sure you want to reopen registration? Participants will be able to join again.',
    header: 'Open Registration',
    icon: 'pi pi-question-circle',
    accept: async () => {
      await dinnerStore.publish(dinnerId);
      toast.add({
        severity: 'success',
        summary: 'Registration Opened',
        detail: 'Participants can now join this dinner',
        life: 3000,
      });
    },
  });
}

async function handleConfirmParticipant(
  participant: CategoryValue<Participant>,
) {
  confirm.require({
    message: `Confirm registration for "${participant.value.name}"? They will be moved from the waitlist to confirmed status.`,
    header: 'Confirm Registration',
    icon: 'pi pi-question-circle',
    accept: async () => {
      try {
        await participantStore.confirm(participant.id!);
        toast.add({
          severity: 'success',
          summary: 'Registration Confirmed',
          detail: `${participant.value.name} has been confirmed`,
          life: 3000,
        });
        await participantStore.fetchAll();
      } catch (e) {
        console.error('Failed to confirm participant', e);
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to confirm participant',
          life: 3000,
        });
      }
    },
  });
}

function handleEditParticipant(participant: CategoryValue<Participant>) {
  editingParticipant.value = participant;
  showEditParticipantDialog.value = true;
}

function handleDeleteParticipant(participant: CategoryValue<Participant>) {
  confirm.require({
    message: `Are you sure you want to delete "${participant.value.name}"? This action cannot be undone.`,
    header: 'Delete Participant',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    rejectLabel: 'Cancel',
    acceptLabel: 'Delete',
    accept: async () => {
      try {
        await participantStore.remove(participant.id!);
        toast.add({
          severity: 'success',
          summary: 'Participant Deleted',
          detail: `${participant.value.name} has been deleted`,
          life: 3000,
        });
        await participantStore.fetchAll();
      } catch (e) {
        console.error('Failed to delete participant', e);
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to delete participant',
          life: 3000,
        });
      }
    },
  });
}

async function handleParticipantSubmit(data: Omit<Participant, 'id'>) {
  try {
    if (editingParticipant.value?.id) {
      await participantStore.update(editingParticipant.value.id, data);
      toast.add({
        severity: 'success',
        summary: 'Updated',
        detail: 'Participant has been updated successfully',
        life: 3000,
      });
    }
    closeEditParticipantDialog();
    await participantStore.fetchAll();
  } catch (e) {
    console.error('Failed to save participant', e);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to save participant. Please try again.',
      life: 3000,
    });
  }
}

function closeEditParticipantDialog() {
  showEditParticipantDialog.value = false;
  editingParticipant.value = null;
}

function openGroupSelectorDialog() {
  showGroupSelectorDialog.value = true;
}

function closeGroupSelectorDialog() {
  showGroupSelectorDialog.value = false;
  selectedGroup.value = null;
}

async function handleGroupSelected(group: Group) {
  selectedGroup.value = group;
  isCreatingFromGroup.value = true;
  closeGroupSelectorDialog();
  // Open the dinner form with pre-filled name
  editingDinner.value = null; // Ensure we're creating, not editing
  showFormDialog.value = true;
}

async function addGroupMembersAsParticipants(
  groupId: number,
  dinnerId: number,
) {
  try {
    // Fetch group members from ChurchTools - start with first page
    const firstResponse = (await churchtoolsClient.get(
      `/groups/${groupId}/members`,
    )) as {
      data: Array<{
        person: { domainIdentifier: string; title: string };
        personId: number;
      }>;
      meta: { count: number; pagination: { total: number; lastPage: number } };
    };

    console.log('Group members response:', firstResponse);
    let members = firstResponse.data || [];

    // If there are more pages, fetch them
    if (firstResponse.meta?.pagination?.lastPage > 1) {
      const totalPages = firstResponse.meta.pagination.lastPage;
      const additionalPages = [];

      for (let page = 2; page <= totalPages; page++) {
        additionalPages.push(
          churchtoolsClient.get(`/groups/${groupId}/members?page=${page}`),
        );
      }

      const additionalResponses = (await Promise.all(
        additionalPages,
      )) as Array<{
        data: Array<{
          person: { domainIdentifier: string; title: string };
          personId: number;
        }>;
      }>;

      for (const pageResponse of additionalResponses) {
        members.push(...(pageResponse.data || []));
      }
    }

    if (!members || members.length === 0) {
      toast.add({
        severity: 'info',
        summary: 'No Members',
        detail: 'This group has no members to add',
        life: 3000,
      });
      return;
    }

    let addedCount = 0;

    // Add each member as a participant
    for (const member of members) {
      try {
        // Fetch full person details
        const personResponse = (await churchtoolsClient.get(
          `/persons/${member.personId}`,
        )) as { data: Person };
        const person = personResponse.data;

        // Create participant record with basic info from ChurchTools
        const participantData = {
          dinnerId,
          personId: person.id,
          name: `${person.firstName} ${person.lastName}`,
          email: person.email || '',
          phone: person.phonePrivate || person.mobile || '',
          address: {
            street: person.addressAddition || '',
            zip: person.zip || '',
            city: person.city || '',
          },
          preferredPartners: [],
          dietaryRestrictions: '',
          registrationStatus: 'confirmed' as const,
        };

        await participantStore.create(participantData);
        addedCount++;
      } catch (personError) {
        console.error(
          `Failed to fetch/add person ${member.personId}:`,
          personError,
        );
        // Continue with other members even if one fails
      }
    }

    // Refresh participants list
    await participantStore.fetchAll();

    toast.add({
      severity: 'success',
      summary: 'Members Added',
      detail: `${addedCount} group ${addedCount === 1 ? 'member' : 'members'} added as participants`,
      life: 5000,
    });
  } catch (e) {
    console.error('Failed to add group members', e);
    toast.add({
      severity: 'warn',
      summary: 'Warning',
      detail:
        'Dinner was created but some group members could not be added automatically',
      life: 5000,
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
      const newDinnerId = await dinnerStore.create(data);

      // If creating from a group, add all group members as participants
      if (isCreatingFromGroup.value && selectedGroup.value && newDinnerId) {
        await addGroupMembersAsParticipants(
          selectedGroup.value.id,
          newDinnerId,
        );
      }

      toast.add({
        severity: 'success',
        summary: 'Success',
        detail: isCreatingFromGroup.value
          ? 'Dinner created and group members added!'
          : 'Dinner created successfully',
        life: 3000,
      });
    }
    closeFormDialog();
    isCreatingFromGroup.value = false;
    selectedGroup.value = null;
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
  selectedDinnerId.value = dinner.id!;
  showDetailsDialog.value = true;
}

function getStatusLabel(status: RunningDinner['status']): string {
  const labels: Record<typeof status, string> = {
    draft: 'Draft',
    published: 'Open for Registration',
    'registration-closed': 'Registration Closed',
    'groups-created': 'Groups Created',
    'routes-assigned': 'Routes Assigned',
    completed: 'Completed',
  };
  return labels[status];
}

function getStatusSeverity(
  status: RunningDinner['status'],
): 'secondary' | 'success' | 'info' | 'warn' | 'danger' | 'contrast' {
  const severities: Record<
    typeof status,
    'secondary' | 'success' | 'info' | 'warn' | 'danger' | 'contrast'
  > = {
    draft: 'secondary',
    published: 'success',
    'registration-closed': 'warn',
    'groups-created': 'info',
    'routes-assigned': 'info',
    completed: 'contrast',
  };
  return severities[status];
}
</script>
