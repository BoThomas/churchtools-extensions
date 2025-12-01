<template>
  <div class="space-y-4">
    <!-- Overview Stats & Actions -->
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div class="flex flex-wrap gap-3">
        <div
          class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-100 dark:bg-surface-800"
        >
          <i class="pi pi-users text-primary text-sm"></i>
          <span class="font-semibold">{{ activeMembers.length }}</span>
          <span class="text-sm text-surface-600 dark:text-surface-400"
            >Members</span
          >
        </div>
        <div
          class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-100 dark:bg-surface-800"
        >
          <i class="pi pi-sitemap text-green-500 text-sm"></i>
          <span class="font-semibold">{{ localDinnerGroups.length }}</span>
          <span class="text-sm text-surface-600 dark:text-surface-400"
            >Groups</span
          >
        </div>
        <div
          v-if="unassignedMembers.length > 0"
          class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-100 dark:bg-orange-900/30"
        >
          <i class="pi pi-exclamation-circle text-orange-500 text-sm"></i>
          <span class="font-semibold text-orange-700 dark:text-orange-300">{{
            unassignedMembers.length
          }}</span>
          <span class="text-sm text-orange-700 dark:text-orange-300"
            >Unassigned</span
          >
        </div>
      </div>

      <div class="flex gap-2 flex-wrap">
        <Button
          label="Create Groups"
          icon="pi pi-users"
          size="small"
          @click="handleCreateGroups"
          :loading="creating"
          :disabled="
            creating ||
            localDinnerGroups.length > 0 ||
            activeMembers.length < minMembersNeeded
          "
        />
        <Button
          v-if="localDinnerGroups.length > 0 && hasUnsavedChanges"
          label="Save Changes"
          icon="pi pi-save"
          size="small"
          @click="handleSaveGroups"
          :loading="saving"
          severity="success"
        />
        <DangerButton
          v-if="localDinnerGroups.length > 0"
          label="Reset"
          icon="pi pi-refresh"
          size="small"
          outlined
          @click="handleReset"
          :disabled="creating || saving"
        />
      </div>
    </div>

    <!-- Warnings -->
    <Message
      v-if="activeMembers.length < minMembersNeeded"
      severity="warn"
      :closable="false"
    >
      Need at least {{ minMembersNeeded }} active members (3 meals ×
      {{ event.value.preferredGroupSize }} per group). Currently have
      {{ activeMembers.length }}.
    </Message>
    <Message
      v-for="(warning, idx) in warnings"
      :key="idx"
      severity="warn"
      :closable="false"
    >
      {{ warning }}
    </Message>

    <!-- Groups Table -->
    <DataTable
      v-if="localDinnerGroups.length > 0"
      :value="localDinnerGroups"
      v-model:expandedRows="expandedRows"
      dataKey="groupNumber"
      size="small"
      stripedRows
    >
      <Column expander style="width: 3rem" />
      <Column header="Group" style="width: 80px">
        <template #body="{ data }">
          <span class="font-semibold">#{{ data.groupNumber }}</span>
        </template>
      </Column>
      <Column header="Meal">
        <template #body="{ data }">
          <Badge
            :value="getMealLabel(data.assignedMeal)"
            :severity="getMealSeverity(data.assignedMeal)"
          />
        </template>
      </Column>
      <Column header="Host">
        <template #body="{ data }">
          <span class="text-sm">{{ getHostName(data) || 'Not set' }}</span>
        </template>
      </Column>
      <Column header="Others">
        <template #body="{ data }">
          <span class="text-sm">{{ getMemberNames(data) }}</span>
        </template>
      </Column>
      <Column header="Location" class="hidden md:table-cell">
        <template #body="{ data }">
          <span class="text-sm text-surface-600 dark:text-surface-400">
            {{ getHostAddress(data) || '-' }}
          </span>
        </template>
      </Column>
      <Column v-if="!isLocked" style="width: 50px">
        <template #body="{ data }">
          <Button
            icon="pi pi-trash"
            size="small"
            text
            severity="danger"
            @click="deleteGroup(data.groupNumber)"
            v-tooltip="'Delete group'"
          />
        </template>
      </Column>

      <!-- Expanded Row Content -->
      <template #expansion="{ data }">
        <div class="p-3">
          <div class="font-medium text-sm mb-2">Group Members</div>
          <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <div
              v-for="member in getGroupMembers(data)"
              :key="member.personId"
              class="flex items-center justify-between gap-2 p-2 rounded-lg border border-surface-200 dark:border-surface-700"
              :class="
                member.personId === data.hostPersonId
                  ? 'bg-primary/10 border-primary/30'
                  : 'bg-surface-0 dark:bg-surface-900'
              "
            >
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-1.5">
                  <i
                    v-if="member.personId === data.hostPersonId"
                    class="pi pi-home text-primary text-sm"
                  ></i>
                  <span class="font-medium text-sm truncate">
                    {{ member.person.firstName }} {{ member.person.lastName }}
                  </span>
                </div>
                <div
                  v-if="
                    member.fields?.dietaryRestrictions ||
                    member.fields?.allergyInfo
                  "
                  class="flex flex-wrap gap-1 mt-1"
                >
                  <span
                    v-if="member.fields?.dietaryRestrictions"
                    class="text-xs px-1.5 py-0.5 rounded bg-surface-200 dark:bg-surface-700"
                  >
                    {{ member.fields.dietaryRestrictions }}
                  </span>
                  <span
                    v-if="member.fields?.allergyInfo"
                    class="text-xs px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300"
                  >
                    ⚠️ {{ member.fields.allergyInfo }}
                  </span>
                </div>
              </div>
              <div v-if="!isLocked" class="flex gap-1">
                <Button
                  v-if="member.personId !== data.hostPersonId"
                  label="Make Host"
                  size="small"
                  text
                  @click="setHost(data.groupNumber, member.personId)"
                />
                <Button
                  icon="pi pi-times"
                  size="small"
                  text
                  severity="danger"
                  @click="removeMember(data.groupNumber, member.personId)"
                  v-tooltip="'Remove from group'"
                />
              </div>
            </div>
          </div>
        </div>
      </template>
    </DataTable>

    <!-- Empty State -->
    <div
      v-if="localDinnerGroups.length === 0"
      class="text-center py-12 bg-surface-50 dark:bg-surface-800 rounded-lg"
    >
      <i class="pi pi-sitemap text-5xl text-surface-400 mb-4"></i>
      <p class="text-lg text-surface-600 dark:text-surface-400 mb-2">
        No dinner groups created yet
      </p>
      <p class="text-sm text-surface-500">
        Click "Create Groups" to automatically generate groups based on member
        preferences.
      </p>
    </div>

    <!-- Unassigned Members -->
    <div
      v-if="unassignedMembers.length > 0"
      class="border border-orange-200 dark:border-orange-800 rounded-lg overflow-hidden"
    >
      <div
        class="flex items-center gap-2 px-4 py-2 bg-orange-50 dark:bg-orange-900/20 border-b border-orange-200 dark:border-orange-800"
      >
        <i class="pi pi-user-minus text-orange-500"></i>
        <span class="font-semibold text-orange-700 dark:text-orange-300"
          >Unassigned Members</span
        >
        <Badge :value="unassignedMembers.length" severity="warn" />
      </div>
      <DataTable :value="unassignedMembers" size="small">
        <Column header="Name">
          <template #body="{ data }">
            <span class="text-sm"
              >{{ data.person.firstName }} {{ data.person.lastName }}</span
            >
          </template>
        </Column>
        <Column header="Preferences" class="hidden sm:table-cell">
          <template #body="{ data }">
            <div class="flex flex-wrap gap-1">
              <Badge
                v-if="data.fields?.mealPreference"
                :value="getMealLabel(data.fields.mealPreference)"
                :severity="getMealSeverity(data.fields.mealPreference)"
                class="text-xs"
              />
              <span
                v-if="data.fields?.partnerPreference"
                class="text-xs px-1.5 py-0.5 rounded bg-surface-200 dark:bg-surface-700"
              >
                👥 {{ data.fields.partnerPreference }}
              </span>
            </div>
          </template>
        </Column>
        <Column header="" style="width: 100px">
          <template #body="{ data }">
            <Button
              label="Add"
              icon="pi pi-plus"
              size="small"
              @click="showAddToGroupDialog(data)"
              :disabled="isLocked"
            />
          </template>
        </Column>
      </DataTable>
    </div>

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

        <!-- Meal selection for new group -->
        <div v-if="selectedGroupNumber === -1" class="flex flex-col gap-2">
          <label class="font-medium text-sm">Assign Meal:</label>
          <Select
            v-model="selectedNewGroupMeal"
            :options="MEAL_OPTIONS"
            optionLabel="label"
            optionValue="value"
            placeholder="Choose a meal"
          />
        </div>

        <div class="flex justify-end gap-2">
          <SecondaryButton label="Cancel" @click="showAddDialog = false" />
          <Button
            label="Add"
            @click="addMemberToGroup"
            :disabled="
              !selectedGroupNumber ||
              (selectedGroupNumber === -1 && !selectedNewGroupMeal)
            "
          />
        </div>
      </div>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { CategoryValue } from '@churchtools-extensions/persistance';
