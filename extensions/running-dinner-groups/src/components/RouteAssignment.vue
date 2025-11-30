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
                {{ dinnerGroups.length }}
              </div>
              <div class="text-sm text-surface-600 dark:text-surface-400">
                Dinner Groups
              </div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-success">
                {{ localRoutes.length }}
              </div>
              <div class="text-sm text-surface-600 dark:text-surface-400">
                Routes Assigned
              </div>
            </div>
            <div class="text-center">
              <div
                class="text-2xl font-bold"
                :class="
                  notificationsSent ? 'text-green-500' : 'text-surface-400'
                "
              >
                <i
                  :class="notificationsSent ? 'pi pi-check' : 'pi pi-envelope'"
                ></i>
              </div>
              <div class="text-sm text-surface-600 dark:text-surface-400">
                {{ notificationsSent ? 'Sent' : 'Pending' }}
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex gap-2 flex-wrap">
            <Button
              label="Assign Routes"
              icon="pi pi-map"
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
              @click="handleSaveRoutes"
              :loading="saving"
              severity="success"
            />
            <Button
              v-if="localRoutes.length > 0 && isSaved && !notificationsSent"
              label="Send Notifications"
              icon="pi pi-send"
              @click="handleSendNotifications"
              :loading="sendingNotifications"
              severity="info"
            />
            <DangerButton
              v-if="localRoutes.length > 0"
              label="Reset"
              icon="pi pi-refresh"
              outlined
              @click="handleReset"
              :disabled="assigning || saving"
            />
          </div>

          <!-- No groups warning -->
          <Message
            v-if="dinnerGroups.length === 0"
            severity="info"
            :closable="false"
          >
            Create dinner groups first before assigning routes.
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

          <!-- Success Message -->
          <Message
            v-if="localRoutes.length > 0 && warnings.length === 0"
            severity="success"
            :closable="false"
          >
            Routes successfully assigned! All groups have complete dinner
            routes.
          </Message>
        </div>
      </template>
    </Card>

    <!-- Routes Display -->
    <div v-if="localRoutes.length > 0" class="space-y-4">
      <h3 class="text-lg font-semibold">Assigned Routes</h3>
      <div class="grid gap-4 md:grid-cols-2">
        <RouteCard
          v-for="route in sortedRoutes"
          :key="route.dinnerGroupId"
          :route="route"
          :dinner-groups="dinnerGroups"
          :members="members"
          :event="event"
        />
      </div>
    </div>

    <!-- Empty State -->
    <Card v-else>
      <template #content>
        <div class="text-center py-12">
          <i class="pi pi-map text-6xl text-surface-400 mb-4"></i>
          <p class="text-lg text-surface-600 dark:text-surface-400 mb-2">
            No routes assigned yet
          </p>
          <p class="text-sm text-surface-500">
            Click "Assign Routes" to automatically create dinner routes for all
            groups.
          </p>
        </div>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { CategoryValue } from '@churchtools-extensions/persistance';
import type {
  EventMetadata,
  DinnerGroup,
  Route,
  GroupMember,
} from '@/types/models';
import { routingService } from '@/services/RoutingService';
import { emailService } from '@/services/EmailService';
import { useRouteStore } from '@/stores/route';
import { useEventMetadataStore } from '@/stores/eventMetadata';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import Card from '@churchtools-extensions/prime-volt/Card.vue';
import Button from '@churchtools-extensions/prime-volt/Button.vue';
import DangerButton from '@churchtools-extensions/prime-volt/DangerButton.vue';
import Message from '@churchtools-extensions/prime-volt/Message.vue';
import RouteCard from './RouteCard.vue';

const props = defineProps<{
  event: CategoryValue<EventMetadata>;
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

const localRoutes = ref<Omit<Route, 'id' | 'createdAt' | 'updatedAt'>[]>([]);
const warnings = ref<string[]>([]);
const assigning = ref(false);
const saving = ref(false);
const sendingNotifications = ref(false);
const isSaved = ref(false);

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

// Watch for existing routes
watch(
  () => props.routes,
  (newRoutes) => {
    if (newRoutes.length > 0 && localRoutes.value.length === 0) {
      localRoutes.value = newRoutes.map((r) => ({ ...r.value }));
      isSaved.value = true;
    }
  },
  { immediate: true },
);

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

    localRoutes.value = result.routes;
    warnings.value = result.warnings;
    isSaved.value = false;

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
    // Delete existing routes for this event
    await routeStore.deleteByEventId(props.event.id);

    // Create new routes
    await routeStore.createMultiple(localRoutes.value);

    // Update event status
    await eventMetadataStore.update(props.event.id, {
      status: 'routes-assigned',
    });

    isSaved.value = true;

    toast.add({
      severity: 'success',
      summary: 'Routes Saved',
      detail: `Saved ${localRoutes.value.length} routes`,
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
        // Get saved routes from store (need CategoryValue format)
        await routeStore.fetchAll();
        const savedRoutes = routeStore.routes.filter(
          (r) => r.value.eventMetadataId === props.event.id,
        );

        // Send emails for each route
        for (const route of savedRoutes) {
          const dinnerGroup = props.dinnerGroups.find(
            (g) => g.id === route.value.dinnerGroupId,
          );
          if (!dinnerGroup) continue;

          const email = emailService.generateRouteEmail(
            props.event.value,
            route,
            dinnerGroup,
            props.dinnerGroups,
            props.members,
          );

          // Send email (uses console fallback for now)
          await emailService.sendEmail(
            dinnerGroup.value.memberPersonIds,
            email.subject,
            email.htmlBody,
          );
        }

        // Update event status
        await eventMetadataStore.update(props.event.id, {
          status: 'notifications-sent',
        });

        toast.add({
          severity: 'success',
          summary: 'Notifications Sent',
          detail: `Sent ${savedRoutes.length} route notifications (check console)`,
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
        // Delete from store
        await routeStore.deleteByEventId(props.event.id);
        await eventMetadataStore.update(props.event.id, {
          status: 'groups-created',
        });
      }
      localRoutes.value = [];
      warnings.value = [];
      isSaved.value = false;
      emit('refresh');
    },
  });
}
</script>
