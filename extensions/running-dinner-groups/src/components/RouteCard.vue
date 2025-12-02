<template>
  <div
    :id="`route-group-${route.dinnerGroupId}`"
    class="p-4 bg-surface-50 dark:bg-surface-900 rounded-lg"
  >
    <!-- Group Header -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-2">
        <span class="font-semibold">Group {{ groupNumber }}</span>
        <span class="text-surface-400">·</span>
        <span class="text-sm text-surface-500">
          {{ getOwnGroupMembers().map(formatMemberName).join(', ') }}
        </span>
      </div>
    </div>

    <!-- Journey Timeline -->
    <div class="relative pl-8">
      <!-- Vertical line -->
      <div
        class="absolute left-[1.4rem] top-0 bottom-0 w-0.5 bg-surface-300 dark:bg-surface-600"
      ></div>

      <div
        v-for="(stop, idx) in route.stops"
        :key="idx"
        class="relative pb-6 last:pb-0"
      >
        <!-- Timeline dot -->
        <div
          class="absolute -left-5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold"
          :class="[
            getMealColor(stop.meal),
            isHostingMeal(stop) ? 'ring-2 ring-primary ring-offset-2' : '',
          ]"
        >
          {{ getMealEmoji(stop.meal) }}
        </div>

        <!-- Content -->
        <div
          class="ml-4 p-3 bg-surface-0 dark:bg-surface-800 rounded-lg shadow-sm"
          :class="{
            'border-2 border-primary': isHostingMeal(stop),
            'border border-surface-200 dark:border-surface-700 cursor-pointer hover:border-primary/50 transition-colors':
              !isHostingMeal(stop),
          }"
          @click="!isHostingMeal(stop) && scrollToGroup(stop.hostDinnerGroupId)"
        >
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <span class="font-semibold">{{
                getMealLabelWithoutEmoji(stop.meal)
              }}</span>
              <Badge
                v-if="isHostingMeal(stop)"
                value="Host"
                severity="success"
                class="text-xs"
              />
            </div>
            <span class="text-sm text-surface-500">
              {{ formatTime(stop.startTime) }} -
              {{ formatTime(stop.endTime) }}
            </span>
          </div>

          <div class="grid gap-2 text-sm">
            <div class="flex items-center gap-2">
              <i class="pi pi-users text-surface-400"></i>
              <span>{{
                getHostGroupMembers(stop).map(formatMemberName).join(', ')
              }}</span>
            </div>
            <div v-if="getHostAddress(stop)" class="flex items-center gap-2">
              <i class="pi pi-map-marker text-surface-400"></i>
              <a
                :href="getGoogleMapsLink(stop)"
                target="_blank"
                class="text-primary hover:underline"
              >
                {{ getHostAddress(stop) }}
              </a>
            </div>
          </div>

          <!-- Expandable guest list -->
          <div
            v-if="
              isHostingMeal(stop) && getGuestGroupsAtLocation(stop).length > 0
            "
            class="mt-3 pt-3 border-t border-surface-200 dark:border-surface-700"
          >
            <div class="text-xs font-semibold text-surface-500 mb-2">
              Guests arriving ({{ getTotalGuestsAtLocation(stop) }} people):
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="group in getGuestGroupsAtLocation(stop)"
                :key="group.id"
                class="px-2 py-1 bg-surface-100 dark:bg-surface-700 rounded text-xs text-left hover:bg-surface-200 dark:hover:bg-surface-600 transition-colors cursor-pointer"
                @click="scrollToGroup(group.id)"
              >
                <span class="font-medium">G{{ group.value.groupNumber }}</span
                >:
                {{ getGroupMembers(group).map(formatMemberName).join(', ') }}
              </button>
            </div>

            <!-- Dietary Needs -->
            <div
              v-if="getAllDietaryAtLocation(stop).length > 0"
              class="mt-3 p-2 bg-orange-50 dark:bg-orange-900/20 rounded text-xs"
            >
              <div
                class="font-semibold text-orange-700 dark:text-orange-300 mb-1"
              >
                🍽️ Dietary Needs:
              </div>
              <div
                v-for="item in getAllDietaryAtLocation(stop)"
                :key="item.personId"
                class="text-surface-700 dark:text-surface-300"
              >
                {{ item.name }}:
                <span class="font-medium">{{ item.dietary }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- After Party -->
    <div v-if="event.value.afterParty" class="relative pl-8 pt-2">
      <div
        class="absolute -left-5 w-6 h-6 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center"
      >
        🎉
      </div>
      <div
        class="ml-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800"
      >
        <div class="font-semibold text-yellow-800 dark:text-yellow-200">
          After Party
        </div>
        <div class="text-sm text-yellow-700 dark:text-yellow-300">
          {{ event.value.afterParty.time }} @
          {{ event.value.afterParty.location }}
        </div>
      </div>
    </div>
  </div>
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
import { getMealEmoji, getMealLabelWithoutEmoji } from '@/types/models';
import Badge from '@churchtools-extensions/prime-volt/Badge.vue';

// Scroll to a group's route card
function scrollToGroup(groupId: number) {
  const element = document.getElementById(`route-group-${groupId}`);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // Brief highlight effect with light blue background
    element.classList.add('!bg-blue-100/50', 'dark:!bg-blue-900/50');
    setTimeout(() => {
      element.classList.remove('!bg-blue-100/50', 'dark:!bg-blue-900/50');
    }, 1500);
  }
}

