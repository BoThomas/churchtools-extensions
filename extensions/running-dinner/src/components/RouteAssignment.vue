<template>
  <div class="space-y-4">
    <!-- Status and Actions -->
    <Card>
      <template #content>
        <div class="space-y-4">
          <!-- Status Info -->
          <div class="grid grid-cols-2 gap-4">
            <div class="text-center">
              <div class="text-2xl font-bold text-primary">
                {{ groups.length }}
              </div>
              <div class="text-sm text-surface-600 dark:text-surface-400">
                Groups
              </div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-success">
                {{ routes.length }}
              </div>
              <div class="text-sm text-surface-600 dark:text-surface-400">
                Routes Assigned
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex gap-2">
            <Button
              label="Assign Routes"
              icon="pi pi-map"
              @click="handleAssignRoutes"
              :loading="assigning"
              :disabled="assigning || routes.length > 0 || groups.length === 0"
            />
            <Button
              v-if="routes.length > 0"
              label="Save Routes"
              icon="pi pi-save"
              @click="handleSaveRoutes"
              :loading="saving"
              :disabled="saving"
            />
            <DangerButton
              v-if="routes.length > 0"
              label="Reset Routes"
              icon="pi pi-refresh"
              outlined
              @click="handleReset"
              :disabled="assigning || saving"
            />
          </div>

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
            v-if="routes.length > 0 && warnings.length === 0"
            severity="success"
            :closable="false"
          >
            Routes successfully assigned! All groups have their complete dinner
            routes.
          </Message>
        </div>
      </template>
    </Card>

    <!-- Routes Display -->
    <div v-if="routes.length > 0" class="space-y-4">
      <h3 class="text-lg font-semibold">Assigned Routes</h3>
      <div class="grid gap-4 md:grid-cols-2">
        <Card
          v-for="route in sortedRoutes"
          :key="route.groupId"
          class="border border-surface-200 dark:border-surface-700"
        >
          <template #title>
            <div class="flex items-center justify-between">
              <span>Group {{ getGroupNumber(route.groupId) }}</span>
              <Chip
                :label="`${getGroupMemberCount(route.groupId)} members`"
                class="text-xs"
              />
            </div>
          </template>
          <template #content>
            <div class="space-y-3">
              <!-- Route Stops -->
              <div
                v-for="(stop, idx) in route.stops"
                :key="idx"
                class="flex gap-3 pb-3"
                :class="{
                  'border-b border-surface-200 dark:border-surface-700':
                    idx < route.stops.length - 1,
                }"
              >
                <div class="shrink-0">
                  <div
                    class="flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold"
                    :class="getMealColor(stop.meal)"
                  >
                    {{ idx + 1 }}
                  </div>
                </div>
                <div class="flex-1 space-y-1">
                  <div class="flex items-center justify-between">
                    <span class="font-semibold">{{
                      getMealLabel(stop.meal)
                    }}</span>
                    <Badge
                      v-if="stop.hostGroupId === route.groupId"
                      value="Hosting"
                      severity="success"
                    />
                  </div>
                  <div class="text-sm text-surface-600 dark:text-surface-400">
                    {{ stop.startTime }} - {{ stop.endTime }}
                  </div>
                  <div class="text-sm">
                    <div>{{ stop.hostAddress.street }}</div>
                    <div>
                      {{ stop.hostAddress.zip }} {{ stop.hostAddress.city }}
                    </div>
                  </div>
                  <div
                    v-if="stop.hostGroupId !== route.groupId"
                    class="text-xs text-surface-500"
                  >
                    Hosted by Group {{ getGroupNumber(stop.hostGroupId) }}
                  </div>
                  <a
                    :href="getGoogleMapsLink(stop.hostAddress)"
                    target="_blank"
                    class="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <i class="pi pi-map-marker"></i>
                    Open in Maps
                  </a>
                </div>
              </div>

              <!-- Group Members -->
              <div class="pt-2">
                <div class="mb-1 text-xs font-semibold text-surface-600">
                  Group Members:
                </div>
                <div class="flex flex-wrap gap-1">
                  <Chip
                    v-for="participantId in getGroupMembers(route.groupId)"
                    :key="participantId"
                    :label="getParticipantName(participantId)"
                    class="text-xs"
                  />
                </div>
              </div>
            </div>
          </template>
        </Card>
      </div>
    </div>

    <!-- Empty State -->
    <Card
      v-if="routes.length === 0 && groups.length > 0 && !assigning"
      class="text-center"
    >
      <template #content>
        <div class="py-8">
          <i class="pi pi-map text-4xl text-surface-400 mb-4"></i>
          <p class="text-surface-600 dark:text-surface-400">
            No routes assigned yet. Click "Assign Routes" to automatically
            create routes for all groups.
          </p>
        </div>
      </template>
    </Card>

    <Card v-if="groups.length === 0" class="text-center">
      <template #content>
        <div class="py-8">
          <i class="pi pi-users text-4xl text-surface-400 mb-4"></i>
          <p class="text-surface-600 dark:text-surface-400">
            Create groups first before assigning routes.
          </p>
        </div>
      </template>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { CategoryValue } from '@churchtools-extensions/persistance';
