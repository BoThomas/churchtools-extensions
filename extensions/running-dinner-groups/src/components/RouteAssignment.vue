<template>
  <div class="space-y-4">
    <!-- Overview Stats & Actions -->
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div class="flex flex-wrap gap-3">
        <div
          class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-100 dark:bg-surface-800"
        >
          <i class="pi pi-sitemap text-primary text-sm"></i>
          <span class="font-semibold">{{ dinnerGroups.length }}</span>
          <span class="text-sm text-surface-600 dark:text-surface-400"
            >Dinner Groups</span
          >
        </div>
        <div
          class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-100 dark:bg-surface-800"
        >
          <i class="pi pi-map text-green-500 text-sm"></i>
          <span class="font-semibold">{{ localRoutes.length }}</span>
          <span class="text-sm text-surface-600 dark:text-surface-400"
            >Routes</span
          >
        </div>
        <div
          v-if="localRoutes.length > 0"
          class="flex items-center gap-2 px-3 py-1.5 rounded-lg"
          :class="
            notificationsSent
              ? 'bg-green-100 dark:bg-green-900/30'
              : 'bg-surface-100 dark:bg-surface-800'
          "
        >
          <i
            class="text-sm"
            :class="
              notificationsSent
                ? 'pi pi-check-circle text-green-500'
                : 'pi pi-envelope text-surface-400'
            "
          ></i>
          <span
            class="text-sm"
            :class="
              notificationsSent
                ? 'text-green-700 dark:text-green-300'
                : 'text-surface-600 dark:text-surface-400'
            "
            >{{ notificationsSent ? 'Notifications Sent' : 'Pending' }}</span
          >
        </div>
      </div>

      <div class="flex gap-2 flex-wrap">
        <Button
          label="Assign Routes"
          icon="pi pi-map"
          size="small"
          @click="handleAssignRoutes"
          :loading="assigning"
          :disabled="
            assigning || localRoutes.length > 0 || dinnerGroups.length === 0
          "
        />
        <Button
          v-if="localRoutes.length > 0 && !isSaved"
          label="Save Routes"
          icon="pi pi-save"
          size="small"
          @click="handleSaveRoutes"
          :loading="saving"
          severity="success"
        />
        <Button
          v-if="localRoutes.length > 0 && isSaved && !notificationsSent"
          label="Send Notifications"
          icon="pi pi-send"
          size="small"
          @click="handleSendNotifications"
          :loading="sendingNotifications"
          severity="info"
        />
        <DangerButton
          v-if="localRoutes.length > 0"
          label="Reset"
          icon="pi pi-refresh"
          size="small"
          outlined
          @click="handleReset"
          :disabled="assigning || saving"
        />
      </div>
    </div>

    <!-- No groups warning -->
    <Message v-if="dinnerGroups.length === 0" severity="info" :closable="false">
      Create dinner groups first before assigning routes.
    </Message>

    <!-- Warnings -->
    <Message
      v-for="(warning, idx) in warnings"
      :key="idx"
      severity="warn"
      :closable="true"
    >
      {{ warning }}
    </Message>

    <!-- Network Graph Visualization -->
    <RouteNetworkGraph
      v-if="localRoutes.length > 0"
      :routes="localRoutes"
      :dinner-groups="dinnerGroups"
      :members="members"
    />

    <!-- Routes Display -->
    <div v-if="localRoutes.length > 0" class="space-y-4">
      <h3 class="text-lg font-semibold">Assigned Routes</h3>

      <div class="flex gap-4">
        <!-- Left Sidebar: Group Selector -->
        <div class="w-48 shrink-0">
          <div class="sticky top-4 space-y-1">
            <button
              v-for="route in sortedRoutes"
              :key="route.dinnerGroupId"
              :id="`sidebar-group-${route.dinnerGroupId}`"
              class="w-full text-left px-2 py-1 rounded-lg bg-surface-100 dark:bg-surface-800 hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors cursor-pointer"
              @click="scrollToRouteCard(route.dinnerGroupId)"
            >
              <div class="flex items-center gap-1.5">
                <span class="font-semibold text-xs"
                  >G{{ getGroupNumber(route) }}</span
                >
                <span class="text-xs">{{ getHostedMealEmoji(route) }}</span>
                <span class="text-xs text-surface-500 truncate">
                  {{
                    getGroupMembers(route)
                      .map((m) => formatMemberName(m))
                      .join(', ')
                  }}
                </span>
              </div>
            </button>
          </div>
        </div>

        <!-- Right: Route Cards -->
        <div class="flex-1 space-y-4">
          <RouteCard
            v-for="route in sortedRoutes"
            :key="route.dinnerGroupId"
            :route="route"
            :all-routes="localRoutes"
            :dinner-groups="dinnerGroups"
            :members="members"
            :event="event"
          />
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-else
      class="text-center py-12 bg-surface-50 dark:bg-surface-800 rounded-lg"
    >
      <i class="pi pi-map text-5xl text-surface-400 mb-4"></i>
      <p class="text-lg text-surface-600 dark:text-surface-400 mb-2">
        No routes assigned yet
      </p>
      <p class="text-sm text-surface-500">
        Click "Assign Routes" to automatically create dinner routes for all
        groups.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { CategoryValue } from '@churchtools-extensions/persistance';
