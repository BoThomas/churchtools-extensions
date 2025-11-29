<template>
  <Card class="h-full flex flex-col">
    <template #title>
      <div class="flex items-start justify-between gap-2">
        <span class="truncate">{{ eventName }}</span>
        <!-- Only show badge for archived/ended events -->
        <Badge
          v-if="isArchived"
          value="Archived"
          severity="secondary"
          size="small"
        />
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

        <!-- Next Step / Progress Indicator -->
        <div
          class="flex items-center gap-2 text-sm rounded-md p-2 -mx-2"
          :class="nextStepStyle.bgClass"
        >
          <i class="pi text-xs" :class="nextStepStyle.iconClass"></i>
          <span :class="nextStepStyle.textClass">{{ nextStepText }}</span>
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

const isArchived = computed(
  () => props.group?.information?.groupStatusId === 2,
);

// Next step indicator - clear action-oriented messaging
const nextStepText = computed(() => {
  if (isArchived.value) {
    return 'Event archived';
  }

  const status = props.event.value.status;
  switch (status) {
    case 'active':
      return isOpenForMembers.value
        ? 'Waiting for registrations'
        : 'Next: Create dinner groups';
    case 'groups-created':
      return 'Next: Assign routes';
    case 'routes-assigned':
      return 'Next: Send notifications';
    case 'notifications-sent':
      return 'Participants notified ✓';
    case 'completed':
      return 'Event completed ✓';
    default:
      return 'Unknown status';
  }
});

const nextStepStyle = computed(() => {
  if (isArchived.value) {
    return {
      bgClass: 'bg-surface-100 dark:bg-surface-700',
      iconClass: 'pi-inbox text-surface-500',
      textClass: 'text-surface-500',
    };
  }

  const status = props.event.value.status;
  switch (status) {
    case 'active':
      return isOpenForMembers.value
        ? {
            bgClass: 'bg-blue-50 dark:bg-blue-900/20',
            iconClass: 'pi-clock text-blue-500',
            textClass: 'text-blue-700 dark:text-blue-300',
          }
        : {
            bgClass: 'bg-amber-50 dark:bg-amber-900/20',
            iconClass: 'pi-arrow-right text-amber-500',
            textClass: 'text-amber-700 dark:text-amber-300',
          };
    case 'groups-created':
    case 'routes-assigned':
      return {
        bgClass: 'bg-amber-50 dark:bg-amber-900/20',
        iconClass: 'pi-arrow-right text-amber-500',
        textClass: 'text-amber-700 dark:text-amber-300',
      };
    case 'notifications-sent':
    case 'completed':
      return {
        bgClass: 'bg-green-50 dark:bg-green-900/20',
        iconClass: 'pi-check-circle text-green-500',
        textClass: 'text-green-700 dark:text-green-300',
      };
    default:
      return {
        bgClass: 'bg-surface-100 dark:bg-surface-700',
        iconClass: 'pi-question-circle text-surface-500',
        textClass: 'text-surface-500',
      };
  }
});

function handleOpenInCT() {
  const baseUrl = import.meta.env.DEV
    ? import.meta.env.VITE_EXTERNAL_API_URL?.replace(/\/$/, '')
    : window.location.origin;
  const url = `${baseUrl}/groups/${props.event.value.groupId}/dashboard`;
  window.open(url, '_blank');
  menuRef.value?.hide();
}
</script>
