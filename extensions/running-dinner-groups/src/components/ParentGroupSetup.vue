<template>
  <div class="space-y-4">
    <!-- Warning Banner when parent group is missing -->
    <Message v-if="!parentGroupExists" severity="warn" :closable="false">
      <div class="flex items-center justify-between">
        <div>
          <strong>Parent group 'Running Dinner' not found.</strong>
          <p class="mt-1 text-sm">
            Please create the parent group to start organizing events.
          </p>
        </div>
        <Button
          label="Create Parent Group"
          icon="pi pi-plus"
          severity="warn"
          @click="showCreateDialog = true"
        />
      </div>
    </Message>

    <!-- Permission Error when user is not a leader -->
    <Message
      v-if="parentGroupExists && !isLeader"
      severity="error"
      :closable="false"
    >
      <strong>Permission Denied</strong>
      <p class="mt-1 text-sm">
        You must be a leader (Leiter or Co-Leiter) of the 'Running Dinner'
        parent group to use this extension.
      </p>
    </Message>

    <!-- Create Parent Group Dialog -->
    <Dialog
      v-model:visible="showCreateDialog"
      header="Create Parent Group"
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
            v-model="selectedLeader"
            :options="persons"
            option-label="displayName"
            placeholder="Select a leader"
            :loading="loadingPersons"
            :disabled="loading"
            filter
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
            v-model="selectedCoLeaders"
            :options="persons"
            option-label="displayName"
            placeholder="Select co-leaders (optional)"
            :loading="loadingPersons"
            :disabled="loading"
            filter
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
          <Button
            label="Cancel"
            severity="secondary"
            :disabled="loading"
            @click="closeCreateDialog"
          />
          <Button
            label="Create"
            icon="pi pi-check"
            :loading="loading"
            :disabled="!selectedLeader"
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
import { useChurchtoolsStore } from '@/stores/churchtools';
import type { Person } from '@/types/models';
import Button from '@churchtools-extensions/prime-volt/Button.vue';
import Dialog from '@churchtools-extensions/prime-volt/Dialog.vue';
import Fieldset from '@churchtools-extensions/prime-volt/Fieldset.vue';
import InputText from '@churchtools-extensions/prime-volt/InputText.vue';
import Message from '@churchtools-extensions/prime-volt/Message.vue';
import Multiselect from '@churchtools-extensions/prime-volt/Multiselect.vue';
import Select from '@churchtools-extensions/prime-volt/Select.vue';

const emit = defineEmits<{
  created: [];
}>();

const toast = useToast();
const churchtoolsStore = useChurchtoolsStore();

const parentGroupExists = ref(false);
const isLeader = ref(false);
const showCreateDialog = ref(false);
const loading = ref(false);
const loadingPersons = ref(false);
const error = ref<string | null>(null);

const persons = ref<(Person & { displayName: string })[]>([]);
const selectedLeader = ref<Person | null>(null);
const selectedCoLeaders = ref<Person[]>([]);

// Computed to check if user has permission
const hasPermission = computed(() => parentGroupExists.value && isLeader.value);

onMounted(async () => {
  await checkParentGroup();
  await loadPersons();

  // Auto-select current user as default leader
  if (!selectedLeader.value && persons.value.length > 0) {
    const currentUser = await churchtoolsStore.getCurrentUser();
    if (currentUser) {
      const currentPerson = persons.value.find(
        (p: Person & { displayName: string }) => p.id === currentUser.id,
      );
      if (currentPerson) {
        selectedLeader.value = currentPerson;
      }
    }
  }
});

async function checkParentGroup() {
  try {
    const result = await groupConfigService.checkParentGroup();
    parentGroupExists.value = result.exists;
    isLeader.value = result.isLeader || false;
  } catch (err) {
    console.error('Failed to check parent group:', err);
    toast.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to check parent group status',
      life: 5000,
    });
  }
}

async function loadPersons() {
  try {
    loadingPersons.value = true;
    const allPersons = await churchtoolsStore.getAllPersons();
    // Add displayName for Select component
    persons.value = allPersons.map((p: Person) => ({
      ...p,
      displayName: `${p.firstName} ${p.lastName}${p.email ? ` (${p.email})` : ''}`,
    }));
  } catch (err) {
    console.error('Failed to load persons:', err);
    error.value = 'Failed to load persons list';
  } finally {
    loadingPersons.value = false;
  }
}

async function handleCreate() {
  if (!selectedLeader.value) {
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
      leaderPersonId: selectedLeader.value.id,
      coLeaderPersonIds: selectedCoLeaders.value.map((p: Person) => p.id),
    });

    toast.add({
      severity: 'success',
      summary: 'Success',
      detail: `Parent group "Running Dinner" created successfully`,
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
        : 'Failed to create parent group. Please try again.';
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
  isLeader,
  hasPermission,
  checkParentGroup,
});
</script>