import type {
  EventMetadata,
  DinnerGroup,
  GroupMember,
  Route,
} from '@/types/models';
import { MEAL_OPTIONS, getMealLabel, getMealSeverity } from '@/types/models';
import { groupingService } from '@/services/GroupingService';
import { useDinnerGroupStore } from '@/stores/dinnerGroup';
import { useRouteStore } from '@/stores/route';
import { useEventMetadataStore } from '@/stores/eventMetadata';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import Button from '@churchtools-extensions/prime-volt/Button.vue';
import SecondaryButton from '@churchtools-extensions/prime-volt/SecondaryButton.vue';
import DangerButton from '@churchtools-extensions/prime-volt/DangerButton.vue';
import Message from '@churchtools-extensions/prime-volt/Message.vue';
import Dialog from '@churchtools-extensions/prime-volt/Dialog.vue';
import Select from '@churchtools-extensions/prime-volt/Select.vue';
import DataTable from '@churchtools-extensions/prime-volt/DataTable.vue';
import Badge from '@churchtools-extensions/prime-volt/Badge.vue';
import Column from 'primevue/column';

const props = defineProps<{
  event: CategoryValue<EventMetadata>;
  members: GroupMember[];
  dinnerGroups: CategoryValue<DinnerGroup>[];
  routes: CategoryValue<Route>[];
  loading?: boolean;
}>();