const props = defineProps<{
  route: Omit<Route, 'id' | 'createdAt' | 'updatedAt'>;
  allRoutes: Omit<Route, 'id' | 'createdAt' | 'updatedAt'>[];
  dinnerGroups: CategoryValue<DinnerGroup>[];
  members: GroupMember[];
  event: CategoryValue<EventMetadata>;
}>();

// Computed
const dinnerGroup = computed(() =>
  props.dinnerGroups.find((g) => g.id === props.route.dinnerGroupId),
);

const groupNumber = computed(() => dinnerGroup.value?.value.groupNumber ?? 0);

// Helper to format name as "John D."
function formatMemberName(member: GroupMember): string {
  const firstName = member.person.firstName;
  const lastInitial = member.person.lastName?.charAt(0);
  return lastInitial ? `${firstName} ${lastInitial}.` : firstName;
}

// Methods
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

function getHostGroupMembers(stop: RouteStop): GroupMember[] {
  const hostGroup = getHostGroup(stop);
  if (!hostGroup) return [];
  return props.members.filter((m) =>
    hostGroup.value.memberPersonIds.includes(m.personId),
  );
}

function getHostAddress(stop: RouteStop): string | null {
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

function getOwnGroupMembers(): GroupMember[] {
  if (!dinnerGroup.value) return [];
  return props.members.filter((m) =>
    dinnerGroup.value!.value.memberPersonIds.includes(m.personId),
  );
}

function getGroupMembers(group: CategoryValue<DinnerGroup>): GroupMember[] {
  return props.members.filter((m) =>
    group.value.memberPersonIds.includes(m.personId),
  );
}

function getGroupsAtLocation(stop: RouteStop): CategoryValue<DinnerGroup>[] {
  // Find all groups that are at this location for this meal
  const groupIds = new Set<number>();

  for (const otherRoute of props.allRoutes) {
    const matchingStop = otherRoute.stops.find(
      (s) =>
        s.meal === stop.meal && s.hostDinnerGroupId === stop.hostDinnerGroupId,
    );
    if (matchingStop) {
      groupIds.add(otherRoute.dinnerGroupId);
    }
  }

  return props.dinnerGroups
    .filter((g) => groupIds.has(g.id))
    .sort((a, b) => a.value.groupNumber - b.value.groupNumber);
}

function getGuestGroupsAtLocation(
  stop: RouteStop,
): CategoryValue<DinnerGroup>[] {
  // Get all groups except the host group
  return getGroupsAtLocation(stop).filter(
    (g) => g.id !== stop.hostDinnerGroupId,
  );
}

function getTotalGuestsAtLocation(stop: RouteStop): number {
  const groups = getGuestGroupsAtLocation(stop);
  return groups.reduce(
    (count, group) => count + group.value.memberPersonIds.length,
    0,
  );
}

function getAllDietaryAtLocation(
  stop: RouteStop,
): { personId: number; name: string; dietary: string }[] {
  const groups = getGroupsAtLocation(stop);
  const dietary: { personId: number; name: string; dietary: string }[] = [];

  for (const group of groups) {
    const members = getGroupMembers(group);
    for (const member of members) {
      const restrictions = [
        member.fields?.dietaryRestrictions,
        member.fields?.allergyInfo,
      ]
        .filter(Boolean)
        .join(', ');
      if (restrictions) {
        dietary.push({
          personId: member.personId,
          name: `${member.person.firstName} ${member.person.lastName}`,
          dietary: restrictions,
        });
      }
    }
  }

  return dietary;
}
</script>
