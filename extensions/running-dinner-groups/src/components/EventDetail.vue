<template>
  <Dialog
    v-model:visible="isVisible"
    :header="eventName"
    :style="{ width: '95vw', maxWidth: '1200px', height: '90vh' }"
    :modal="true"
    :maximizable="true"
    @hide="handleClose"
  >
    <template #header>
      <div class="flex items-center gap-3">
        <span class="font-bold text-lg">{{ eventName }}</span>
        <Badge :value="ctStatusLabel" :severity="ctStatusSeverity" />
        <Badge
          :value="workflowStatusLabel"
          :severity="workflowStatusSeverity"
        />
      </div>
    </template>

    <Tabs v-model:value="activeTab">
      <TabList>
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

      <TabPanels class="mt-4">
        <!-- Overview Tab -->
        <TabPanel value="overview">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      :value="isOpenForMembers ? 'Open' : 'Closed'"
                      :severity="isOpenForMembers ? 'success' : 'danger'"
                    />
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
                    <i class="pi pi-star text-yellow-500"></i>
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
                    <i class="pi pi-circle-fill text-blue-500"></i>
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
                    <i class="pi pi-heart-fill text-pink-500"></i>
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
                      event.value.afterParty.time
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
                    :icon="isOpenForMembers ? 'pi pi-lock' : 'pi pi-lock-open'"
                    size="small"
                    outlined
                    :disabled="isArchived"
                    @click="$emit('toggle-registration')"
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
            :loading="loadingGroups"
            @groups-created="handleGroupsCreated"
            @groups-saved="handleGroupsSaved"
            @refresh="loadDinnerGroups"
          />
        </TabPanel>

        <!-- Routes Tab -->
        <TabPanel value="routes">
          <RouteAssignment
            :event="event"
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
      <div class="flex justify-end">
        <Button label="Close" @click="handleClose" />
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import type { CategoryValue } from '@churchtools-extensions/persistance';
import type {
  EventMetadata,
  Group,
  GroupMember,
  DinnerGroup,
  Route,
} from '@/types/models';
import { useChurchtoolsStore } from '@/stores/churchtools';
import { useDinnerGroupStore } from '@/stores/dinnerGroup';
import { useRouteStore } from '@/stores/route';
import Dialog from 'primevue/dialog';
import Tabs from '@churchtools-extensions/prime-volt/Tabs.vue';
import TabList from '@churchtools-extensions/prime-volt/TabList.vue';
import Tab from '@churchtools-extensions/prime-volt/Tab.vue';
import TabPanels from '@churchtools-extensions/prime-volt/TabPanels.vue';
import TabPanel from '@churchtools-extensions/prime-volt/TabPanel.vue';
import Card from '@churchtools-extensions/prime-volt/Card.vue';
import Badge from '@churchtools-extensions/prime-volt/Badge.vue';
import Button from '@churchtools-extensions/prime-volt/Button.vue';
import MemberList from './MemberList.vue';
import DinnerGroupBuilder from './DinnerGroupBuilder.vue';
import RouteAssignment from './RouteAssignment.vue';

const props = defineProps<{
  visible: boolean;
  event: CategoryValue<EventMetadata>;
  group?: Group | null;
}>();

const emit = defineEmits<{
  'update:visible': [value: boolean];
  'toggle-registration': [];
  'status-changed': [];
}>();

const churchtoolsStore = useChurchtoolsStore();
const dinnerGroupStore = useDinnerGroupStore();
const routeStore = useRouteStore();

const activeTab = ref('overview');
const members = ref<GroupMember[]>([]);
const dinnerGroups = ref<CategoryValue<DinnerGroup>[]>([]);
const routes = ref<CategoryValue<Route>[]>([]);
const loadingMembers = ref(false);
const loadingGroups = ref(false);
const loadingRoutes = ref(false);

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
const isArchived = computed(() => props.group?.groupStatusId === 3);

const ctStatusLabel = computed(() => {
  const statusId = props.group?.groupStatusId;
  switch (statusId) {
    case 1:
      return 'Draft';
    case 2:
      return 'Active';
    case 3:
      return 'Archived';
    case 4:
      return 'Finished';
    default:
      return 'Unknown';
  }
});

const ctStatusSeverity = computed(
  (): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' => {
    const statusId = props.group?.groupStatusId;
    switch (statusId) {
      case 1:
        return 'warn';
      case 2:
        return 'success';
      case 3:
        return 'secondary';
      case 4:
        return 'info';
      default:
        return 'secondary';
    }
  },
);

const workflowStatusLabel = computed(() => {
  const statusMap: Record<string, string> = {
    active: 'Pending',
    'groups-created': 'Groups Created',
    'routes-assigned': 'Routes Assigned',
    'notifications-sent': 'Notified',
    completed: 'Completed',
  };
  return statusMap[props.event.value.status] || props.event.value.status;
});

const workflowStatusSeverity = computed(
  (): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' => {
    const severityMap: Record<
      string,
      'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast'
    > = {
      active: 'info',
      'groups-created': 'warn',
      'routes-assigned': 'warn',
      'notifications-sent': 'success',
      completed: 'secondary',
    };
    return severityMap[props.event.value.status] || 'info';
  },
);

const activeMembers = computed(() =>
  members.value.filter((m) => m.groupMemberStatus === 'active'),
);

// Watchers
watch(
  () => props.visible,
  async (newVal) => {
    if (newVal) {
      await loadAllData();
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
  loadingGroups.value = true;
  try {
    await dinnerGroupStore.fetchAll();
    dinnerGroups.value = dinnerGroupStore.dinnerGroups.filter(
      (g) => g.value.eventMetadataId === props.event.id,
    );
  } catch (error) {
    console.error('Failed to load dinner groups:', error);
  } finally {
    loadingGroups.value = false;
  }
}

async function loadRoutes() {
  loadingRoutes.value = true;
  try {
    await routeStore.fetchAll();
    routes.value = routeStore.routes.filter(
      (r) => r.value.eventMetadataId === props.event.id,
    );
  } catch (error) {
    console.error('Failed to load routes:', error);
  } finally {
    loadingRoutes.value = false;
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
  emit('status-changed');
}

async function handleGroupsSaved() {
  await loadDinnerGroups();
  emit('status-changed');
}

async function handleRoutesAssigned() {
  await loadRoutes();
  emit('status-changed');
}

async function handleRoutesSaved() {
  await loadRoutes();
  emit('status-changed');
}

function handleSendNotifications() {
  emit('status-changed');
}

onMounted(() => {
  if (props.visible) {
    loadAllData();
  }
});
</script>
