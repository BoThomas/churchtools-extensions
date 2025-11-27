<template>
  <Card class="h-full">
    <template #title>
      <div class="flex items-center justify-between">
        <span>Group {{ groupNumber }}</span>
        <Chip :label="`${memberCount} members`" class="text-xs" />
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
          <div class="flex-1 min-w-0">
            <div class="font-semibold text-sm mb-1">
              {{ getMealLabel(stop.meal) }}
              <span v-if="isHostingMeal(stop)" class="text-primary">
                (Hosting)
              </span>
            </div>

            <!-- Time -->
            <div class="text-sm text-surface-600 dark:text-surface-400 mb-1">
              <i class="pi pi-clock text-xs mr-1"></i>
              {{ formatTime(stop.startTime) }} - {{ formatTime(stop.endTime) }}
            </div>

            <!-- Address -->
            <div v-if="getHostAddress(stop)" class="text-sm">
              <a
                :href="getGoogleMapsLink(stop)"
                target="_blank"
                class="inline-flex items-center gap-1 text-primary hover:underline"
              >
                <i class="pi pi-map-marker text-xs"></i>
                <span class="truncate">{{ getHostAddress(stop) }}</span>
              </a>
            </div>

            <!-- After Party Location -->
            <div
              v-if="isDessertAtAfterParty(stop)"
              class="mt-1 text-xs text-surface-500 italic"
            >
              🎉 All groups meet at the after party location
            </div>

            <!-- Host Info -->
            <div v-if="getHostName(stop)" class="text-xs text-surface-500 mt-1">
              Host: {{ getHostName(stop) }}
            </div>
          </div>
        </div>

        <!-- After Party Info -->
        <div
          v-if="event.value.afterParty"
          class="pt-2 border-t border-surface-200 dark:border-surface-700"
        >
          <div class="flex items-center gap-2 text-sm">
            <i class="pi pi-sparkles text-yellow-500"></i>
            <span class="font-medium">After Party</span>
          </div>
          <div class="text-sm text-surface-600 dark:text-surface-400 mt-1">
            {{ event.value.afterParty.time }} @
            {{ event.value.afterParty.location }}
          </div>
        </div>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { CategoryValue } from '@churchtools-extensions/persistance';
import type {
  EventMetadata,
  DinnerGroup,
  Route,
  RouteStop,
  GroupMember,
} from '@/types/models';
import Card from '@churchtools-extensions/prime-volt/Card.vue';
import Chip from '@churchtools-extensions/prime-volt/Chip.vue';

const props = defineProps<{
  route: Omit<Route, 'id' | 'createdAt' | 'updatedAt'>;
  dinnerGroups: CategoryValue<DinnerGroup>[];
  members: GroupMember[];
  event: CategoryValue<EventMetadata>;
}>();

// Computed
const dinnerGroup = computed(() =>
  props.dinnerGroups.find((g) => g.id === props.route.dinnerGroupId),
);

const groupNumber = computed(() => dinnerGroup.value?.value.groupNumber ?? 0);

const memberCount = computed(
  () => dinnerGroup.value?.value.memberPersonIds.length ?? 0,
);

// Methods
function getMealLabel(meal: string): string {
  const labels: Record<string, string> = {
    starter: '🥗 Starter',
    mainCourse: '🍽️ Main Course',
    dessert: '🍰 Dessert',
  };
  return labels[meal] || meal;
}

function getMealColor(meal: string): string {
  const colors: Record<string, string> = {
    starter: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    mainCourse:
      'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    dessert: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  };
  return colors[meal] || 'bg-surface-100 text-surface-800';
}

function formatTime(isoTime: string): string {
  try {
    const date = new Date(isoTime);
    return date.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoTime;
  }
}

function isHostingMeal(stop: RouteStop): boolean {
  return stop.hostDinnerGroupId === props.route.dinnerGroupId;
}

function isDessertAtAfterParty(stop: RouteStop): boolean {
  return (
    stop.meal === 'dessert' &&
    (props.event.value.afterParty?.isDessertLocation ?? false)
  );
}

function getHostGroup(stop: RouteStop): CategoryValue<DinnerGroup> | undefined {
  return props.dinnerGroups.find((g) => g.id === stop.hostDinnerGroupId);
}

function getHostMember(stop: RouteStop): GroupMember | undefined {
  const hostGroup = getHostGroup(stop);
  if (!hostGroup?.value.hostPersonId) return undefined;
  return props.members.find((m) => m.personId === hostGroup.value.hostPersonId);
}

function getHostName(stop: RouteStop): string | null {
  const host = getHostMember(stop);
  if (!host) return null;
  return `${host.person.firstName} ${host.person.lastName}`;
}

function getHostAddress(stop: RouteStop): string | null {
  // If dessert at after party, use after party location
  if (isDessertAtAfterParty(stop)) {
    return props.event.value.afterParty?.location ?? null;
  }

  const host = getHostMember(stop);
  if (!host?.person.addresses?.[0]) return null;
  const addr = host.person.addresses[0];
  return [addr.street, addr.zip, addr.city].filter(Boolean).join(', ');
}

function getGoogleMapsLink(stop: RouteStop): string {
  const address = getHostAddress(stop);
  if (!address) return '#';
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}
</script>
