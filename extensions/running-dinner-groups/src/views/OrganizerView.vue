<template>
  <div class="space-y-6">
    <!-- Organizer Group Setup Component -->
    <ParentGroupSetup
      ref="parentGroupSetupRef"
      @created="handleParentGroupCreated"
    />

    <!-- Main Content (only show if user has permission) -->
    <template v-if="parentGroupSetupRef?.hasPermission">
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

      <!-- Loading State -->
      <div v-if="eventMetadataStore.loading" class="flex justify-center py-12">
        <i class="pi pi-spin pi-spinner text-4xl text-primary"></i>
      </div>

      <!-- Events List -->
      <div v-else class="space-y-4">
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
      @toggle-registration="handleToggleRegistration(selectedEvent!)"
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

onMounted(async () => {
  await loadAllData();
});

async function loadAllData() {
  // First load event metadata to know which groups to fetch
  await eventMetadataStore.fetchAll();

  await Promise.all([
    loadEventGroups(),
    dinnerGroupStore.fetchAll(),
    routeStore.fetchAll(),
  ]);
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
    groupCache.value.clear();
    memberCache.value.clear();

    // Get all group IDs from event metadata
    const groupIds = eventMetadataStore.events.map((e) => e.value.groupId);

    // Load each group and its members
    for (const groupId of groupIds) {
      const group = await churchtoolsStore.getGroup(groupId);
      if (group) {
        groupCache.value.set(groupId, group);
        const members = await churchtoolsStore.getGroupMembers(groupId);
        memberCache.value.set(groupId, members);
      }
    }
  } catch (error) {
    console.error('Failed to load event groups:', error);
  }
}

function getGroup(groupId: number): Group | null {
  return groupCache.value.get(groupId) || null;
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

function handleViewEvent(event: CategoryValue<EventMetadata>) {
  selectedEvent.value = event;
  showDetailDialog.value = true;
}

async function handleArchiveEvent(event: CategoryValue<EventMetadata>) {
  confirm.require({
    message:
      'Archive this event? It will be set to read-only but can be restored later.',
    header: 'Archive Event',
    icon: 'pi pi-inbox',
    accept: async () => {
      try {
        // Update CT group status to archived (2)
        // groupStatusId is nested inside 'information' in the CT API
        await churchtoolsStore.updateGroup(event.value.groupId, {
          information: {
            groupStatusId: 2,
          },
        } as any);

        toast.add({
          severity: 'success',
          summary: 'Archived',
          detail: 'Event has been archived',
          life: 3000,
        });

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

  try {
    await churchtoolsStore.updateGroup(event.value.groupId, {
      settings: {
        ...group?.settings,
        isOpenForMembers: !isCurrentlyOpen,
      },
    } as any);

    toast.add({
      severity: 'success',
      summary: 'Updated',
      detail: `Registration ${!isCurrentlyOpen ? 'opened' : 'closed'}`,
      life: 3000,
    });

    await loadEventGroups();
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to update registration status',
      life: 5000,
    });
  }
}

async function handleStatusChanged() {
  await loadAllData();
}
</script>
