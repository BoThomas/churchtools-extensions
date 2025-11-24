<template>
  <div class="space-y-6">
    <!-- Organizer Group Setup Component -->
    <ParentGroupSetup
      ref="parentGroupSetupRef"
      @created="handleParentGroupCreated"
    />

    <!-- Main Content (only show if user has permission) -->
    <template v-if="parentGroupSetupRef?.hasPermission">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-surface-900 dark:text-surface-50">
            Running Dinner Events
          </h1>
          <p class="text-surface-600 dark:text-surface-400 mt-1">
            Manage your running dinner events
          </p>
        </div>
        <Button
          label="Create New Event"
          icon="pi pi-plus"
          @click="showCreateDialog = true"
        />
      </div>

      <!-- Loading State -->
      <div v-if="eventMetadataStore.loading" class="flex justify-center py-12">
        <i class="pi pi-spin pi-spinner text-4xl text-primary"></i>
      </div>

      <!-- Events List -->
      <div v-else class="space-y-4">
        <div
          v-if="eventMetadataStore.events.length === 0"
          class="text-center py-12 bg-surface-50 dark:bg-surface-800 rounded-lg"
        >
          <i class="pi pi-calendar text-4xl text-surface-400 mb-4"></i>
          <p class="text-surface-600 dark:text-surface-400">
            No events yet. Create your first running dinner event!
          </p>
        </div>

        <div
          v-else
          class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          <Card v-for="event in eventMetadataStore.events" :key="event.id">
            <template #title>
              {{ getGroupName(event.value.groupId) || 'Loading...' }}
            </template>
            <template #content>
              <div class="space-y-2">
                <div class="flex items-center gap-2">
                  <Badge
                    :value="formatStatus(event.value.status)"
                    :severity="getStatusSeverity(event.value.status)"
                  />
                </div>
                <div class="text-sm text-surface-600 space-y-1">
                  <p>
                    <i class="pi pi-calendar-times text-xs mr-2"></i>
                    {{ formatMenuTime(event.value.menu.starter.startTime) }}
                  </p>
                  <p>
                    <i class="pi pi-users text-xs mr-2"></i>
                    Group size: {{ event.value.preferredGroupSize }}
                  </p>
                </div>
              </div>
            </template>
            <template #footer>
              <div class="flex gap-2">
                <Button
                  label="View"
                  icon="pi pi-eye"
                  size="small"
                  outlined
                  @click="viewEvent(event)"
                />
              </div>
            </template>
          </Card>
        </div>
      </div>
    </template>

    <!-- Event Creator Dialog (Placeholder) -->
    <Dialog
      v-model:visible="showCreateDialog"
      header="Create New Event"
      :style="{ width: '90vw', maxWidth: '800px' }"
      :modal="true"
    >
      <div class="space-y-4">
        <Message severity="info" :closable="false">
          <strong>Event Creator coming soon!</strong>
          <p class="mt-1 text-sm">
            This form will allow you to create new running dinner events. For
            now, this is a placeholder.
          </p>
        </Message>
        <p class="text-sm text-surface-600">
          The EventCreator component will include fields for:
        </p>
        <ul class="list-disc list-inside text-sm text-surface-600 space-y-1">
          <li>Event name and description</li>
          <li>Event date</li>
          <li>Maximum participants</li>
          <li>Preferred group size</li>
          <li>Menu timing (starter, main course, dessert)</li>
          <li>Optional after party details</li>
        </ul>
      </div>
      <template #footer>
        <SecondaryButton label="Close" @click="showCreateDialog = false" />
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { CategoryValue } from '@churchtools-extensions/persistance';
import type { EventMetadata, Group } from '@/types/models';
import { useEventMetadataStore } from '@/stores/eventMetadata';
import { useChurchtoolsStore } from '@/stores/churchtools';
import ParentGroupSetup from '@/components/ParentGroupSetup.vue';
import Button from '@churchtools-extensions/prime-volt/Button.vue';
import Message from '@churchtools-extensions/prime-volt/Message.vue';
import Dialog from '@churchtools-extensions/prime-volt/Dialog.vue';
import Card from '@churchtools-extensions/prime-volt/Card.vue';
import Badge from '@churchtools-extensions/prime-volt/Badge.vue';
import SecondaryButton from '@churchtools-extensions/prime-volt/SecondaryButton.vue';

const eventMetadataStore = useEventMetadataStore();
const churchtoolsStore = useChurchtoolsStore();

const parentGroupSetupRef = ref<InstanceType<typeof ParentGroupSetup>>();
const showCreateDialog = ref(false);
const groupCache = ref<Map<number, Group>>(new Map());

onMounted(async () => {
  // Load child groups for event names
  await loadChildGroups();
});

async function handleParentGroupCreated() {
  // Refresh child groups after parent is created
  await loadChildGroups();
}

async function loadChildGroups() {
  try {
    const parentGroup = await churchtoolsStore.getParentGroup();
    if (parentGroup) {
      const childGroups = await churchtoolsStore.getChildGroups(parentGroup.id);
      groupCache.value.clear();
      childGroups.forEach((group) => {
        groupCache.value.set(group.id, group);
      });
    }
  } catch (error) {
    console.error('Failed to load child groups:', error);
  }
}

function getGroupName(groupId: number): string | null {
  return groupCache.value.get(groupId)?.name || null;
}

function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    active: 'Active',
    'groups-created': 'Groups Created',
    'routes-assigned': 'Routes Assigned',
    'notifications-sent': 'Notifications Sent',
    completed: 'Completed',
  };
  return statusMap[status] || status;
}

function getStatusSeverity(
  status: string,
): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
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
  return severityMap[status] || 'info';
}

function formatMenuTime(isoTime: string): string {
  try {
    const date = new Date(isoTime);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoTime;
  }
}

function viewEvent(event: CategoryValue<EventMetadata>) {
  // TODO: Implement event detail modal
  console.log('View event:', event);
}
</script>
