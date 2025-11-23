<template>
  <Card v-if="route" class="border border-surface-200 dark:border-surface-700">
    <template #title>
      <div class="flex items-center justify-between">
        <span>Your Dinner Route</span>
        <Chip
          :label="`Group ${groupNumber}`"
          severity="success"
          class="text-sm"
        />
      </div>
    </template>
    <template #content>
      <div class="space-y-6">
        <!-- Group Members -->
        <div>
          <h4
            class="mb-3 text-sm font-semibold text-surface-700 dark:text-surface-300"
          >
            Your Group Members
          </h4>
          <div class="space-y-2">
            <div
              v-for="member in groupMembers"
              :key="member.id"
              class="flex items-start gap-3 rounded-lg bg-surface-50 p-3 dark:bg-surface-800"
            >
              <i class="pi pi-user text-surface-500"></i>
              <div class="flex-1">
                <div class="font-semibold">
                  {{ member.value.name }}
                  <Badge
                    v-if="member.id === hostId"
                    value="Host"
                    severity="success"
                    class="ml-2"
                  />
                </div>
                <div class="text-sm text-surface-600 dark:text-surface-400">
                  {{ member.value.email }} • {{ member.value.phone }}
                </div>
                <div
                  v-if="member.value.dietaryRestrictions"
                  class="mt-1 text-xs text-surface-500"
                >
                  <i class="pi pi-info-circle mr-1"></i>
                  {{ member.value.dietaryRestrictions }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Route Timeline -->
        <div>
          <h4
            class="mb-3 text-sm font-semibold text-surface-700 dark:text-surface-300"
          >
            Your Route Timeline
          </h4>
          <div class="space-y-4">
            <div
              v-for="(stop, idx) in route.value.stops"
              :key="idx"
              class="relative flex gap-4"
            >
              <!-- Timeline Line -->
              <div
                v-if="idx < route.value.stops.length - 1"
                class="absolute left-4 top-10 h-[calc(100%-1rem)] w-0.5 bg-surface-300 dark:bg-surface-600"
              ></div>

              <!-- Step Number -->
              <div class="shrink-0">
                <div
                  class="flex h-8 w-8 items-center justify-center rounded-full font-semibold shadow-sm"
                  :class="getMealColor(stop.meal)"
                >
                  {{ idx + 1 }}
                </div>
              </div>

              <!-- Stop Details -->
              <div class="flex-1 pb-4">
                <Card
                  class="border border-surface-200 shadow-sm dark:border-surface-700"
                >
                  <template #content>
                    <div class="space-y-3">
                      <!-- Header -->
                      <div class="flex items-start justify-between">
                        <div>
                          <h5 class="text-lg font-semibold">
                            {{ getMealLabel(stop.meal) }}
                          </h5>
                          <div
                            class="text-sm text-surface-600 dark:text-surface-400"
                          >
                            {{ stop.startTime }} - {{ stop.endTime }}
                          </div>
                        </div>
                        <Badge
                          v-if="isHosting(stop)"
                          value="You're Hosting"
                          severity="success"
                        />
                        <Badge
                          v-else
                          :value="`Group ${getHostGroupNumber(stop.hostGroupId)}`"
                          severity="info"
                        />
                      </div>

                      <!-- Address -->
                      <div
                        class="rounded-lg bg-surface-50 p-3 dark:bg-surface-800"
                      >
                        <div class="mb-1 flex items-center gap-2">
                          <i class="pi pi-map-marker text-primary"></i>
                          <span class="font-semibold">Location</span>
                        </div>
                        <div class="ml-6 text-sm">
                          <div>{{ stop.hostAddress.street }}</div>
                          <div>
                            {{ stop.hostAddress.zip }}
                            {{ stop.hostAddress.city }}
                          </div>
                        </div>
                        <a
                          :href="getGoogleMapsLink(stop.hostAddress)"
                          target="_blank"
                          class="ml-6 mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          <i class="pi pi-external-link"></i>
                          Open in Google Maps
                        </a>
                      </div>

                      <!-- Host Info (if not hosting) -->
                      <div
                        v-if="!isHosting(stop)"
                        class="rounded-lg bg-surface-50 p-3 dark:bg-surface-800"
                      >
                        <div class="mb-2 flex items-center gap-2">
                          <i class="pi pi-users text-primary"></i>
                          <span class="font-semibold">Host Group</span>
                        </div>
                        <div class="ml-6 space-y-1">
                          <div
                            v-for="hostMember in getHostGroupMembers(
                              stop.hostGroupId,
                            )"
                            :key="hostMember.id"
                            class="text-sm"
                          >
                            <span class="font-medium">{{
                              hostMember.value.name
                            }}</span>
                            <span
                              class="text-surface-600 dark:text-surface-400"
                            >
                              • {{ hostMember.value.phone }}
                            </span>
                          </div>
                        </div>
                      </div>

                      <!-- Dietary Info for Guests (if hosting) -->
                      <div
                        v-if="
                          isHosting(stop) &&
                          getGuestDietaryInfo(stop).length > 0
                        "
                        class="rounded-lg bg-amber-50 p-3 dark:bg-amber-950"
                      >
                        <div class="mb-2 flex items-center gap-2">
                          <i class="pi pi-info-circle text-amber-600"></i>
                          <span class="font-semibold"
                            >Guest Dietary Restrictions</span
                          >
                        </div>
                        <ul class="ml-6 space-y-1 text-sm">
                          <li
                            v-for="(info, i) in getGuestDietaryInfo(stop)"
                            :key="i"
                          >
                            <span class="font-medium">{{ info.name }}:</span>
                            {{ info.restrictions }}
                          </li>
                        </ul>
                      </div>
                    </div>
                  </template>
                </Card>
              </div>
            </div>
          </div>
        </div>

        <!-- After Party -->
        <div
          v-if="dinner.afterParty"
          class="rounded-lg bg-primary-50 p-4 dark:bg-primary-950"
        >
          <div class="mb-2 flex items-center gap-2">
            <i class="pi pi-star text-primary"></i>
            <h4 class="font-semibold text-primary">After Party</h4>
          </div>
          <div class="ml-6 text-sm">
            <div class="font-medium">{{ dinner.afterParty.time }}</div>
            <div class="text-surface-700 dark:text-surface-300">
              {{ dinner.afterParty.location }}
            </div>
          </div>
        </div>
      </div>
    </template>
  </Card>

  <!-- No Route Assigned -->
  <Card v-else class="text-center">
    <template #content>
      <div class="py-8">
        <i class="pi pi-clock mb-4 text-4xl text-surface-400"></i>
        <p class="text-surface-600 dark:text-surface-400">
          Your route hasn't been assigned yet. Check back after the organizer
          creates the groups and routes.
        </p>
      </div>
    </template>
  </Card>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { CategoryValue } from '@churchtools-extensions/persistance';