import type {
  RunningDinner,
  Group,
  Participant,
  Route,
  MealType,
  Address,
} from '../types/models';
import { assignRoutes } from '../algorithms/routing';
import { useRouteStore } from '../stores/route';
import { useConfirm } from 'primevue/useconfirm';
import { useToast } from 'primevue/usetoast';
import Card from '@churchtools-extensions/prime-volt/Card.vue';
import Button from '@churchtools-extensions/prime-volt/Button.vue';
import DangerButton from '@churchtools-extensions/prime-volt/DangerButton.vue';
import Message from '@churchtools-extensions/prime-volt/Message.vue';
import Chip from '@churchtools-extensions/prime-volt/Chip.vue';
import Badge from '@churchtools-extensions/prime-volt/Badge.vue';

const props = defineProps<{
  dinner: RunningDinner;
  groups: CategoryValue<Group>[];
  participants: CategoryValue<Participant>[];
}>();

const routeStore = useRouteStore();
const confirm = useConfirm();
const toast = useToast();

const routes = ref<Omit<Route, 'id'>[]>([]);
const warnings = ref<string[]>([]);
const assigning = ref(false);
const saving = ref(false);

// Computed
const sortedRoutes = computed(() => {
  return [...routes.value].sort((a, b) => {
    const groupA = props.groups.find((g) => g.id === a.groupId);
    const groupB = props.groups.find((g) => g.id === b.groupId);
    return (groupA?.value.groupNumber ?? 0) - (groupB?.value.groupNumber ?? 0);
  });
});

// Helper functions
function getGroupNumber(groupId: number): number {
  const group = props.groups.find((g) => g.id === groupId);
  return group?.value.groupNumber ?? 0;
}

function getGroupMembers(groupId: number): number[] {
  const group = props.groups.find((g) => g.id === groupId);
  return group?.value.participantIds ?? [];
}

function getGroupMemberCount(groupId: number): number {
  return getGroupMembers(groupId).length;
}

function getParticipantName(participantId: number): string {
  const participant = props.participants.find((p) => p.id === participantId);
  return participant?.value.name ?? 'Unknown';
}

function getMealLabel(meal: MealType): string {
  const labels: Record<MealType, string> = {
    starter: 'Starter',
    mainCourse: 'Main Course',
    dessert: 'Dessert',
  };
  return labels[meal];
}

function getMealColor(meal: MealType): string {
  const colors: Record<MealType, string> = {
    starter: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    mainCourse:
      'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
    dessert:
      'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  };
  return colors[meal];
}

function getGoogleMapsLink(address: Address): string {
  const query = encodeURIComponent(
    `${address.street}, ${address.zip} ${address.city}`,
  );
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

// Actions
async function handleAssignRoutes() {
  if (routes.value.length > 0) {
    toast.add({
      severity: 'warn',
      summary: 'Routes Already Assigned',
      detail: 'Reset routes first before assigning new ones.',
      life: 3000,
    });
    return;
  }

  assigning.value = true;
  warnings.value = [];

  try {
    const result = assignRoutes(props.dinner, props.groups, props.participants);
    routes.value = result.routes;
    warnings.value = result.warnings;

    toast.add({
      severity: 'success',
      summary: 'Routes Assigned',
      detail: `Successfully assigned routes for ${result.routes.length} groups.`,
      life: 3000,
    });
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Route Assignment Failed',
      detail: error.message || 'Could not assign routes.',
      life: 5000,
    });
    console.error('Route assignment error:', error);
  } finally {
    assigning.value = false;
  }
}

async function handleSaveRoutes() {
  if (routes.value.length === 0) {
    toast.add({
      severity: 'warn',
      summary: 'No Routes',
      detail: 'Assign routes first before saving.',
      life: 3000,
    });
    return;
  }

  saving.value = true;

  try {
    // Save all routes
    for (const route of routes.value) {
      await routeStore.create(route);
    }

    toast.add({
      severity: 'success',
      summary: 'Routes Saved',
      detail: `${routes.value.length} routes saved successfully.`,
      life: 3000,
    });

    // Emit event to parent to refresh and update dinner status
    emit('routes-saved');
  } catch (error: any) {
    toast.add({
      severity: 'error',
      summary: 'Save Failed',
      detail: error.message || 'Could not save routes.',
      life: 5000,
    });
    console.error('Save routes error:', error);
  } finally {
    saving.value = false;
  }
}

function handleReset() {
  confirm.require({
    message:
      'Are you sure you want to reset all routes? This cannot be undone.',
    header: 'Confirm Reset',
    icon: 'pi pi-exclamation-triangle',
    rejectProps: {
      label: 'Cancel',
      severity: 'secondary',
      outlined: true,
    },
    acceptProps: {
      label: 'Reset',
      severity: 'danger',
    },
    accept: () => {
      routes.value = [];
      warnings.value = [];
      toast.add({
        severity: 'info',
        summary: 'Routes Reset',
        detail: 'All route assignments have been cleared.',
        life: 3000,
      });
    },
  });
}

const emit = defineEmits<{
  'routes-saved': [];
}>();
</script>
