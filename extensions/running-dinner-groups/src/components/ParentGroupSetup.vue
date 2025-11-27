<template>
  <div class="space-y-4">
    <!-- Loading State -->
    <div v-if="checking" class="flex justify-center py-8">
      <i class="pi pi-spin pi-spinner text-4xl text-primary"></i>
    </div>

    <!-- Warning Banner when organizer group is missing -->
    <div v-else-if="!parentGroupExists" class="space-y-4">
      <Message severity="warn" :closable="false">
        <strong>Organizer group 'Running Dinner' not found.</strong>
        <p class="mt-1 text-sm">
          Please create the organizer group to start planning events.
        </p>
      </Message>
      <Button
        label="Create Organizer Group"
        icon="pi pi-plus"
        severity="warn"
        @click="showCreateDialog = true"
      />
    </div>

    <!-- Permission Error when user is not a leader -->
    <Message
      v-else-if="parentGroupExists && !isLeader"
      severity="error"
      :closable="false"
    >
      <strong>Permission Denied</strong>
      <p class="mt-1 text-sm">
        You must be a member of the 'Running Dinner' organizer group to use this
        extension.
      </p>
    </Message>

    <!-- Create Organizer Group Dialog -->
    <Dialog
      v-model:visible="showCreateDialog"
      header="Create Organizer Group"
      :modal="true"
      :style="{ width: '90vw', maxWidth: '600px' }"
      :closable="!loading"
      :close-on-escape="!loading"
    >
      <div class="space-y-4">
        <!-- Group Name (read-only) -->
        <div>
          <label class="block text-sm font-medium mb-2">Group Name</label>
          <InputText
            :model-value="'Running Dinner'"
            :disabled="true"
            class="w-full"
          />
          <small class="text-surface-500"> This name cannot be changed </small>
        </div>

        <!-- Leader Selection -->
        <div>
          <label class="block text-sm font-medium mb-2">
            Leader (Leiter) <span class="text-red-500">*</span>
          </label>
          <Select
            v-model="personSelector.selectedLeader.value"
            :options="personSelector.availableLeaders.value"
            option-label="displayName"
            dataKey="id"
            placeholder="Select a leader"
            :loading="personSelector.loadingPersons.value"
            :disabled="loading"
            filter
            @filter="personSelector.filterPersons"
            class="w-full"
          />
          <small class="text-surface-500">
            The main leader of the Running Dinner organization
          </small>
        </div>

        <!-- Co-Leaders Selection -->
        <div>
          <label class="block text-sm font-medium mb-2">
            Co-Leaders (Co-Leiter)
          </label>
          <Multiselect
            v-model="personSelector.selectedCoLeaders.value"
            :options="personSelector.availableCoLeaders.value"
            option-label="displayName"
            dataKey="id"
            placeholder="Select co-leaders (optional)"
            :loading="personSelector.loadingPersons.value"
            :disabled="loading"
            filter
            @filter="personSelector.filterPersons"
            class="w-full"
          />
          <small class="text-surface-500">
            Additional leaders who can help organize events
          </small>
        </div>

        <!-- Settings Preview -->
        <Fieldset legend="Group Settings Preview" :toggleable="true">
          <div class="text-sm space-y-2">
            <div class="flex justify-between">
              <span class="text-surface-600">Group Type:</span>
              <strong>Dienst (Service)</strong>
            </div>
            <div class="flex justify-between">
              <span class="text-surface-600">Members can join:</span>
              <strong>No</strong>
            </div>
            <div class="flex justify-between">
              <span class="text-surface-600">Public visibility:</span>
              <strong>Not public</strong>
            </div>
            <div class="flex justify-between">
              <span class="text-surface-600">Visible to members:</span>
              <strong>Yes</strong>
            </div>
            <div class="flex justify-between">
              <span class="text-surface-600">Active roles:</span>
              <strong>Leiter & Co-Leiter only</strong>
            </div>
          </div>
        </Fieldset>

        <!-- Error Message -->
        <Message v-if="error" severity="error" :closable="true">
          {{ error }}
        </Message>
      </div>

      <template #footer>
        <div class="flex justify-end gap-2">
          <SecondaryButton
            label="Cancel"
            :disabled="loading"
            @click="closeCreateDialog"
          />
          <Button
            label="Create"
            icon="pi pi-check"
            :loading="loading"
            :disabled="!personSelector.selectedLeader.value"
            @click="handleCreate"
          />
        </div>
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useToast } from 'primevue/usetoast';
import { groupConfigService } from '@/services/GroupConfigService';
import { usePersonSelector } from '@/composables/usePersonSelector';
import Button from '@churchtools-extensions/prime-volt/Button.vue';
import Dialog from '@churchtools-extensions/prime-volt/Dialog.vue';
import Fieldset from '@churchtools-extensions/prime-volt/Fieldset.vue';
import InputText from '@churchtools-extensions/prime-volt/InputText.vue';
import Message from '@churchtools-extensions/prime-volt/Message.vue';
import Multiselect from '@churchtools-extensions/prime-volt/Multiselect.vue';
import SecondaryButton from '@churchtools-extensions/prime-volt/SecondaryButton.vue';
import Select from '@churchtools-extensions/prime-volt/Select.vue';

const emit = defineEmits<{
  created: [];
}>();

const toast = useToast();

// Person selector composable (auto-selects current user as leader)
const personSelector = usePersonSelector({
  autoSelectCurrentUser: true,
});

const checking = ref(true);
const parentGroupExists = ref(false);
const parentGroupId = ref<number | null>(null);
const isLeader = ref(false);
const showCreateDialog = ref(false);
const loading = ref(false);
const error = ref<string | null>(null);

// Computed to check if user has permission
const hasPermission = computed(() => parentGroupExists.value && isLeader.value);

onMounted(async () => {
  await checkParentGroup();

  // Initialize person selector (loads current user and persons)
  await personSelector.initialize();
});

async function checkParentGroup() {
  checking.value = true;
  try {
    const result = await groupConfigService.checkParentGroup();
    parentGroupExists.value = result.exists;
    parentGroupId.value = result.group?.id || null;
    isLeader.value = result.isLeader || false;
  } catch (err) {
    console.error('Failed to check parent group:', err);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to check parent group status',
      life: 5000,
    });
  } finally {
    checking.value = false;
  }
}

async function handleCreate() {
  if (!personSelector.selectedLeader.value) {
    toast.add({
      severity: 'warn',
      summary: 'Validation Error',
      detail: 'Please select a leader',
      life: 3000,
    });
    return;
  }

  try {
    loading.value = true;
    error.value = null;

    await groupConfigService.createParentGroup({
      leaderPersonId: personSelector.selectedLeader.value.id,
      coLeaderPersonIds: personSelector.coLeaderIds.value,
    });

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: `Organizer group "Running Dinner" created successfully`,
      life: 5000,
    });

    // Refresh parent group status
    await checkParentGroup();

    // Close dialog and notify parent
    closeCreateDialog();
    emit('created');
  } catch (err) {
    console.error('Failed to create parent group:', err);
    error.value =
      err instanceof Error
        ? err.message
        : 'Failed to create organizer group. Please try again.';
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: error.value,
      life: 5000,
    });
  } finally {
    loading.value = false;
  }
}

function closeCreateDialog() {
  showCreateDialog.value = false;
  error.value = null;
  // Don't reset selections in case user wants to try again
}

defineExpose({
  parentGroupExists,
  parentGroupId,
  isLeader,
  hasPermission,
  checkParentGroup,
});
</script>