import type {
  EventMetadata,
  DinnerGroup,
  Route,
  GroupMember,
} from '@/types/models';
import { getMealEmoji } from '@/types/models';
import { routingService } from '@/services/RoutingService';
import { emailService } from '@/services/EmailService';
import { useRouteStore } from '@/stores/route';
import { useEventMetadataStore } from '@/stores/eventMetadata';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import Button from '@churchtools-extensions/prime-volt/Button.vue';
import DangerButton from '@churchtools-extensions/prime-volt/DangerButton.vue';
import Message from '@churchtools-extensions/prime-volt/Message.vue';
import RouteCard from './RouteCard.vue';
import RouteNetworkGraph from './RouteNetworkGraph.vue';
const props = defineProps<{
  event: CategoryValue<EventMetadata>;
  eventName: string;
  members: GroupMember[];
  dinnerGroups: CategoryValue<DinnerGroup>[];
  routes: CategoryValue<Route>[];
  loading?: boolean;
}>();

const emit = defineEmits<{
  'routes-assigned': [];
  'routes-saved': [];
  'send-notifications': [];
  refresh: [];
}>();

const routeStore = useRouteStore();
const eventMetadataStore = useEventMetadataStore();
const confirm = useConfirm();
const toast = useToast();

const warnings = ref<string[]>([]);
const assigning = ref(false);
const saving = ref(false);
const sendingNotifications = ref(false);

// Local unsaved routes - only used when routes are newly assigned but not yet saved
const unsavedRoutes = ref<Omit<Route, 'id' | 'createdAt' | 'updatedAt'>[]>([]);

// Whether we have saved routes in the store
const isSaved = computed(() => props.routes.length > 0);

// The routes to display: either saved routes from props, or unsaved local routes
const localRoutes = computed(() => {
  if (isSaved.value) {
    // Use saved routes from props (reactive to store changes)
    return props.routes.map((r) => r.value);
  }
  // Use unsaved local routes
  return unsavedRoutes.value;
});

// Computed
const sortedRoutes = computed(() => {
  return [...localRoutes.value].sort((a, b) => {
    const groupA = props.dinnerGroups.find((g) => g.id === a.dinnerGroupId);
    const groupB = props.dinnerGroups.find((g) => g.id === b.dinnerGroupId);
    return (groupA?.value.groupNumber ?? 0) - (groupB?.value.groupNumber ?? 0);
  });
});

const notificationsSent = computed(
  () =>
    props.event.value.status === 'notifications-sent' ||
    props.event.value.status === 'completed',
);

// Sidebar helper functions
function getGroupNumber(
  route: Omit<Route, 'id' | 'createdAt' | 'updatedAt'>,
): number {
  const group = props.dinnerGroups.find((g) => g.id === route.dinnerGroupId);
  return group?.value.groupNumber ?? 0;
}

function getGroupMembers(
  route: Omit<Route, 'id' | 'createdAt' | 'updatedAt'>,
): GroupMember[] {
  const group = props.dinnerGroups.find((g) => g.id === route.dinnerGroupId);
  if (!group) return [];
  return props.members.filter((m) =>
    group.value.memberPersonIds.includes(m.personId),
  );
}

function formatMemberName(member: GroupMember): string {
  const firstName = member.person.firstName;
  const lastInitial = member.person.lastName?.charAt(0);
  return lastInitial ? `${firstName} ${lastInitial}.` : firstName;
}

function getHostedMealEmoji(
  route: Omit<Route, 'id' | 'createdAt' | 'updatedAt'>,
): string {
  const hostedStop = route.stops.find(
    (stop) => stop.hostDinnerGroupId === route.dinnerGroupId,
  );
  return hostedStop ? getMealEmoji(hostedStop.meal) : '';
}

