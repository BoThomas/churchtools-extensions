<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-surface-900 dark:text-surface-50">
          Running Dinner Groups
        </h1>
        <p class="text-surface-600 dark:text-surface-400 mt-1">
          Organize running dinner events with ChurchTools groups
        </p>
      </div>
      <Button
        label="Create New Event"
        icon="pi pi-plus"
        @click="showCreateDialog = true"
        :disabled="!parentGroupReady"
      />
    </div>

    <!-- Parent Group Warning (if not found) -->
    <Message
      v-if="!parentGroupReady && !loadingParent"
      severity="warn"
      :closable="false"
    >
      <div class="flex items-center justify-between w-full">
        <span>
          Parent group "Running Dinner" not found. Please create it to start
          organizing events.
        </span>
        <Button
          label="Create Parent Group"
          icon="pi pi-plus-circle"
          severity="secondary"
          size="small"
          @click="showParentGroupDialog = true"
        />
      </div>
    </Message>

    <!-- Loading State -->
    <div v-if="loadingParent" class="text-center py-12">
      <i class="pi pi-spin pi-spinner text-3xl text-primary"></i>
      <p class="text-surface-600 dark:text-surface-400 mt-4">
        Checking parent group...
      </p>
    </div>

    <!-- Events List (placeholder) -->
    <div v-else-if="parentGroupReady" class="space-y-4">
      <div
        v-if="eventMetadataStore.events.length === 0"
        class="text-center py-12 bg-surface-50 dark:bg-surface-800 rounded-lg"
      >
        <i class="pi pi-calendar text-4xl text-surface-400 mb-4"></i>
        <p class="text-surface-600 dark:text-surface-400">
          No events yet. Create your first running dinner event!
        </p>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card v-for="event in eventMetadataStore.events" :key="event.id">
          <template #title> Event ID: {{ event.value.groupId }} </template>
          <template #content>
            <div class="space-y-2">
              <Badge :value="event.value.status" />
              <p class="text-sm text-surface-600">
                Organizer: {{ event.value.organizerId }}
              </p>
            </div>
          </template>
        </Card>
      </div>
    </div>

    <!-- Dialogs (placeholders) -->
    <Dialog
      v-model:visible="showParentGroupDialog"
      header="Create Parent Group"
      :style="{ width: '500px' }"
      modal
    >
      <p class="mb-4">
        This will create the "Running Dinner" parent group in ChurchTools.
      </p>
      <p class="text-sm text-surface-600">
        (Parent group creation wizard to be implemented in Phase 2)
      </p>
    </Dialog>

    <Dialog
      v-model:visible="showCreateDialog"
      header="Create New Event"
      :style="{ width: '600px' }"
      modal
    >
      <p class="mb-4">Create a new running dinner event.</p>
      <p class="text-sm text-surface-600">
        (Event creator form to be implemented in Phase 2)
      </p>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useEventMetadataStore } from '@/stores/eventMetadata';
import { useChuchtoolsStore } from '@/stores/churchtools';
import Button from '@churchtools-extensions/prime-volt/volt/Button.vue';
import Message from '@churchtools-extensions/prime-volt/volt/Message.vue';
import Dialog from '@churchtools-extensions/prime-volt/volt/Dialog.vue';
import Card from '@churchtools-extensions/prime-volt/volt/Card.vue';
import Badge from '@churchtools-extensions/prime-volt/volt/Badge.vue';

const eventMetadataStore = useEventMetadataStore();
const churchtoolsStore = useChuchtoolsStore();

const parentGroupReady = ref(false);
const loadingParent = ref(true);
const showParentGroupDialog = ref(false);
const showCreateDialog = ref(false);

onMounted(async () => {
  // Check if parent group exists
  try {
    const parentGroup = await churchtoolsStore.getParentGroup();
    parentGroupReady.value = parentGroup !== null;
  } catch (error) {
    console.error('Failed to check parent group:', error);
  } finally {
    loadingParent.value = false;
  }
});
</script>
