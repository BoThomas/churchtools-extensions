<template>
  <div class="space-y-6">
    <!-- Organizer Group Setup Component -->
    <ParentGroupSetup
      ref="parentGroupSetupRef"
      :external-loading="initialLoading"
      @created="handleParentGroupCreated"
    />

    <!-- Main Content (only show if user has permission and data is loaded) -->
    <template v-if="parentGroupSetupRef?.hasPermission && !initialLoading">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-surface-900 dark:text-surface-50">
            Running Dinner Events
          </h1>
          <a
            v-if="parentGroupSetupRef?.parentGroupId"
            :href="getGroupUrl(parentGroupSetupRef.parentGroupId)"
            target="_blank"
            rel="noopener noreferrer"
            class="text-sm text-primary hover:underline inline-flex items-center gap-1 mt-1"
          >
            Open Organizer Group
            <i class="pi pi-external-link text-xs"></i>
          </a>
        </div>
        <Button
          label="Create New Event"
          icon="pi pi-plus"
          @click="showCreateDialog = true"
        />
      </div>

      <!-- Events List -->
      <div class="space-y-4">
        <div
          v-if="eventMetadataStore.events.length === 0"
          class="text-center py-12 bg-surface-50 dark:bg-surface-800 rounded-lg"
        >
          <i class="pi pi-calendar text-4xl text-surface-400 mb-4"></i>
          <p class="text-surface-600 dark:text-surface-400">
            No events yet. Create your first running dinner event!
          </p>
        </div>

        <div
          v-else
          class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          <EventCard
            v-for="event in eventMetadataStore.events"
            :key="event.id"
            :event="event"
            :group="getGroup(event.value.groupId)"
            :member-count="getMemberCount(event.value.groupId)"
            :waitlist-count="getWaitlistCount(event.value.groupId)"
            :action-loading="actionLoading"
            @view="handleViewEvent"
            @archive="handleArchiveEvent"
            @delete="handleDeleteEvent"
            @toggle-registration="handleToggleRegistration"
          />
        </div>
      </div>
    </template>

    <!-- Event Creator Dialog -->
    <EventCreator
      v-if="parentGroupSetupRef?.parentGroupId"
      v-model:visible="showCreateDialog"
      :parent-group-id="parentGroupSetupRef.parentGroupId"
      @created="handleEventCreated"
    />

    <!-- Event Detail Dialog -->
    <EventDetail
      v-if="selectedEvent"
      v-model:visible="showDetailDialog"
      :event="selectedEvent"
      :group="selectedEvent ? getGroup(selectedEvent.value.groupId) : null"
      :initial-members="
        selectedEvent ? getMembers(selectedEvent.value.groupId) : []
      "
      :action-loading="actionLoading"
      @toggle-registration="handleToggleRegistration(selectedEvent!)"
      @archive="handleArchiveEvent(selectedEvent!)"
      @delete="handleDeleteEvent(selectedEvent!)"
      @status-changed="handleStatusChanged"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { CategoryValue } from '@churchtools-extensions/persistance';
import type { EventMetadata, Group, GroupMember } from '@/types/models';
import { useEventMetadataStore } from '@/stores/eventMetadata';
import { useChurchtoolsStore } from '@/stores/churchtools';
import { useDinnerGroupStore } from '@/stores/dinnerGroup';
import { useRouteStore } from '@/stores/route';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import ParentGroupSetup from '@/components/ParentGroupSetup.vue';
import EventCreator from '@/components/EventCreator.vue';
import EventCard from '@/components/EventCard.vue';
import EventDetail from '@/components/EventDetail.vue';
import Button from '@churchtools-extensions/prime-volt/Button.vue';

const eventMetadataStore = useEventMetadataStore();
const churchtoolsStore = useChurchtoolsStore();
const dinnerGroupStore = useDinnerGroupStore();
const routeStore = useRouteStore();
const confirm = useConfirm();
const toast = useToast();

const parentGroupSetupRef = ref<InstanceType<typeof ParentGroupSetup>>();
const showCreateDialog = ref(false);
const showDetailDialog = ref(false);
const selectedEvent = ref<CategoryValue<EventMetadata> | null>(null);
const groupCache = ref<Map<number, Group>>(new Map());
const memberCache = ref<Map<number, GroupMember[]>>(new Map());
// Track loading state for actions: 'registration-{eventId}' | 'archive-{eventId}' | 'delete-{eventId}' | 'manage-{eventId}'
const actionLoading = ref<string | null>(null);
// Track initial data loading (covers all data, not just eventMetadataStore)
const initialLoading = ref(true);

onMounted(async () => {
  await loadAllData();
});

async function loadAllData() {
  initialLoading.value = true;
  try {
    // First load event metadata to know which groups to fetch
    await eventMetadataStore.fetchAll();

    await Promise.all([
      loadEventGroups(),
      dinnerGroupStore.fetchAll(),
      routeStore.fetchAll(),
    ]);
  } finally {
    initialLoading.value = false;
  }
}

async function handleParentGroupCreated() {
  await loadEventGroups();
}

async function handleEventCreated(_groupId: number) {
  await loadAllData();
}

/**
 * Load groups based on event metadata groupIds.
 * This is more reliable than relying on targetGroupId parent-child relationship.
 */
