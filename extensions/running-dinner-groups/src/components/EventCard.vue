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

        <!-- Registration Progress Bar -->
        <div class="space-y-1.5">
          <div class="flex justify-between items-center text-sm">
            <div
              class="flex items-center gap-2 text-surface-600 dark:text-surface-400"
            >
              <i class="pi pi-users text-xs"></i>
              <span>Registrations</span>
            </div>
            <span class="font-medium text-surface-700 dark:text-surface-300">
              {{ registrationLabel }}
            </span>
          </div>
          <!-- Multi-segment progress bar -->
          <div
            class="h-2 rounded-full overflow-hidden bg-surface-200 dark:bg-surface-700 flex"
          >
            <!-- Active participants segment -->
            <div
              v-if="activePercent > 0"
              class="h-full bg-primary transition-all duration-300"
              :style="{ width: `${activePercent}%` }"
            ></div>
            <!-- Waitlist segment -->
            <div
              v-if="waitlistPercent > 0"
              class="h-full bg-orange-400 dark:bg-orange-500 transition-all duration-300"
              :style="{ width: `${waitlistPercent}%` }"
            ></div>
          </div>
          <!-- Legend for waitlist -->
          <div
            v-if="waitlistCount > 0"
            class="flex items-center gap-3 text-xs text-surface-500 dark:text-surface-400"
          >
            <span class="flex items-center gap-1">
              <span class="w-2 h-2 rounded-full bg-primary"></span>
              {{ memberCount }} confirmed
            </span>
            <span class="flex items-center gap-1">
              <span
                class="w-2 h-2 rounded-full bg-orange-400 dark:bg-orange-500"
              ></span>
              {{ waitlistCount }} waitlist
            </span>
          </div>
        </div>

        <!-- Registration Status -->
        <div class="flex items-center gap-2 text-sm">
          <i
            class="pi text-xs"
            :class="
              isRegistrationOpen
                ? 'pi-lock-open text-green-500'
                : 'pi-lock text-surface-500'
            "
          ></i>
          <span
            :class="
              isRegistrationOpen
                ? 'text-green-700 dark:text-green-300'
                : 'text-surface-600 dark:text-surface-400'
            "
          >
            Registration {{ isRegistrationOpen ? 'Open' : 'Closed' }}
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
      <div class="flex items-center justify-between gap-2 mt-2">
        <Button
          icon="pi pi-cog"
          label="Manage"
          size="small"
          :loading="isManageLoading"
          :disabled="isManageLoading"
          @click="$emit('view', event)"
        />

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
  actionLoading?: string | null;
}>();

const menuRef = ref();

function toggleMenu(event: Event) {
  menuRef.value?.toggle(event);
}

// Member counts from group statistics
const memberCount = computed(() => props.group?.memberStatistics?.active ?? 0);
const waitlistCount = computed(
  () => props.group?.memberStatistics?.waiting ?? 0,
);

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
  () => props.group?.information?.groupStatusId === 3,
);

// Registration is effectively closed if archived, regardless of isOpenForMembers setting
const isRegistrationOpen = computed(
  () => !isArchived.value && isOpenForMembers.value,
);

// Check if registration is scheduled to open in the future
const signUpOpeningDate = computed(() => {
  const dateStr = props.group?.settings?.signUpOpeningDate;
  if (!dateStr) return null;
  return new Date(dateStr);
});

const isRegistrationScheduledFuture = computed(() => {
  if (!signUpOpeningDate.value) return false;
  return signUpOpeningDate.value > new Date();
});

// Progress bar computations
const maxMembers = computed(() => props.group?.settings?.maxMembers ?? null);

const activePercent = computed(() => {
  const max = maxMembers.value;
  const active = memberCount.value;
  if (!max || max <= 0) {
    // No limit set - show some progress but cap at 100%
    return Math.min(active * 10, 100); // 10% per person, max 100%
  }
  return Math.min((active / max) * 100, 100);
});

const waitlistPercent = computed(() => {
  const max = maxMembers.value;
  const waitlist = waitlistCount.value;
  if (!max || max <= 0 || waitlist === 0) return 0;
  // Waitlist shows as additional percentage (can overflow past 100% visually capped)
  const remaining = Math.max(0, 100 - activePercent.value);
  return Math.min((waitlist / max) * 100, remaining + 20); // Allow slight overflow effect
});

const registrationLabel = computed(() => {
  const active = memberCount.value;
  const waitlist = waitlistCount.value;
  const max = maxMembers.value;

  if (max && max > 0) {
    if (waitlist > 0) {
      return `${active} / ${max} (+${waitlist})`;
    }
    return `${active} / ${max}`;
  }
  // No limit set
  if (waitlist > 0) {
    return `${active} (+${waitlist})`;
  }
  return `${active} participants`;
});

const formattedOpeningDate = computed(() => {
  if (!signUpOpeningDate.value) return '';
  return signUpOpeningDate.value.toLocaleDateString('de-DE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
});

const isRegistrationLoading = computed(
  () => props.actionLoading === `registration-${props.event.id}`,
);

const isManageLoading = computed(
  () => props.actionLoading === `manage-${props.event.id}`,
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
      if (isOpenForMembers.value) {
        return 'Waiting for registrations';
      }
      // Registration is closed - check if scheduled to open in the future
      if (isRegistrationScheduledFuture.value) {
        return `Registration opens ${formattedOpeningDate.value}`;
      }
      return 'Next: Create dinner groups';
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
      if (isOpenForMembers.value) {
        return {
          bgClass: 'bg-blue-50 dark:bg-blue-900/20',
          iconClass: 'pi-clock text-blue-500',
          textClass: 'text-blue-700 dark:text-blue-300',
        };
      }
      // Registration is closed - check if scheduled to open in the future
      if (isRegistrationScheduledFuture.value) {
        return {
          bgClass: 'bg-purple-50 dark:bg-purple-900/20',
          iconClass: 'pi-calendar-clock text-purple-500',
          textClass: 'text-purple-700 dark:text-purple-300',
        };
      }
      return {
        bgClass: 'bg-blue-50 dark:bg-blue-900/20',
        iconClass: 'pi-arrow-right text-blue-500',
        textClass: 'text-blue-700 dark:text-blue-300',
      };
    case 'groups-created':
    case 'routes-assigned':
      return {
        bgClass: 'bg-blue-50 dark:bg-blue-900/20',
        iconClass: 'pi-arrow-right text-blue-500',
        textClass: 'text-blue-700 dark:text-blue-300',
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
