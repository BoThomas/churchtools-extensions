<template>
  <Card class="h-full flex flex-col">
    <template #title>
      <div class="flex items-start justify-between gap-2">
        <span class="truncate">{{ eventName }}</span>
        <div class="flex items-center gap-1 shrink-0">
          <!-- CT Group Status Badge -->
          <Badge
            :value="ctStatusLabel"
            :severity="ctStatusSeverity"
            size="small"
          />
          <!-- Extension Status Badge -->
          <Badge
            :value="workflowStatusLabel"
            :severity="workflowStatusSeverity"
            size="small"
          />
        </div>
      </div>
    </template>

    <template #content>
      <div class="space-y-3 flex-1">
        <!-- Event Date -->
        <div
          class="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-400"
        >
          <i class="pi pi-calendar text-xs"></i>
          <span>{{ formatEventDate }}</span>
        </div>

        <!-- Member Count -->
        <div
          class="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-400"
        >
          <i class="pi pi-users text-xs"></i>
          <span>{{ memberCount ?? 0 }} participants</span>
          <span v-if="(waitlistCount ?? 0) > 0" class="text-orange-500">
            ({{ waitlistCount }} on waitlist)
          </span>
        </div>

        <!-- Registration Status -->
        <div class="flex items-center gap-2 text-sm">
          <i
            class="pi text-xs"
            :class="
              isOpenForMembers
                ? 'pi-lock-open text-green-500'
                : 'pi-lock text-red-500'
            "
          ></i>
          <span :class="isOpenForMembers ? 'text-green-600' : 'text-red-600'">
            Registration {{ isOpenForMembers ? 'Open' : 'Closed' }}
          </span>
        </div>

        <!-- Group Size -->
        <div
          class="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-400"
        >
          <i class="pi pi-sitemap text-xs"></i>
          <span>Group size: {{ event.value.preferredGroupSize }}</span>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex items-center justify-between gap-2">
        <Button
          label="View Details"
          icon="pi pi-eye"
          size="small"
          @click="$emit('view', event)"
        />

        <!-- Actions Menu -->
        <Button
          icon="pi pi-ellipsis-v"
          size="small"
          text
          severity="secondary"
          @click="toggleMenu"
          aria-haspopup="true"
          aria-controls="event-actions-menu"
        />
        <Popover ref="menuRef">
          <div class="flex flex-col min-w-40">
            <button
              class="p-2 text-left hover:bg-surface-100 dark:hover:bg-surface-700 rounded text-sm flex items-center gap-2"
              @click="handleOpenInCT"
            >
              <i class="pi pi-external-link text-xs"></i>
              Open in ChurchTools
            </button>
            <button
              v-if="!isArchived"
              class="p-2 text-left hover:bg-surface-100 dark:hover:bg-surface-700 rounded text-sm flex items-center gap-2"
              @click="$emit('toggle-registration', event)"
            >
              <i
                class="pi text-xs"
                :class="isOpenForMembers ? 'pi-lock' : 'pi-lock-open'"
              ></i>
              {{ isOpenForMembers ? 'Close' : 'Open' }} Registration
            </button>
            <button
              v-if="!isArchived"
              class="p-2 text-left hover:bg-surface-100 dark:hover:bg-surface-700 rounded text-sm flex items-center gap-2 text-orange-600"
              @click="$emit('archive', event)"
            >
              <i class="pi pi-inbox text-xs"></i>
              Archive Event
            </button>
            <button
              class="p-2 text-left hover:bg-surface-100 dark:hover:bg-surface-700 rounded text-sm flex items-center gap-2 text-red-600"
              @click="$emit('delete', event)"
            >
              <i class="pi pi-trash text-xs"></i>
              Delete Event
            </button>
          </div>
        </Popover>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { CategoryValue } from '@churchtools-extensions/persistance';
import type { EventMetadata, Group } from '@/types/models';
import Card from '@churchtools-extensions/prime-volt/Card.vue';
import Badge from '@churchtools-extensions/prime-volt/Badge.vue';
import Button from '@churchtools-extensions/prime-volt/Button.vue';
import Popover from '@churchtools-extensions/prime-volt/Popover.vue';

const props = defineProps<{
  event: CategoryValue<EventMetadata>;
  group?: Group | null;
  memberCount?: number;
  waitlistCount?: number;
}>();

defineEmits<{
  view: [event: CategoryValue<EventMetadata>];
  archive: [event: CategoryValue<EventMetadata>];
  delete: [event: CategoryValue<EventMetadata>];
  'toggle-registration': [event: CategoryValue<EventMetadata>];
}>();

const menuRef = ref();

function toggleMenu(event: Event) {
  menuRef.value?.toggle(event);
}

// Computed properties
const eventName = computed(
  () => props.group?.name ?? `Event #${props.event.value.groupId}`,
);

const formatEventDate = computed(() => {
  try {
    const date = new Date(props.event.value.menu.starter.startTime);
    return date.toLocaleDateString('de-DE', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return 'Date not set';
  }
});

const isOpenForMembers = computed(
  () => props.group?.settings?.isOpenForMembers ?? false,
);

// CT Group Status (from information.groupStatusId)
const ctStatusLabel = computed(() => {
  const statusId = props.group?.information?.groupStatusId;
  switch (statusId) {
    case 1:
      return 'Active';
    case 2:
      return 'Archived';
    case 3:
      return 'Ended';
    default:
      return 'Unknown';
  }
});

const ctStatusSeverity = computed(
  (): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' => {
    const statusId = props.group?.information?.groupStatusId;
    switch (statusId) {
      case 1:
        return 'success'; // Active - green
      case 2:
        return 'secondary'; // Archived - gray
      case 3:
        return 'info'; // Ended - blue
      default:
        return 'secondary';
    }
  },
);

const isArchived = computed(
  () => props.group?.information?.groupStatusId === 2,
);

// Extension Workflow Status
const workflowStatusLabel = computed(() => {
  const statusMap: Record<string, string> = {
    active: 'Pending',
    'groups-created': 'Groups',
    'routes-assigned': 'Routes',
    'notifications-sent': 'Notified',
    completed: 'Done',
  };
  return statusMap[props.event.value.status] || props.event.value.status;
});

const workflowStatusSeverity = computed(
  (): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' => {
    const severityMap: Record<
      string,
      'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast'
    > = {
      active: 'info',
      'groups-created': 'warn',
      'routes-assigned': 'warn',
      'notifications-sent': 'success',
      completed: 'secondary',
    };
    return severityMap[props.event.value.status] || 'info';
  },
);

function handleOpenInCT() {
  const baseUrl = import.meta.env.DEV
    ? import.meta.env.VITE_EXTERNAL_API_URL?.replace(/\/$/, '')
    : window.location.origin;
  const url = `${baseUrl}/groups/${props.event.value.groupId}/dashboard`;
  window.open(url, '_blank');
  menuRef.value?.hide();
}
</script>