const emit = defineEmits<{
  'groups-created': [];
  'groups-saved': [];
  refresh: [];
}>();

const dinnerGroupStore = useDinnerGroupStore();
const routeStore = useRouteStore();
const eventMetadataStore = useEventMetadataStore();
const confirm = useConfirm();
const toast = useToast();

const localDinnerGroups = ref<
  Omit<DinnerGroup, 'id' | 'createdAt' | 'updatedAt'>[]
>([]);
const warnings = ref<string[]>([]);
const creating = ref(false);
const saving = ref(false);
const hasUnsavedChanges = ref(false);
const showAddDialog = ref(false);
const selectedMember = ref<GroupMember | null>(null);
const selectedGroupNumber = ref<number | null>(null);
const expandedRows = ref<Record<number, boolean>>({});

// Computed
const activeMembers = computed(() =>
  props.members.filter((m) => m.groupMemberStatus === 'active'),
);

// Editing is locked only after notifications have been sent
const isLocked = computed(() => {
  const lockedStatuses = ['notifications-sent', 'completed'];
  return lockedStatuses.includes(props.event.value.status);
});

// Routes exist for this event
const hasRoutes = computed(() => props.routes.length > 0);

// Post-notification status - changes require extra confirmation
const isPostNotification = computed(() => {
  const postNotificationStatuses = ['notifications-sent', 'completed'];
  return postNotificationStatuses.includes(props.event.value.status);
});

// Groups exist in the store (not just locally created)
const hasSavedGroups = computed(() => props.dinnerGroups.length > 0);

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

const groupOptions = computed(() => [
  { label: '+ Create New Group', value: -1 },
  ...localDinnerGroups.value.map((g) => ({
    label: `Group ${g.groupNumber} (${g.memberPersonIds.length} members) - ${getMealLabel(g.assignedMeal)}`,
    value: g.groupNumber,
  })),
]);

const selectedNewGroupMeal = ref<'starter' | 'mainCourse' | 'dessert' | null>(
  null,
);

// Helper functions for template
function getGroupMembers(
  group: Omit<DinnerGroup, 'id' | 'createdAt' | 'updatedAt'>,
) {
  return props.members.filter((m) =>
    group.memberPersonIds.includes(m.personId),
  );
}

function getMemberNames(
  group: Omit<DinnerGroup, 'id' | 'createdAt' | 'updatedAt'>,
): string {
  const members = getGroupMembers(group).filter(
    (m) => m.personId !== group.hostPersonId,
  );
  if (members.length === 0) return '-';
  return members
    .map((m) => `${m.person.firstName} ${m.person.lastName}`)
    .join(', ');
}

