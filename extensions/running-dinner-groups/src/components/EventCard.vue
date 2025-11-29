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
        <div class="flex items-center gap-2 text-sm">
          <i class="pi text-xs" :class="nextStepStyle.iconClass"></i>
          <span :class="nextStepStyle.textClass">{{ nextStepText }}</span>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex items-center justify-between gap-2">
        <Button label="Manage" size="small" @click="$emit('view', event)" />

        <!-- Actions Menu -->
        <Button
          :icon="
            isRegistrationLoading ? 'pi pi-spin pi-spinner' : 'pi pi-ellipsis-v'
          "
          size="small"
          text
          severity="secondary"
          :disabled="isRegistrationLoading"
          @click="toggleMenu"
          aria-haspopup="true"
          aria-controls="event-actions-menu"
        />
        <Menu ref="menuRef" :model="menuItems" popup />
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { CategoryValue } from '@churchtools-extensions/persistance';
import type { EventMetadata, Group } from '@/types/models';
import type { MenuItem } from 'primevue/menuitem';
import Card from '@churchtools-extensions/prime-volt/Card.vue';
import Badge from '@churchtools-extensions/prime-volt/Badge.vue';
import Button from '@churchtools-extensions/prime-volt/Button.vue';
import Menu from '@churchtools-extensions/prime-volt/Menu.vue';

const props = defineProps<{
  event: CategoryValue<EventMetadata>;
  group?: Group | null;
  memberCount?: number;
  waitlistCount?: number;
  actionLoading?: string | null;
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

const isRegistrationLoading = computed(
  () => props.actionLoading === `registration-${props.event.id}`,
);

const emit = defineEmits<{
  view: [event: CategoryValue<EventMetadata>];
  archive: [event: CategoryValue<EventMetadata>];
  delete: [event: CategoryValue<EventMetadata>];
  'toggle-registration': [event: CategoryValue<EventMetadata>];
}>();

function openInCT() {
  const baseUrl = import.meta.env.DEV
    ? import.meta.env.VITE_EXTERNAL_API_URL?.replace(/\/$/, '')
    : window.location.origin;
  const url = `${baseUrl}/groups/${props.event.value.groupId}/dashboard`;
  window.open(url, '_blank');
}

const menuItems = computed<MenuItem[]>(() => {
  const items: MenuItem[] = [
    {
      label: 'Open in ChurchTools',
      icon: 'pi pi-external-link',
      command: openInCT,
    },
  ];

  if (!isArchived.value) {
    items.push({
      label: isOpenForMembers.value
        ? 'Close Registration'
        : 'Open Registration',
      icon: isOpenForMembers.value ? 'pi pi-lock' : 'pi pi-lock-open',
      disabled: isRegistrationLoading.value,
      command: () => emit('toggle-registration', props.event),
    });
    items.push({
      label: 'Archive Event',
      icon: 'pi pi-inbox',
      command: () => emit('archive', props.event),
    });
  }

  items.push({
    label: 'Delete Event',
    icon: 'pi pi-trash',
    command: () => emit('delete', props.event),
  });

  return items;
});

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
</script>