async function loadEventGroups() {
  try {
    // Get all group IDs from event metadata
    const groupIds = eventMetadataStore.events.map((e) => e.value.groupId);

    // Build new caches first, then swap them in to avoid flickering
    const newGroupCache = new Map<number, Group>();
    const newMemberCache = new Map<number, GroupMember[]>();

    // Load each group and its members
    for (const groupId of groupIds) {
      const group = await churchtoolsStore.getGroup(groupId);
      if (group) {
        newGroupCache.set(groupId, group);
        const members = await churchtoolsStore.getGroupMembers(groupId);
        newMemberCache.set(groupId, members);
      }
    }

    // Swap in the new caches atomically
    groupCache.value = newGroupCache;
    memberCache.value = newMemberCache;
  } catch (error) {
    console.error('Failed to load event groups:', error);
  }
}

function getGroup(groupId: number): Group | null {
  return groupCache.value.get(groupId) || null;
}

function getMembers(groupId: number): GroupMember[] {
  return memberCache.value.get(groupId) || [];
}

function getMemberCount(groupId: number): number {
  const members = memberCache.value.get(groupId) || [];
  return members.filter((m) => m.groupMemberStatus === 'active').length;
}

function getWaitlistCount(groupId: number): number {
  const members = memberCache.value.get(groupId) || [];
  return members.filter((m) => m.groupMemberStatus === 'waiting').length;
}

function getGroupUrl(groupId: number): string {
  const baseUrl = import.meta.env.DEV
    ? import.meta.env.VITE_EXTERNAL_API_URL?.replace(/\/$/, '')
    : window.location.origin;
  return `${baseUrl}/groups/${groupId}/dashboard`;
}

async function handleViewEvent(event: CategoryValue<EventMetadata>) {
  // Show loading state on the Manage button
  actionLoading.value = `manage-${event.id}`;

  try {
    // Pre-load event data before opening the dialog
    selectedEvent.value = event;

    // Ensure group and member data is fresh
    const groupId = event.value.groupId;
    const group = await churchtoolsStore.getGroup(groupId);
    if (group) {
      groupCache.value.set(groupId, group);
      const members = await churchtoolsStore.getGroupMembers(groupId);
      memberCache.value.set(groupId, members);
    }

    // Open the dialog after data is loaded
    showDetailDialog.value = true;
  } finally {
    actionLoading.value = null;
  }
}

async function handleArchiveEvent(event: CategoryValue<EventMetadata>) {
  confirm.require({
    message:
      'Archive this event? It will be set to read-only but can be restored later.',
    header: 'Archive Event',
    icon: 'pi pi-inbox',
    accept: async () => {
      try {
        // Update CT group status to archived (3)
        // CT Status IDs: 1 = active, 2 = draft/entwurf, 3 = archived
        await churchtoolsStore.updateGroup(event.value.groupId, {
          groupStatusId: 3,
        });

        toast.add({
          severity: 'success',
          summary: 'Archived',
          detail: 'Event has been archived',
          life: 3000,
        });

        // Close detail dialog and refresh data
        showDetailDialog.value = false;
        selectedEvent.value = null;
        await loadEventGroups();
      } catch (error) {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to archive event',
          life: 5000,
        });
      }
    },
  });
}

async function handleDeleteEvent(event: CategoryValue<EventMetadata>) {
  const group = getGroup(event.value.groupId);
  const eventName = group?.name || `Event #${event.value.groupId}`;

  confirm.require({
    message: `Permanently delete "${eventName}"? This will delete the ChurchTools group and all associated data. This cannot be undone.`,
    header: 'Delete Event',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        // Delete dinner groups and routes from KV store
        await dinnerGroupStore.deleteByEventId(event.id);
        await routeStore.deleteByEventId(event.id);
        routeStore.clearLocalRoutes(event.id);

        // Delete event metadata from KV store
        await eventMetadataStore.remove(event.id);

        // Delete CT group
        await churchtoolsStore.deleteGroup(event.value.groupId);

        toast.add({
          severity: 'success',
          summary: 'Deleted',
          detail: 'Event has been permanently deleted',
          life: 3000,
        });

        // Close detail dialog and refresh data
        showDetailDialog.value = false;
        selectedEvent.value = null;
        await loadAllData();
      } catch (error) {
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to delete event',
          life: 5000,
        });
      }
    },
  });
}

async function handleToggleRegistration(event: CategoryValue<EventMetadata>) {
  const group = getGroup(event.value.groupId);
  const isCurrentlyOpen = group?.settings?.isOpenForMembers ?? false;

  actionLoading.value = `registration-${event.id}`;
  try {
    // CT API controls registration via signUpOpeningDate/signUpClosingDate at root level
    // To close: set both to null
    // To open: set signUpOpeningDate to a past/current date, signUpClosingDate to null
    if (isCurrentlyOpen) {
      // Close registration
      await churchtoolsStore.updateGroup(event.value.groupId, {
        signUpOpeningDate: null,
        signUpClosingDate: null,
      });
    } else {
      // Open registration - set opening date to now
      await churchtoolsStore.updateGroup(event.value.groupId, {
        signUpOpeningDate: new Date().toISOString(),
        signUpClosingDate: null,
      });
    }

    toast.add({
      severity: 'success',
      summary: 'Updated',
      detail: `Registration ${!isCurrentlyOpen ? 'opened' : 'closed'}`,
      life: 3000,
    });

    await loadEventGroups();
  } catch (error) {
    console.error('Failed to toggle registration:', error);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to update registration status',
      life: 5000,
    });
  } finally {
    actionLoading.value = null;
  }
}

async function handleStatusChanged() {
  await loadAllData();
}
</script>
