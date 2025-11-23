<template>
  <div class="space-y-4">
    <!-- Status and Actions -->
    <Card>
      <template #content>
        <div class="space-y-4">
          <!-- Status Info -->
          <div class="grid grid-cols-3 gap-4">
            <div class="text-center">
              <div class="text-2xl font-bold text-primary">
                {{ confirmedParticipants.length }}
              </div>
              <div class="text-sm text-surface-600 dark:text-surface-400">
                Confirmed Participants
              </div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-success">
                {{ groups.length }}
              </div>
              <div class="text-sm text-surface-600 dark:text-surface-400">
                Groups Created
              </div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-warn">
                {{ waitlistParticipants.length }}
              </div>
              <div class="text-sm text-surface-600 dark:text-surface-400">
                Waitlisted
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex gap-2">
            <Button
              label="Create Groups"
              icon="pi pi-users"
              @click="handleCreateGroups"
              :loading="creating"
              :disabled="
                creating ||
                groups.length > 0 ||
                dinner.status !== 'registration-closed'
              "
            />
            <Button
              v-if="groups.length > 0"
              label="Save Groups"
              icon="pi pi-save"
              @click="handleSaveGroups"
              :loading="saving"
              :disabled="saving"
            />
            <DangerButton
              v-if="groups.length > 0"
              label="Reset"
              icon="pi pi-refresh"
              outlined
              @click="handleReset"
              :disabled="creating || saving"
            />
          </div>

          <!-- Warnings -->
          <div v-if="warnings.length > 0" class="space-y-2">
            <Message
              v-for="(warning, idx) in warnings"
              :key="idx"
              severity="warn"
              :closable="false"
            >
              {{ warning }}
            </Message>
          </div>
        </div>
      </template>
    </Card>

    <!-- Groups Display -->
    <div v-if="groups.length > 0">
      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <GroupCard
          v-for="group in groups"
          :key="group.groupNumber"
          :group="group"
          :participants="allParticipants"
          :editable="true"
          @set-host="
            (participantId) => setHost(group.groupNumber, participantId)
          "
          @remove-member="
            (participantId) => removeMember(group.groupNumber, participantId)
          "
          @delete="deleteGroup(group.groupNumber)"
        />
      </div>

      <!-- Unassigned Participants -->
      <Card v-if="unassignedParticipants.length > 0" class="mt-4">
        <template #title>Unassigned Participants</template>
        <template #content>
          <div class="space-y-2">
            <div
              v-for="participant in unassignedParticipants"
              :key="participant.id"
              class="flex items-center justify-between p-2 rounded bg-surface-50 dark:bg-surface-800"
            >
              <div>
                <div class="font-medium">{{ participant.value.name }}</div>
                <div class="text-sm text-surface-600 dark:text-surface-400">
                  {{ participant.value.email }}
                </div>
              </div>
              <div class="flex gap-2">
                <Button
                  label="Add to Group"
                  icon="pi pi-plus"
                  size="small"
                  @click="showAddToGroupDialog(participant)"
                />
                <SecondaryButton
                  label="Create New Group"
                  icon="pi pi-users"
                  size="small"
                  @click="createNewGroupWithParticipant(participant)"
                />
              </div>
            </div>
          </div>
        </template>
      </Card>
    </div>

    <!-- Empty State -->
    <Card v-else>
      <template #content>
        <div class="text-center py-12">
          <i class="pi pi-users text-6xl text-surface-400 mb-4"></i>
          <p class="text-lg text-surface-600 dark:text-surface-400 mb-2">
            No groups created yet
          </p>
          <p class="text-sm text-surface-500 dark:text-surface-500">
            <span v-if="dinner.status !== 'registration-closed'">
              Close registration first, then click "Create Groups" to
              automatically generate groups based on participant preferences.
            </span>
            <span v-else>
              Click "Create Groups" to automatically generate groups based on
              participant preferences.
            </span>
          </p>
        </div>
      </template>
    </Card>

    <!-- Add to Group Dialog -->
    <Dialog
      v-model:visible="showAddDialog"
      header="Add Participant to Group"
      :modal="true"
      :style="{ width: '400px' }"
    >
      <div v-if="selectedParticipant" class="space-y-4">
        <div>
          <div class="font-medium mb-2">
            {{ selectedParticipant.value.name }}
          </div>
          <div class="text-sm text-surface-600 dark:text-surface-400">
            {{ selectedParticipant.value.email }}
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <label class="font-medium text-sm">Select Group:</label>
          <Select
            v-model="selectedGroupNumber"
            :options="groupOptions"
            optionLabel="label"
            optionValue="value"
            placeholder="Choose a group"
          />
        </div>

        <div class="flex justify-end gap-2">
          <SecondaryButton label="Cancel" @click="showAddDialog = false" />
          <Button
            label="Add"
            @click="addParticipantToGroup"
            :disabled="!selectedGroupNumber"
          />
        </div>
      </div>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { Group, Participant, RunningDinner } from '../types/models';