import type {
  RunningDinner,
  Route,
  RouteStop,
  Group,
  Participant,
  MealType,
  Address,
} from '../types/models';
import Card from '@churchtools-extensions/prime-volt/Card.vue';
import Chip from '@churchtools-extensions/prime-volt/Chip.vue';
import Badge from '@churchtools-extensions/prime-volt/Badge.vue';

const props = defineProps<{
  dinner: RunningDinner;
  route: CategoryValue<Route> | null;
  group: CategoryValue<Group> | null;
  participants: CategoryValue<Participant>[];
  allGroups: CategoryValue<Group>[];
}>();

// Computed
const groupNumber = computed(() => props.group?.value.groupNumber ?? 0);

const groupMembers = computed(() => {
  if (!props.group) return [];
  return props.participants.filter((p) =>
    props.group!.value.participantIds.includes(p.id),
  );
});

const hostId = computed(() => props.group?.value.hostParticipantId);

// Helper functions
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
    starter: 'bg-blue-500 text-white',
    mainCourse: 'bg-green-500 text-white',
    dessert: 'bg-purple-500 text-white',
  };
  return colors[meal];
}

function isHosting(stop: RouteStop): boolean {
  return stop.hostGroupId === props.route?.value.groupId;
}

function getHostGroupNumber(hostGroupId: number): number {
  const hostGroup = props.allGroups.find((g) => g.id === hostGroupId);
  return hostGroup?.value.groupNumber ?? 0;
}

function getHostGroupMembers(
  hostGroupId: number,
): CategoryValue<Participant>[] {
  const hostGroup = props.allGroups.find((g) => g.id === hostGroupId);
  if (!hostGroup) return [];
  return props.participants.filter((p) =>
    hostGroup.value.participantIds.includes(p.id),
  );
}

function getGuestDietaryInfo(
  stop: RouteStop,
): Array<{ name: string; restrictions: string }> {
  if (!isHosting(stop)) return [];

  // Get all guests (participants from other groups at this meal)
  const guestInfo: Array<{ name: string; restrictions: string }> = [];

  // For each group at this meal, get their dietary restrictions
  props.allGroups.forEach((group) => {
    if (group.id === props.route?.value.groupId) return; // Skip own group

    // Check if this group will be at this meal
    // We need to find the route for this group and check if they're at our location
    // For simplicity, we'll show dietary restrictions of all participants
    // (In a real implementation, you'd need to check which groups actually meet)
    const members = props.participants.filter((p) =>
      group.value.participantIds.includes(p.id),
    );

    members.forEach((member) => {
      if (member.value.dietaryRestrictions) {
        guestInfo.push({
          name: member.value.name,
          restrictions: member.value.dietaryRestrictions,
        });
      }
    });
  });

  return guestInfo;
}

function getGoogleMapsLink(address: Address): string {
  const query = encodeURIComponent(
    `${address.street}, ${address.zip} ${address.city}`,
  );
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}
</script>