function scrollToRouteCard(groupId: number) {
  const routeCard = document.getElementById(`route-group-${groupId}`);
  const sidebarItem = document.getElementById(`sidebar-group-${groupId}`);

  if (routeCard) {
    routeCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // Highlight route card
    routeCard.classList.add('!bg-blue-100', 'dark:!bg-blue-900/30');
    setTimeout(() => {
      routeCard.classList.remove('!bg-blue-100', 'dark:!bg-blue-900/30');
    }, 1500);
  }

  if (sidebarItem) {
    // Highlight sidebar item
    sidebarItem.classList.add('!bg-blue-100', 'dark:!bg-blue-900/30');
    setTimeout(() => {
      sidebarItem.classList.remove('!bg-blue-100', 'dark:!bg-blue-900/30');
    }, 1500);
  }
}

// Methods
async function handleAssignRoutes() {
  assigning.value = true;
  warnings.value = [];

  try {
    const result = routingService.assignRoutes(
      props.event.value,
      props.dinnerGroups,
      props.members,
    );

    unsavedRoutes.value = result.routes;
    warnings.value = result.warnings;

    toast.add({
      severity: 'success',
      summary: 'Routes Assigned',
      detail: `Assigned ${result.routes.length} routes`,
      life: 3000,
    });

    emit('routes-assigned');
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to assign routes';
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: message,
      life: 5000,
    });
  } finally {
    assigning.value = false;
  }
}

async function handleSaveRoutes() {
  saving.value = true;

  try {
    // Delete existing routes for this event (if any)
    await routeStore.deleteByEventId(props.event.id);

    // Create new routes from unsaved local state
    await routeStore.createMultiple(unsavedRoutes.value);

    // Clear unsaved routes - they're now persisted
    unsavedRoutes.value = [];

    // Update event status
    await eventMetadataStore.update(props.event.id, {
      status: 'routes-assigned',
    });

    toast.add({
      severity: 'success',
      summary: 'Routes Saved',
      detail: `Saved routes successfully`,
      life: 3000,
    });

    emit('routes-saved');
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to save routes';
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

async function handleSendNotifications() {
  confirm.require({
    message:
      'Send route notifications to all participants? This will email everyone their dinner route.',
    header: 'Send Notifications',
    icon: 'pi pi-envelope',
    accept: async () => {
      sendingNotifications.value = true;

      try {
        // Use routes from props (already the saved routes)
        const savedRoutes = props.routes;

        let totalSent = 0;
        let totalFailed = 0;
        let allSimulated = true;

        // Send emails for each route
        for (const route of savedRoutes) {
          const dinnerGroup = props.dinnerGroups.find(
            (g) => g.id === route.value.dinnerGroupId,
          );
          if (!dinnerGroup) continue;

          // TODO: add intro text input to UI and use here
          const email = emailService.generateRouteEmail(
            props.event.value,
            route,
            dinnerGroup,
            props.dinnerGroups,
            props.members,
            {
              allRoutes: savedRoutes,
              eventName: props.eventName,
            },
          );

          // Send email
          const result = await emailService.sendEmail(
            dinnerGroup.value.memberPersonIds,
            email.subject,
            email.htmlBody,
          );

          totalSent += result.sentCount;
          totalFailed += result.failedPersonIds.length;
          if (!result.wasSimulated) {
            allSimulated = false;
          }
        }

        // Update event status
        await eventMetadataStore.update(props.event.id, {
          status: 'notifications-sent',
        });

        const modeNote = allSimulated
          ? ' (development mode - check console)'
          : '';
        const failedNote = totalFailed > 0 ? `, ${totalFailed} failed` : '';

        toast.add({
          severity: 'success',
          summary: 'Notifications Sent',
          detail: `Sent ${savedRoutes.length} route notifications to ${totalSent} recipients${failedNote}${modeNote}`,
          life: 3000,
        });

        emit('send-notifications');
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : 'Failed to send notifications';
        toast.add({
          severity: 'error',
          summary: 'Error',
          detail: message,
          life: 5000,
        });
      } finally {
        sendingNotifications.value = false;
      }
    },
  });
}

function handleReset() {
  confirm.require({
    message: 'Are you sure you want to reset all routes?',
    header: 'Reset Routes',
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: async () => {
      if (isSaved.value) {
        // Delete from store and reset status
        await routeStore.deleteByEventId(props.event.id);
        await eventMetadataStore.update(props.event.id, {
          status: 'groups-created',
        });
      }
      // Clear unsaved local routes
      unsavedRoutes.value = [];
      warnings.value = [];
      emit('refresh');
    },
  });
}
</script>