import type { CategoryValue } from '@churchtools-extensions/persistance';
import { createGroups } from '../algorithms/grouping';
import { useGroupStore } from '../stores/group';
import { useParticipantStore } from '../stores/participant';
import { useRouteStore } from '../stores/route';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import Card from '@churchtools-extensions/prime-volt/Card.vue';
import Button from '@churchtools-extensions/prime-volt/Button.vue';
import SecondaryButton from '@churchtools-extensions/prime-volt/SecondaryButton.vue';
import DangerButton from '@churchtools-extensions/prime-volt/DangerButton.vue';
import Message from '@churchtools-extensions/prime-volt/Message.vue';
import Dialog from '@churchtools-extensions/prime-volt/Dialog.vue';
import Select from '@churchtools-extensions/prime-volt/Select.vue';
import GroupCard from './GroupCard.vue';

interface Props {
  dinner: RunningDinner;
  participants: CategoryValue<Participant>[];
}

const props = defineProps<Props>();

const groupStore = useGroupStore();
const participantStore = useParticipantStore();
const confirm = useConfirm();
const toast = useToast();

const emit = defineEmits<{
  'groups-saved': [];
  'groups-reset': [];
}>();

const groups = ref<Group[]>([]);
const warnings = ref<string[]>([]);
const creating = ref(false);
const saving = ref(false);
const showAddDialog = ref(false);
const selectedParticipant = ref<CategoryValue<Participant> | null>(null);
const selectedGroupNumber = ref<number | null>(null);

// Load existing groups on mount
onMounted(async () => {
  if (props.dinner.id) {
    const existingGroups = groupStore.getByDinnerId(props.dinner.id);
    if (existingGroups.length > 0) {
      groups.value = existingGroups.map((g) => g.value);
    }
  }
});

const confirmedParticipants = computed(() => {
  return props.participants.filter(
    (p) => p.value.registrationStatus === 'confirmed',
  );
});

const waitlistParticipants = computed(() => {
  return props.participants.filter(
    (p) => p.value.registrationStatus === 'waitlist',
  );
});

const allParticipants = computed(() => props.participants);

const assignedParticipantIds = computed(() => {
  const ids = new Set<number>();
  groups.value.forEach((g) => {
    g.participantIds.forEach((id) => ids.add(id));
  });
  return ids;
});

const unassignedParticipants = computed(() => {
  return confirmedParticipants.value.filter(
    (p) => !assignedParticipantIds.value.has(p.id!),
  );
});

const groupOptions = computed(() => {
  return groups.value.map((g) => ({
    label: `Group ${g.groupNumber} (${g.participantIds.length} members)`,
    value: g.groupNumber,
  }));
});

async function handleCreateGroups() {
  creating.value = true;
  try {
    const result = createGroups(props.dinner, confirmedParticipants.value);

    groups.value = result.groups.map((g, idx) => ({
      ...g,
      groupNumber: idx + 1,
    })) as Group[];

    warnings.value = result.warnings;

    // Move excess participants to waitlist
    if (result.waitlistedParticipantIds.length > 0) {
      for (const participantId of result.waitlistedParticipantIds) {
        await participantStore.update(participantId, {
          registrationStatus: 'waitlist',
        } as any);
      }
      await participantStore.fetchAll();
    }

    toast.add({
      severity: 'success',
      summary: 'Groups Created',
      detail: `${groups.value.length} groups created successfully`,
      life: 3000,
    });
  } catch (e: any) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: e.message || 'Failed to create groups',
      life: 5000,
    });
  } finally {
    creating.value = false;
  }
}