function getHostName(
  group: Omit<DinnerGroup, 'id' | 'createdAt' | 'updatedAt'>,
): string | null {
  if (!group.hostPersonId) return null;
  const host = props.members.find((m) => m.personId === group.hostPersonId);
  return host ? `${host.person.firstName} ${host.person.lastName}` : null;
}

function getHostAddress(
  group: Omit<DinnerGroup, 'id' | 'createdAt' | 'updatedAt'>,
): string | null {
  if (!group.hostPersonId) return null;
  const host = props.members.find((m) => m.personId === group.hostPersonId);
  if (!host?.person.addresses?.[0]) return null;
  const addr = host.person.addresses[0];
  return [addr.street, addr.zip, addr.city].filter(Boolean).join(', ');
}

/**
 * Get information about participants affected by a change to a specific group.
 * Returns the group members and the hosts of groups this group visits.
 */
interface AffectedParticipantsInfo {
  groupMembers: { name: string; email?: string }[];
  visitedHosts: { name: string; email?: string; meal: string }[];
}

function getAffectedParticipantsInfo(
  groupNumber: number,
): AffectedParticipantsInfo | null {
  // Find the saved dinner group (we need its ID to look up routes)
  const savedGroup = props.dinnerGroups.find(
    (g) => g.value.groupNumber === groupNumber,
  );
  if (!savedGroup) return null;

  // Get members of this group
  const localGroup = localDinnerGroups.value.find(
    (g) => g.groupNumber === groupNumber,
  );
  const groupMembers = localGroup
    ? props.members
        .filter((m) => localGroup.memberPersonIds.includes(m.personId))
        .map((m) => ({
          name: `${m.person.firstName} ${m.person.lastName}`,
          email: m.person.email,
        }))
    : [];

  // Find the route for this group
  const route = props.routes.find(
    (r) => r.value.dinnerGroupId === savedGroup.id,
  );
  if (!route) {
    return { groupMembers, visitedHosts: [] };
  }

  // Get the hosts of groups this group visits (excluding their own hosting)
  const visitedHosts: { name: string; email?: string; meal: string }[] = [];
  const mealLabels = {
    starter: 'Starter',
    mainCourse: 'Main Course',
    dessert: 'Dessert',
  };

  for (const stop of route.value.stops) {
    // Skip if this group is hosting this meal
    if (stop.hostDinnerGroupId === savedGroup.id) continue;

    // Find the host dinner group
    const hostDinnerGroup = props.dinnerGroups.find(
      (g) => g.id === stop.hostDinnerGroupId,
    );
    if (!hostDinnerGroup?.value.hostPersonId) continue;

    // Find the host person
    const hostPerson = props.members.find(
      (m) => m.personId === hostDinnerGroup.value.hostPersonId,
    );
    if (hostPerson) {
      visitedHosts.push({
        name: `${hostPerson.person.firstName} ${hostPerson.person.lastName}`,
        email: hostPerson.person.email,
        meal: mealLabels[stop.meal],
      });
    }
  }

  return { groupMembers, visitedHosts };
}

/**
 * Build a user-friendly message for the confirmation dialog showing affected participants.
 */
function buildAffectedParticipantsMessage(
  action: string,
  affectedInfo: AffectedParticipantsInfo | null,
): string {
  let message = `You are ${action} after notifications have already been sent.\n\n`;
  message +=
    'You will need to manually inform the affected participants about this change.\n\n';

  if (!affectedInfo) {
    message += 'Unable to determine affected participants.';
    return message;
  }

  if (affectedInfo.groupMembers.length > 0) {
    message += '📋 DIRECTLY AFFECTED (Group Members):\n';
    message += affectedInfo.groupMembers
      .map((m) => `  • ${m.name}${m.email ? ` (${m.email})` : ''}`)
      .join('\n');
    message += '\n\n';
  }

  if (affectedInfo.visitedHosts.length > 0) {
    message += '🏠 INDIRECTLY AFFECTED (Hosts this group visits):\n';
    message += affectedInfo.visitedHosts
      .map((h) => `  • ${h.name} - ${h.meal}${h.email ? ` (${h.email})` : ''}`)
      .join('\n');
  }

  return message;
}

