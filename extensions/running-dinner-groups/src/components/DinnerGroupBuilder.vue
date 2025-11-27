<template>
  <div class="space-y-4">
    <!-- Status and Actions Card -->
    <Card>
      <template #content>
        <div class="space-y-4">
          <!-- Status Info -->
          <div class="grid grid-cols-3 gap-4">
            <div class="text-center">
              <div class="text-2xl font-bold text-primary">
                {{ activeMembers.length }}
              </div>
              <div class="text-sm text-surface-600 dark:text-surface-400">
                Active Members
              </div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-success">
                {{ localDinnerGroups.length }}
              </div>
              <div class="text-sm text-surface-600 dark:text-surface-400">
                Groups Created
              </div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-warn">
                {{ unassignedMembers.length }}
              </div>
              <div class="text-sm text-surface-600 dark:text-surface-400">
                Unassigned
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex gap-2 flex-wrap">
            <Button
              label="Create Groups"
              icon="pi pi-users"
              @click="handleCreateGroups"
              :loading="creating"
              :disabled="
                creating ||
                localDinnerGroups.length > 0 ||
                activeMembers.length < minMembersNeeded
              "
            />
            <Button
              v-if="localDinnerGroups.length > 0 && !isSaved"
              label="Save Groups"
              icon="pi pi-save"
              @click="handleSaveGroups"
              :loading="saving"
              severity="success"
            />
            <DangerButton
              v-if="localDinnerGroups.length > 0"
              label="Reset"
              icon="pi pi-refresh"
              outlined
              @click="handleReset"
              :disabled="creating || saving"
            />
          </div>

          <!-- Min members warning -->
          <Message
            v-if="activeMembers.length < minMembersNeeded"
            severity="warn"
            :closable="false"
          >
            Need at least {{ minMembersNeeded }} active members (3 meals ×
            {{ event.value.preferredGroupSize }} per group). Currently have
            {{ activeMembers.length }}.
          </Message>

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
    <div v-if="localDinnerGroups.length > 0">
      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <DinnerGroupCard
          v-for="group in localDinnerGroups"
          :key="group.groupNumber"
          :group="group"
          :members="members"
          :editable="!isSaved"
          @set-host="(personId: number) => setHost(group.groupNumber, personId)"
          @remove-member="
            (personId: number) => removeMember(group.groupNumber, personId)
          "
          @delete="deleteGroup(group.groupNumber)"
        />
      </div>

      <!-- Unassigned Members -->
      <Card v-if="unassignedMembers.length > 0" class="mt-4">
        <template #title>
          <i class="pi pi-user-minus mr-2"></i>
          Unassigned Members ({{ unassignedMembers.length }})
        </template>
        <template #content>
          <div class="space-y-2">
            <div
              v-for="member in unassignedMembers"
              :key="member.personId"
              class="flex items-center justify-between p-2 rounded bg-surface-50 dark:bg-surface-800"
            >
              <div>
                <div class="font-medium">
                  {{ member.person.firstName }} {{ member.person.lastName }}
                </div>
                <div class="text-sm text-surface-600 dark:text-surface-400">
                  {{ member.person.email }}
                </div>
              </div>
              <div class="flex gap-2">
                <Button
                  label="Add to Group"
                  icon="pi pi-plus"
                  size="small"
                  @click="showAddToGroupDialog(member)"
                  :disabled="isSaved"
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
            No dinner groups created yet
          </p>
          <p class="text-sm text-surface-500">
            Click "Create Groups" to automatically generate groups based on
            member preferences.
          </p>
        </div>
      </template>
    </Card>

    <!-- Add to Group Dialog -->
    <Dialog
      v-model:visible="showAddDialog"
      header="Add Member to Group"
      :modal="true"
      :style="{ width: '400px' }"
    >
      <div v-if="selectedMember" class="space-y-4">
        <div>
          <div class="font-medium mb-2">
            {{ selectedMember.person.firstName }}
            {{ selectedMember.person.lastName }}
          </div>
          <div class="text-sm text-surface-600 dark:text-surface-400">
            {{ selectedMember.person.email }}
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
            @click="addMemberToGroup"
            :disabled="!selectedGroupNumber"
          />
        </div>
      </div>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { CategoryValue } from '@churchtools-extensions/persistance';
import type { EventMetadata, DinnerGroup, GroupMember } from '@/types/models';
import { groupingService } from '@/services/GroupingService';
import { useDinnerGroupStore } from '@/stores/dinnerGroup';
import { useEventMetadataStore } from '@/stores/eventMetadata';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import Card from '@churchtools-extensions/prime-volt/Card.vue';
import Button from '@churchtools-extensions/prime-volt/Button.vue';
import SecondaryButton from '@churchtools-extensions/prime-volt/SecondaryButton.vue';
import DangerButton from '@churchtools-extensions/prime-volt/DangerButton.vue';
import Message from '@churchtools-extensions/prime-volt/Message.vue';
import Dialog from 'primevue/dialog';
import Select from '@churchtools-extensions/prime-volt/Select.vue';
import DinnerGroupCard from './DinnerGroupCard.vue';

const props = defineProps<{
  event: CategoryValue<EventMetadata>;
  members: GroupMember[];
  dinnerGroups: CategoryValue<DinnerGroup>[];
  loading?: boolean;
}>();

const emit = defineEmits<{
  'groups-created': [];
  'groups-saved': [];
  refresh: [];
}>();