async function handleSaveGroups() {
  saving.value = true;
  try {
    // Use saveOrUpdateMultiple to update existing or create new groups
    await groupStore.saveOrUpdateMultiple(props.dinner.id!, groups.value);

    // Emit event to parent to update dinner status
    emit('groups-saved');
  } catch (e) {
    console.error('Failed to save groups', e);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to save groups',
      life: 3000,
    });
  } finally {
    saving.value = false;
  }
}

function handleReset() {
  confirm.require({
    message:
      'Are you sure you want to reset? This will delete all saved groups AND routes for this dinner, and reset the status to registration-closed.',
    header: 'Confirm Reset',
    icon: 'pi pi-exclamation-triangle',
    accept: async () => {
      try {
        // Delete all saved groups and routes for this dinner
        if (props.dinner.id) {
          const routeStore = useRouteStore();
          await routeStore.deleteByDinnerId(props.dinner.id);
          await groupStore.deleteByDinnerId(props.dinner.id);
        }

        // Clear local state
        groups.value = [];
        warnings.value = [];

        // Emit event to parent to refresh and update dinner status
        emit('groups-reset');

        toast.add({
          severity: 'info',
          summary: 'Reset',
          detail: 'Groups and routes have been reset and removed from storage',
          life: 3000,
        });
      } catch (e) {
        console.error('Failed to reset groups', e);
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to reset groups',
          life: 3000,
        });
      }
    },
  });
}

function setHost(groupNumber: number, participantId: number) {
  const group = groups.value.find((g) => g.groupNumber === groupNumber);
  if (group) {
    group.hostParticipantId = participantId;
  }
}

function removeMember(groupNumber: number, participantId: number) {
  const group = groups.value.find((g) => g.groupNumber === groupNumber);
  if (group) {
    group.participantIds = group.participantIds.filter(
      (id) => id !== participantId,
    );

    // If removed participant was host, assign new host
    if (
      group.hostParticipantId === participantId &&
      group.participantIds.length > 0
    ) {
      group.hostParticipantId = group.participantIds[0];
    }
  }
}

function deleteGroup(groupNumber: number) {
  confirm.require({
    message: 'Are you sure you want to delete this group?',
    header: 'Confirm Delete',
    icon: 'pi pi-exclamation-triangle',
    accept: () => {
      groups.value = groups.value.filter((g) => g.groupNumber !== groupNumber);
      // Renumber groups
      groups.value.forEach((g, idx) => {
        g.groupNumber = idx + 1;
      });
    },
  });
}

function showAddToGroupDialog(participant: CategoryValue<Participant>) {
  selectedParticipant.value = participant;
  selectedGroupNumber.value = null;
  showAddDialog.value = true;
}

function addParticipantToGroup() {
  if (!selectedParticipant.value || !selectedGroupNumber.value) return;

  const group = groups.value.find(
    (g) => g.groupNumber === selectedGroupNumber.value,
  );
  if (group) {
    group.participantIds.push(selectedParticipant.value.id!);
    showAddDialog.value = false;
    toast.add({
      severity: 'success',
      summary: 'Added',
      detail: 'Participant added to group',
      life: 3000,
    });
  }
}

function createNewGroupWithParticipant(
  participant: CategoryValue<Participant>,
) {
  const now = new Date().toISOString();
  const newGroupNumber = groups.value.length + 1;

  const newGroup: Group = {
    dinnerId: props.dinner.id!,
    groupNumber: newGroupNumber,
    participantIds: [participant.id!],
    hostParticipantId: participant.id!, // Set as host by default
    createdAt: now,
    updatedAt: now,
  };

  groups.value.push(newGroup);

  toast.add({
    severity: 'success',
    summary: 'Group Created',
    detail: `New group ${newGroupNumber} created with participant`,
    life: 3000,
  });
}
</script>