// Watch for existing dinner groups
watch(
  () => props.dinnerGroups,
  (newGroups) => {
    if (newGroups.length > 0 && localDinnerGroups.value.length === 0) {
      localDinnerGroups.value = newGroups.map((g) => ({ ...g.value }));
      hasUnsavedChanges.value = false;
    }
  },
  { immediate: true },
);

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
    hasUnsavedChanges.value = true;

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
    if (hasSavedGroups.value) {
      // Groups already exist - UPDATE them to preserve database IDs
      // (this is important because routes reference groups by their DB ID)
      for (const localGroup of localDinnerGroups.value) {
        const savedGroup = props.dinnerGroups.find(
          (g) => g.value.groupNumber === localGroup.groupNumber,
        );
        if (savedGroup) {
          await dinnerGroupStore.update(savedGroup.id, {
            ...localGroup,
            id: savedGroup.id, // Preserve the database ID in the value
          });
        }
      }
    } else {
      // First save - create new groups
      await dinnerGroupStore.createMultiple(localDinnerGroups.value);
    }

    // Update event status
    await eventMetadataStore.update(props.event.id, {
      status: 'groups-created',
    });

    hasUnsavedChanges.value = false;

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
  // Build a more detailed message if routes exist
  let message = 'Are you sure you want to reset all dinner groups?';
  if (hasRoutes.value) {
    message +=
      ' This will also delete all assigned routes and reset the workflow status.';
  }

  confirm.require({
    message,
    header: 'Reset Groups',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: async () => {
      if (hasSavedGroups.value) {
        // Delete routes first if they exist
        if (hasRoutes.value) {
          await routeStore.deleteByEventId(props.event.id);
        }
        // Delete groups from store
        await dinnerGroupStore.deleteByEventId(props.event.id);
        await eventMetadataStore.update(props.event.id, { status: 'active' });
      }
      localDinnerGroups.value = [];
      warnings.value = [];
      hasUnsavedChanges.value = false;
      emit('refresh');
    },
  });
}

function setHost(groupNumber: number, personId: number) {
  const group = localDinnerGroups.value.find(
    (g) => g.groupNumber === groupNumber,
  );
  if (!group) return;

  const performSetHost = () => {
    group.hostPersonId = personId;
    hasUnsavedChanges.value = true;
  };

  // Post-notification: require confirmation with affected participants
  if (isPostNotification.value) {
    const newHost = props.members.find((m) => m.personId === personId);
    const affectedInfo = getAffectedParticipantsInfo(groupNumber);

    confirm.require({
      message: buildAffectedParticipantsMessage(
        `changing the host of Group ${groupNumber} to ${newHost?.person.firstName} ${newHost?.person.lastName}`,
        affectedInfo,
      ),
      header: 'Confirm Change After Notifications',
      icon: 'pi pi-exclamation-triangle',
      acceptClass: 'p-button-warning',
      acceptLabel: 'Confirm Change',
      accept: performSetHost,
    });
    return;
  }

  performSetHost();
}

function removeMember(groupNumber: number, personId: number) {
  const group = localDinnerGroups.value.find(
    (g) => g.groupNumber === groupNumber,
  );
  if (!group) return;

  const performRemove = () => {
    group.memberPersonIds = group.memberPersonIds.filter(
      (id) => id !== personId,
    );
    if (group.hostPersonId === personId) {
      group.hostPersonId = group.memberPersonIds[0];
    }
    hasUnsavedChanges.value = true;
  };

  // Post-notification: require confirmation with affected participants
  if (isPostNotification.value) {
    const removedMember = props.members.find((m) => m.personId === personId);
    const affectedInfo = getAffectedParticipantsInfo(groupNumber);

    confirm.require({
      message: buildAffectedParticipantsMessage(
        `removing ${removedMember?.person.firstName} ${removedMember?.person.lastName} from Group ${groupNumber}`,
        affectedInfo,
      ),
      header: 'Confirm Change After Notifications',
      icon: 'pi pi-exclamation-triangle',
      acceptClass: 'p-button-warning',
      acceptLabel: 'Confirm Change',
      accept: performRemove,
    });
    return;
  }

  performRemove();
}