const dinnerGroupStore = useDinnerGroupStore();
const eventMetadataStore = useEventMetadataStore();
const confirm = useConfirm();
const toast = useToast();

const localDinnerGroups = ref<
  Omit<DinnerGroup, 'id' | 'createdAt' | 'updatedAt'>[]
>([]);
const warnings = ref<string[]>([]);
const creating = ref(false);
const saving = ref(false);
const isSaved = ref(false);
const showAddDialog = ref(false);
const selectedMember = ref<GroupMember | null>(null);
const selectedGroupNumber = ref<number | null>(null);

// Computed
const activeMembers = computed(() =>
  props.members.filter((m) => m.groupMemberStatus === 'active'),
);

const minMembersNeeded = computed(
  () => 3 * props.event.value.preferredGroupSize,
);

const assignedPersonIds = computed(() => {
  const ids = new Set<number>();
  localDinnerGroups.value.forEach((g) => {
    g.memberPersonIds.forEach((id) => ids.add(id));
  });
  return ids;
});

const unassignedMembers = computed(() =>
  activeMembers.value.filter((m) => !assignedPersonIds.value.has(m.personId)),
);

const groupOptions = computed(() =>
  localDinnerGroups.value.map((g) => ({
    label: `Group ${g.groupNumber} (${g.memberPersonIds.length} members) - ${getMealLabel(g.assignedMeal)}`,
    value: g.groupNumber,
  })),
);

// Watch for existing dinner groups
watch(
  () => props.dinnerGroups,
  (newGroups) => {
    if (newGroups.length > 0 && localDinnerGroups.value.length === 0) {
      localDinnerGroups.value = newGroups.map((g) => ({ ...g.value }));
      isSaved.value = true;
    }
  },
  { immediate: true },
);

// Methods
function getMealLabel(meal: string): string {
  const labels: Record<string, string> = {
    starter: '🥗 Starter',
    mainCourse: '🍽️ Main',
    dessert: '🍰 Dessert',
  };
  return labels[meal] || meal;
}

async function handleCreateGroups() {
  creating.value = true;
  warnings.value = [];

  try {
    const result = groupingService.createDinnerGroups(
      props.event.value,
      activeMembers.value,
    );

    localDinnerGroups.value = result.dinnerGroups;
    warnings.value = result.warnings;
    isSaved.value = false;

    toast.add({
      severity: 'success',
      summary: 'Groups Created',
      detail: `Created ${result.dinnerGroups.length} dinner groups`,
      life: 3000,
    });

    emit('groups-created');
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to create groups';
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: message,
      life: 5000,
    });
  } finally {
    creating.value = false;
  }
}

async function handleSaveGroups() {
  saving.value = true;

  try {
    // Delete existing groups for this event
    await dinnerGroupStore.deleteByEventId(props.event.id);

    // Create new groups
    await dinnerGroupStore.createMultiple(localDinnerGroups.value);

    // Update event status
    await eventMetadataStore.update(props.event.id, {
      status: 'groups-created',
    });

    isSaved.value = true;

    toast.add({
      severity: 'success',
      summary: 'Groups Saved',
      detail: `Saved ${localDinnerGroups.value.length} dinner groups`,
      life: 3000,
    });

    emit('groups-saved');
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to save groups';
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: message,
      life: 5000,
    });
  } finally {
    saving.value = false;
  }
}

function handleReset() {
  confirm.require({
    message: 'Are you sure you want to reset all dinner groups?',
    header: 'Reset Groups',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: async () => {
      if (isSaved.value) {
        // Delete from store
        await dinnerGroupStore.deleteByEventId(props.event.id);
        await eventMetadataStore.update(props.event.id, { status: 'active' });
      }
      localDinnerGroups.value = [];
      warnings.value = [];
      isSaved.value = false;
      emit('refresh');
    },
  });
}

function setHost(groupNumber: number, personId: number) {
  const group = localDinnerGroups.value.find(
    (g) => g.groupNumber === groupNumber,
  );
  if (group) {
    group.hostPersonId = personId;
  }
}

function removeMember(groupNumber: number, personId: number) {
  const group = localDinnerGroups.value.find(
    (g) => g.groupNumber === groupNumber,
  );
  if (group) {
    group.memberPersonIds = group.memberPersonIds.filter(
      (id) => id !== personId,
    );
    if (group.hostPersonId === personId) {
      group.hostPersonId = group.memberPersonIds[0];
    }
  }
}

function deleteGroup(groupNumber: number) {
  confirm.require({
    message: `Are you sure you want to delete Group ${groupNumber}?`,
    header: 'Delete Group',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: () => {
      localDinnerGroups.value = localDinnerGroups.value.filter(
        (g) => g.groupNumber !== groupNumber,
      );
      // Renumber groups
      localDinnerGroups.value.forEach((g, idx) => {
        g.groupNumber = idx + 1;
      });
    },
  });
}

function showAddToGroupDialog(member: GroupMember) {
  selectedMember.value = member;
  selectedGroupNumber.value = null;
  showAddDialog.value = true;
}

function addMemberToGroup() {
  if (!selectedMember.value || !selectedGroupNumber.value) return;

  const group = localDinnerGroups.value.find(
    (g) => g.groupNumber === selectedGroupNumber.value,
  );
  if (group && !group.memberPersonIds.includes(selectedMember.value.personId)) {
    group.memberPersonIds.push(selectedMember.value.personId);
  }

  showAddDialog.value = false;
  selectedMember.value = null;
  selectedGroupNumber.value = null;
}
</script>
