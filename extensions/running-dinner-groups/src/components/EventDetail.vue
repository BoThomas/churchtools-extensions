<template>
  <Dialog
    v-model:visible="isVisible"
    :header="eventName"
    :style="{ width: '95vw', maxWidth: '1200px', height: '90vh' }"
    :modal="true"
    pt:root:class="flex flex-col"
    pt:content:class="flex-1 flex flex-col overflow-hidden"
    @hide="handleClose"
  >
    <template #header>
      <div class="flex items-center gap-3">
        <span class="font-bold text-lg">{{ eventName }}</span>
        <Badge v-if="isArchived" value="Archived" severity="secondary" />
      </div>
    </template>

    <Tabs v-model:value="activeTab" class="flex flex-col h-full">
      <TabList class="shrink-0">
        <Tab value="overview">
          <i class="pi pi-info-circle mr-2"></i>
          Overview
        </Tab>
        <Tab value="members">
          <i class="pi pi-users mr-2"></i>
          Members ({{ members.length }})
        </Tab>
        <Tab value="groups">
          <i class="pi pi-sitemap mr-2"></i>
          Dinner Groups ({{ dinnerGroups.length }})
        </Tab>
        <Tab value="routes">
          <i class="pi pi-map mr-2"></i>
          Routes ({{ routes.length }})
        </Tab>
      </TabList>

      <TabPanels class="mt-2 flex-1 overflow-y-auto">
        <!-- Overview Tab -->
        <TabPanel value="overview">
          <!-- Next Step Banner -->
          <div
            class="mb-3 p-4 rounded-lg flex items-center gap-4"
            :class="nextStepStyle.bgClass"
          >
            <div
              class="w-10 h-10 rounded-full flex items-center justify-center"
              :class="nextStepStyle.iconBgClass"
            >
              <i class="pi text-lg" :class="nextStepStyle.iconClass"></i>
            </div>
            <div class="flex-1">
              <div class="font-semibold" :class="nextStepStyle.textClass">
                {{ nextStepTitle }}
              </div>
              <div class="text-sm" :class="nextStepStyle.subtextClass">
                {{ nextStepDescription }}
              </div>
            </div>
            <Button
              v-if="nextStepAction"
              :label="nextStepAction.label"
              :icon="
                nextStepActionLoading
                  ? 'pi pi-spin pi-spinner'
                  : nextStepAction.icon
              "
              size="small"
              :loading="nextStepActionLoading"
              :disabled="nextStepActionLoading"
              @click="nextStepAction.action"
            />
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <!-- Event Info Card -->
            <Card>
              <template #title>
                <i class="pi pi-calendar mr-2"></i>
                Event Information
              </template>
              <template #content>
                <div class="space-y-3">
                  <div class="flex justify-between">
                    <span class="text-surface-600 dark:text-surface-400"
                      >Event Date</span
                    >
                    <span class="font-medium">{{ formatEventDate }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-surface-600 dark:text-surface-400"
                      >Group Size</span
                    >
                    <span class="font-medium"
                      >{{ event.value.preferredGroupSize }} people</span
                    >
                  </div>
                  <div class="flex justify-between">
                    <span class="text-surface-600 dark:text-surface-400"
                      >Partner Prefs</span
                    >
                    <span class="font-medium">{{
                      event.value.allowPartnerPreferences
                        ? 'Enabled'
                        : 'Disabled'
                    }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-surface-600 dark:text-surface-400"
                      >Registration</span
                    >
                    <Badge
                      :value="registrationStatusText"
                      :severity="registrationStatusSeverity"
                    />
                  </div>
                </div>
              </template>
            </Card>

            <!-- Registration Statistics Card -->
            <Card>
              <template #title>
                <i class="pi pi-users mr-2"></i>
                Registration
              </template>
              <template #content>
                <div class="space-y-4">
                  <!-- Progress bar -->
                  <div class="space-y-2">
                    <div class="flex justify-between items-center text-sm">
                      <span class="text-surface-600 dark:text-surface-400"
                        >Progress</span
                      >
                      <span class="font-medium">{{
                        registrationProgressLabel
                      }}</span>
                    </div>
                    <!-- Multi-segment progress bar -->
                    <div
                      class="h-3 rounded-full overflow-hidden bg-surface-200 dark:bg-surface-700 flex"
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
                  </div>

                  <!-- Stats breakdown -->
                  <div class="grid grid-cols-2 gap-2 text-sm">
                    <div class="flex items-center gap-2">
                      <span class="w-3 h-3 rounded-full bg-primary"></span>
                      <span class="font-semibold min-w-[2ch] text-right">{{
                        activeMembers.length
                      }}</span>
                      <span class="text-surface-600 dark:text-surface-400"
                        >Confirmed</span
                      >
                    </div>
                    <div class="flex items-center gap-2">
                      <span
                        class="w-3 h-3 rounded-full bg-orange-400 dark:bg-orange-500"
                      ></span>
                      <span class="font-semibold min-w-[2ch] text-right">{{
                        waitlistMembers.length
                      }}</span>
                      <span class="text-surface-600 dark:text-surface-400"
                        >Waitlist</span
                      >
                    </div>
                    <div v-if="maxMembersLimit" class="flex items-center gap-2">
                      <span
                        class="w-3 h-3 rounded-full bg-surface-300 dark:bg-surface-600"
                      ></span>
                      <span class="font-semibold min-w-[2ch] text-right">{{
                        availableSpots
                      }}</span>
                      <span class="text-surface-600 dark:text-surface-400"
                        >Available</span
                      >
                    </div>
                    <div class="flex items-center gap-2">
                      <i class="pi pi-users text-surface-400 text-xs"></i>
                      <span class="font-semibold min-w-[2ch] text-right">{{
                        members.length
                      }}</span>
                      <span class="text-surface-600 dark:text-surface-400"
                        >Total</span
                      >
                    </div>
                  </div>
                </div>
              </template>
            </Card>

            <!-- Menu Times Card -->
            <Card>
              <template #title>
                <i class="pi pi-clock mr-2"></i>
                Menu Schedule
              </template>
              <template #content>
                <div class="space-y-3">
                  <div
                    class="flex items-center gap-3 p-2 bg-surface-50 dark:bg-surface-800 rounded"
                  >
                    <span class="text-xl">{{ getMealEmoji('starter') }}</span>
                    <div class="flex-1">
                      <div class="font-medium">Starter</div>
                      <div class="text-sm text-surface-500">
                        {{ formatTime(event.value.menu.starter.startTime) }} -
                        {{ formatTime(event.value.menu.starter.endTime) }}
                      </div>
                    </div>
                  </div>
                  <div
                    class="flex items-center gap-3 p-2 bg-surface-50 dark:bg-surface-800 rounded"
                  >
                    <span class="text-xl">{{
                      getMealEmoji('mainCourse')
                    }}</span>
                    <div class="flex-1">
                      <div class="font-medium">Main Course</div>
                      <div class="text-sm text-surface-500">
                        {{ formatTime(event.value.menu.mainCourse.startTime) }}
                        - {{ formatTime(event.value.menu.mainCourse.endTime) }}
                      </div>
                    </div>
                  </div>
                  <div
                    class="flex items-center gap-3 p-2 bg-surface-50 dark:bg-surface-800 rounded"
                  >
                    <span class="text-xl">{{ getMealEmoji('dessert') }}</span>
                    <div class="flex-1">
                      <div class="font-medium">Dessert</div>
                      <div class="text-sm text-surface-500">
                        {{ formatTime(event.value.menu.dessert.startTime) }} -
                        {{ formatTime(event.value.menu.dessert.endTime) }}
                      </div>
                    </div>
                  </div>
                </div>
              </template>
            </Card>

            <!-- After Party Card (if exists) -->
            <Card v-if="event.value.afterParty">
              <template #title>
                <i class="pi pi-sparkles mr-2"></i>
                After Party
              </template>
              <template #content>
                <div class="space-y-2">
                  <div class="flex justify-between">
                    <span class="text-surface-600 dark:text-surface-400"
                      >Time</span
                    >
                    <span class="font-medium">{{
                      formatTime(event.value.afterParty.time)
                    }}</span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-surface-600 dark:text-surface-400"
                      >Location</span
                    >
                    <span class="font-medium">{{
                      event.value.afterParty.location
                    }}</span>
                  </div>
                  <div
                    v-if="event.value.afterParty.isDessertLocation"
                    class="mt-2"
                  >
                    <Badge value="Dessert Location" severity="info" />
                  </div>
                </div>
              </template>
            </Card>

            <!-- Quick Actions Card -->
            <Card>
              <template #title>
                <i class="pi pi-bolt mr-2"></i>
                Quick Actions
              </template>
              <template #content>
                <div class="flex flex-wrap gap-2">
                  <Button
                    label="Open in ChurchTools"
                    icon="pi pi-external-link"
                    size="small"
                    outlined
                    @click="openInCT"
                  />
                  <Button
                    :label="
                      isOpenForMembers
                        ? 'Close Registration'
                        : 'Open Registration'
                    "
                    :icon="
                      isRegistrationLoading
                        ? 'pi pi-spin pi-spinner'
                        : isOpenForMembers
                          ? 'pi pi-lock'
                          : 'pi pi-lock-open'
                    "
                    size="small"
                    outlined
                    :disabled="isArchived || isRegistrationLoading"
                    :loading="isRegistrationLoading"
                    @click="$emit('toggle-registration')"
                  />
                  <SecondaryButton
                    v-if="!isArchived"
                    label="Archive"
                    icon="pi pi-inbox"
                    size="small"
                    outlined
                    @click="$emit('archive')"
                  />
                  <DangerButton
                    label="Delete"
                    icon="pi pi-trash"
                    size="small"
                    outlined
                    @click="$emit('delete')"
                  />
                </div>
              </template>
            </Card>
          </div>
        </TabPanel>

        <!-- Members Tab -->
        <TabPanel value="members">
          <MemberList
            :members="members"
            :loading="loadingMembers"
            :show-partner-preferences="event.value.allowPartnerPreferences"
            @refresh="loadMembers"
          />
        </TabPanel>

        <!-- Dinner Groups Tab -->
        <TabPanel value="groups">
          <DinnerGroupBuilder
            :event="event"
            :members="activeMembers"
            :dinner-groups="dinnerGroups"
            :routes="routes"
            :loading="loadingGroups"
            @groups-created="handleGroupsCreated"
            @groups-saved="handleGroupsSaved"
            @refresh="handleDinnerGroupsRefresh"
          />
        </TabPanel>

        <!-- Routes Tab -->
        <TabPanel value="routes">
          <RouteAssignment
            :event="currentEvent"
            :event-name="eventName"
            :members="members"
            :dinner-groups="dinnerGroups"
            :routes="routes"
            :loading="loadingRoutes"
            @routes-assigned="handleRoutesAssigned"
            @routes-saved="handleRoutesSaved"
            @send-notifications="handleSendNotifications"
            @refresh="loadRoutes"
          />
        </TabPanel>
      </TabPanels>
    </Tabs>

    <template #footer>
      <Button label="Close" @click="handleClose" />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import type { CategoryValue } from '@churchtools-extensions/persistance';
import {
  getMealEmoji,
  type EventMetadata,
  type Group,
  type GroupMember,
} from '@/types/models';
import { useChurchtoolsStore } from '@/stores/churchtools';
import { useDinnerGroupStore } from '@/stores/dinnerGroup';
import { useRouteStore } from '@/stores/route';
import { useEventMetadataStore } from '@/stores/eventMetadata';
import Dialog from '@churchtools-extensions/prime-volt/Dialog.vue';
import Tabs from '@churchtools-extensions/prime-volt/Tabs.vue';
import TabList from '@churchtools-extensions/prime-volt/TabList.vue';
import Tab from '@churchtools-extensions/prime-volt/Tab.vue';
import TabPanels from '@churchtools-extensions/prime-volt/TabPanels.vue';
import TabPanel from '@churchtools-extensions/prime-volt/TabPanel.vue';
import Card from '@churchtools-extensions/prime-volt/Card.vue';
import Badge from '@churchtools-extensions/prime-volt/Badge.vue';
import Button from '@churchtools-extensions/prime-volt/Button.vue';
import DangerButton from '@churchtools-extensions/prime-volt/DangerButton.vue';
import MemberList from './MemberList.vue';
import DinnerGroupBuilder from './DinnerGroupBuilder.vue';
import RouteAssignment from './RouteAssignment.vue';
import SecondaryButton from '@churchtools-extensions/prime-volt/SecondaryButton.vue';

const props = defineProps<{
  visible: boolean;
  event: CategoryValue<EventMetadata>;
  group?: Group | null;
  initialMembers?: GroupMember[];
  actionLoading?: string | null;
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
  'toggle-registration': [];
  archive: [];
  delete: [];
}>();

const churchtoolsStore = useChurchtoolsStore();
const dinnerGroupStore = useDinnerGroupStore();
const routeStore = useRouteStore();
const eventMetadataStore = useEventMetadataStore();

// Get the current event from the store for reactive status updates
const currentEvent = computed(
  () =>
    eventMetadataStore.events.find((e) => e.id === props.event.id) ??
    props.event,
);

const activeTab = ref('overview');
const members = ref<GroupMember[]>([]);
const loadingMembers = ref(false);

// Use computed properties that read directly from stores - single source of truth
const dinnerGroups = computed(() =>
  dinnerGroupStore.getByEventId(props.event.id),
);
const routes = computed(() => routeStore.getByEventId(props.event.id));
const loadingGroups = computed(() => dinnerGroupStore.loading);
const loadingRoutes = computed(() => routeStore.loading);

// Computed
const isVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value),
});

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
const isRegistrationLoading = computed(
  () => props.actionLoading === `registration-${props.event.id}`,
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

// Registration status text for the info card
const registrationStatusText = computed(() => {
  if (isRegistrationOpen.value) return 'Open';
  if (isRegistrationScheduledFuture.value)
    return `Opens ${formattedOpeningDate.value}`;
  return 'Closed';
});

const registrationStatusSeverity = computed(() => {
  if (isRegistrationOpen.value) return 'success';
  if (isRegistrationScheduledFuture.value) return 'info';
  return 'secondary';
});

// Registration progress bar computations
const maxMembersLimit = computed(
  () => props.group?.settings?.maxMembers ?? null,
);

const waitlistMembers = computed(() =>
  members.value.filter(
    (m) =>
      m.waitinglistPosition !== null && m.waitinglistPosition !== undefined,
  ),
);

const activePercent = computed(() => {
  const max = maxMembersLimit.value;
  const active = activeMembers.value.length;
  if (!max || max <= 0) {
    // No limit set - show some progress but cap at 100%
    return Math.min(active * 10, 100); // 10% per person, max 100%
  }
  return Math.min((active / max) * 100, 100);
});

const waitlistPercent = computed(() => {
  const max = maxMembersLimit.value;
  const waitlist = waitlistMembers.value.length;
  if (!max || max <= 0 || waitlist === 0) return 0;
  // Waitlist shows as additional percentage (can overflow past 100% visually capped)
  const remaining = Math.max(0, 100 - activePercent.value);
  return Math.min((waitlist / max) * 100, remaining + 20); // Allow slight overflow effect
});

const availableSpots = computed(() => {
  const max = maxMembersLimit.value;
  if (!max || max <= 0) return null;
  return Math.max(0, max - activeMembers.value.length);
});

const registrationProgressLabel = computed(() => {
  const active = activeMembers.value.length;
  const waitlist = waitlistMembers.value.length;
  const max = maxMembersLimit.value;

  if (max && max > 0) {
    if (waitlist > 0) {
      return `${active} / ${max} (+${waitlist} waitlist)`;
    }
    return `${active} / ${max}`;
  }
  // No limit set
  if (waitlist > 0) {
    return `${active} (+${waitlist} waitlist)`;
  }
  return `${active} participants`;
});

// Check if the next step action button should show loading
// (only for registration-related actions)
const nextStepActionLoading = computed(() => {
  if (!nextStepAction.value) return false;
  // The "Close Registration" action in the banner
  if (nextStepAction.value.label === 'Close Registration') {
    return isRegistrationLoading.value;
  }
  return false;
});

const activeMembers = computed(() =>
  members.value.filter((m) => m.groupMemberStatus === 'active'),
);

// Next step indicator for overview banner
const nextStepTitle = computed(() => {
  if (isArchived.value) return 'Event Archived';

  const status = currentEvent.value.value.status;
  switch (status) {
    case 'active':
      if (isRegistrationOpen.value) {
        return 'Waiting for Registrations';
      }
      if (isRegistrationScheduledFuture.value) {
        return 'Registration Scheduled';
      }
      return 'Ready to Create Groups';
    case 'groups-created':
      return 'Groups Created';
    case 'routes-assigned':
      return 'Routes Assigned';
    case 'notifications-sent':
      return 'Participants Notified';
    case 'completed':
      return 'Event Completed';
    default:
      return 'Unknown Status';
  }
});

const nextStepDescription = computed(() => {
  if (isArchived.value) return 'This event has been archived and is read-only.';

  const status = currentEvent.value.value.status;
  const memberCount = activeMembers.value.length;

  switch (status) {
    case 'active':
      if (isRegistrationOpen.value) {
        return `${memberCount} participant${memberCount !== 1 ? 's' : ''} registered so far. Close registration when ready.`;
      }
      if (isRegistrationScheduledFuture.value) {
        return `Registration opens on ${formattedOpeningDate.value}. ${memberCount} participant${memberCount !== 1 ? 's' : ''} pre-registered.`;
      }
      return `${memberCount} participant${memberCount !== 1 ? 's' : ''} registered. Go to "Dinner Groups" tab to create groups.`;
    case 'groups-created':
      return `${dinnerGroups.value.length} dinner groups created. Go to "Routes" tab to assign routes.`;
    case 'routes-assigned':
      return 'Routes are ready. Send notifications to participants.';
    case 'notifications-sent':
      return 'All participants have been notified with their routes.';
    case 'completed':
      return 'This running dinner event has been completed.';
    default:
      return '';
  }
});

const nextStepStyle = computed(() => {
  if (isArchived.value) {
    return {
      bgClass: 'bg-surface-100 dark:bg-surface-800',
      iconBgClass: 'bg-surface-200 dark:bg-surface-700',
      iconClass: 'pi-inbox text-surface-500',
      textClass: 'text-surface-700 dark:text-surface-300',
      subtextClass: 'text-surface-500 dark:text-surface-400',
    };
  }

  const status = currentEvent.value.value.status;
  switch (status) {
    case 'active':
      if (isRegistrationOpen.value) {
        return {
          bgClass: 'bg-blue-50 dark:bg-blue-900/20',
          iconBgClass: 'bg-blue-100 dark:bg-blue-800/40',
          iconClass: 'pi-clock text-blue-600 dark:text-blue-400',
          textClass: 'text-blue-800 dark:text-blue-200',
          subtextClass: 'text-blue-600 dark:text-blue-300',
        };
      }
      if (isRegistrationScheduledFuture.value) {
        return {
          bgClass: 'bg-purple-50 dark:bg-purple-900/20',
          iconBgClass: 'bg-purple-100 dark:bg-purple-800/40',
          iconClass: 'pi-calendar-clock text-purple-600 dark:text-purple-400',
          textClass: 'text-purple-800 dark:text-purple-200',
          subtextClass: 'text-purple-600 dark:text-purple-300',
        };
      }
      return {
        bgClass: 'bg-amber-50 dark:bg-amber-900/20',
        iconBgClass: 'bg-amber-100 dark:bg-amber-800/40',
        iconClass: 'pi-arrow-right text-amber-600 dark:text-amber-400',
        textClass: 'text-amber-800 dark:text-amber-200',
        subtextClass: 'text-amber-600 dark:text-amber-300',
      };
    case 'groups-created':
    case 'routes-assigned':
      return {
        bgClass: 'bg-amber-50 dark:bg-amber-900/20',
        iconBgClass: 'bg-amber-100 dark:bg-amber-800/40',
        iconClass: 'pi-arrow-right text-amber-600 dark:text-amber-400',
        textClass: 'text-amber-800 dark:text-amber-200',
        subtextClass: 'text-amber-600 dark:text-amber-300',
      };
    case 'notifications-sent':
    case 'completed':
      return {
        bgClass: 'bg-green-50 dark:bg-green-900/20',
        iconBgClass: 'bg-green-100 dark:bg-green-800/40',
        iconClass: 'pi-check-circle text-green-600 dark:text-green-400',
        textClass: 'text-green-800 dark:text-green-200',
        subtextClass: 'text-green-600 dark:text-green-300',
      };
    default:
      return {
        bgClass: 'bg-surface-100 dark:bg-surface-800',
        iconBgClass: 'bg-surface-200 dark:bg-surface-700',
        iconClass: 'pi-question-circle text-surface-500',
        textClass: 'text-surface-700 dark:text-surface-300',
        subtextClass: 'text-surface-500 dark:text-surface-400',
      };
  }
});

const nextStepAction = computed(() => {
  if (isArchived.value) return null;

  const status = currentEvent.value.value.status;
  switch (status) {
    case 'active':
      if (isRegistrationOpen.value) {
        return {
          label: 'Close Registration',
          icon: 'pi pi-lock',
          action: () => emit('toggle-registration'),
        };
      }
      // If registration is scheduled for the future, offer to open it now
      if (isRegistrationScheduledFuture.value) {
        return {
          label: 'Open Registration Now',
          icon: 'pi pi-lock-open',
          action: () => emit('toggle-registration'),
        };
      }
      return {
        label: 'Create Groups',
        icon: 'pi pi-sitemap',
        action: () => (activeTab.value = 'groups'),
      };
    case 'groups-created':
      return {
        label: 'Assign Routes',
        icon: 'pi pi-map',
        action: () => (activeTab.value = 'routes'),
      };
    case 'routes-assigned':
      return {
        label: 'Go to Routes',
        icon: 'pi pi-send',
        action: () => (activeTab.value = 'routes'),
      };
    default:
      return null;
  }
});

// Watchers
watch(
  () => props.visible,
  async (newVal) => {
    if (newVal) {
      // Use pre-loaded members if provided, otherwise fetch them
      if (props.initialMembers && props.initialMembers.length > 0) {
        members.value = props.initialMembers;
        // Only load dinner groups and routes (members already loaded)
        await Promise.all([loadDinnerGroups(), loadRoutes()]);
      } else {
        await loadAllData();
      }
    }
  },
);

// Methods
async function loadAllData() {
  await Promise.all([loadMembers(), loadDinnerGroups(), loadRoutes()]);
}

async function loadMembers() {
  loadingMembers.value = true;
  try {
    members.value = await churchtoolsStore.getGroupMembers(
      props.event.value.groupId,
    );
  } catch (error) {
    console.error('Failed to load members:', error);
  } finally {
    loadingMembers.value = false;
  }
}

async function loadDinnerGroups() {
  try {
    await dinnerGroupStore.fetchAll();
  } catch (error) {
    console.error('Failed to load dinner groups:', error);
  }
}

async function loadRoutes() {
  try {
    await routeStore.fetchAll();
  } catch (error) {
    console.error('Failed to load routes:', error);
  }
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

function openInCT() {
  const baseUrl = import.meta.env.DEV
    ? import.meta.env.VITE_EXTERNAL_API_URL?.replace(/\/$/, '')
    : window.location.origin;
  const url = `${baseUrl}/groups/${props.event.value.groupId}/dashboard`;
  window.open(url, '_blank');
}

function handleClose() {
  isVisible.value = false;
}

async function handleGroupsCreated() {
  await loadDinnerGroups();
}

async function handleGroupsSaved() {
  await loadDinnerGroups();
}

async function handleDinnerGroupsRefresh() {
  // Reload both dinner groups and routes (routes may have been reset)
  await Promise.all([loadDinnerGroups(), loadRoutes()]);
}

async function handleRoutesAssigned() {
  await loadRoutes();
}

async function handleRoutesSaved() {
  await loadRoutes();
}

async function handleSendNotifications() {
  await eventMetadataStore.fetchAll();
}

onMounted(() => {
  if (props.visible) {
    loadAllData();
  }
});
</script>