function deleteGroup(groupNumber: number) {
  // If routes exist, offer to reset routes and delete the group in one action
  if (hasRoutes.value) {
    confirm.require({
      message: `Routes have already been assigned. To delete Group ${groupNumber}, the routes must be reset first. Do you want to reset all routes and delete this group?`,
      header: 'Reset Routes & Delete Group',
      icon: 'pi pi-exclamation-triangle',
      acceptClass: 'p-button-danger',
      acceptLabel: 'Reset Routes & Delete',
      rejectLabel: 'Cancel',
      accept: async () => {
        // Reset routes first
        await routeStore.deleteByEventId(props.event.id);
        await eventMetadataStore.update(props.event.id, {
          status: 'groups-created',
        });

        // Then delete the group
        localDinnerGroups.value = localDinnerGroups.value.filter(
          (g) => g.groupNumber !== groupNumber,
        );
        // Renumber groups
        localDinnerGroups.value.forEach((g, idx) => {
          g.groupNumber = idx + 1;
        });
        hasUnsavedChanges.value = true;
        emit('refresh');
      },
    });
    return;
  }

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
      hasUnsavedChanges.value = true;
    },
  });
}

function showAddToGroupDialog(member: GroupMember) {
  selectedMember.value = member;
  selectedGroupNumber.value = null;
  selectedNewGroupMeal.value = null;
  showAddDialog.value = true;
}

function addMemberToGroup() {
  if (!selectedMember.value || selectedGroupNumber.value === null) return;

  // If creating new group and routes exist, offer to reset routes and create in one action
  if (selectedGroupNumber.value === -1 && hasRoutes.value) {
    if (!selectedNewGroupMeal.value) return;

    confirm.require({
      message:
        'Routes have already been assigned. To create a new group, the routes must be reset first. Do you want to reset all routes and create this new group?',
      header: 'Reset Routes & Create Group',
      icon: 'pi pi-exclamation-triangle',
      acceptClass: 'p-button-danger',
      acceptLabel: 'Reset Routes & Create',
      rejectLabel: 'Cancel',
      accept: async () => {
        // Reset routes first
        await routeStore.deleteByEventId(props.event.id);
        await eventMetadataStore.update(props.event.id, {
          status: 'groups-created',
        });

        // Then create the new group
        const newGroupNumber = localDinnerGroups.value.length + 1;
        localDinnerGroups.value.push({
          eventMetadataId: props.event.id,
          ctGroupId: props.event.value.groupId,
          groupNumber: newGroupNumber,
          assignedMeal: selectedNewGroupMeal.value!,
          memberPersonIds: [selectedMember.value!.personId],
          hostPersonId: selectedMember.value!.personId,
        });

        showAddDialog.value = false;
        selectedMember.value = null;
        selectedGroupNumber.value = null;
        selectedNewGroupMeal.value = null;
        hasUnsavedChanges.value = true;
        emit('refresh');
      },
    });
    return;
  }

  const performAdd = () => {
    if (selectedGroupNumber.value === -1) {
      // Create new group
      if (!selectedNewGroupMeal.value) return;

      const newGroupNumber = localDinnerGroups.value.length + 1;
      localDinnerGroups.value.push({
        eventMetadataId: props.event.id,
        ctGroupId: props.event.value.groupId,
        groupNumber: newGroupNumber,
        assignedMeal: selectedNewGroupMeal.value,
        memberPersonIds: [selectedMember.value!.personId],
        hostPersonId: selectedMember.value!.personId,
      });
    } else {
      // Add to existing group
      const group = localDinnerGroups.value.find(
        (g) => g.groupNumber === selectedGroupNumber.value,
      );
      if (
        group &&
        !group.memberPersonIds.includes(selectedMember.value!.personId)
      ) {
        group.memberPersonIds.push(selectedMember.value!.personId);
      }
    }

    showAddDialog.value = false;
    selectedMember.value = null;
    selectedGroupNumber.value = null;
    selectedNewGroupMeal.value = null;
    hasUnsavedChanges.value = true;
  };

  // Post-notification: require confirmation with affected participants
  if (isPostNotification.value && selectedGroupNumber.value !== -1) {
    const group = localDinnerGroups.value.find(
      (g) => g.groupNumber === selectedGroupNumber.value,
    );
    const affectedInfo = group
      ? getAffectedParticipantsInfo(group.groupNumber)
      : null;

    confirm.require({
      message: buildAffectedParticipantsMessage(
        `adding ${selectedMember.value.person.firstName} ${selectedMember.value.person.lastName} to Group ${selectedGroupNumber.value}`,
        affectedInfo,
      ),
      header: 'Confirm Change After Notifications',
      icon: 'pi pi-exclamation-triangle',
      acceptClass: 'p-button-warning',
      acceptLabel: 'Confirm Change',
      accept: performAdd,
    });
    return;
  }

  performAdd();
}
</script>
