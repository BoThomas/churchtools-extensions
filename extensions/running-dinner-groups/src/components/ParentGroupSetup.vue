<template>
  <div class="space-y-4">
    <!-- Warning Banner when parent group is missing -->
    <div v-if="!parentGroupExists" class="space-y-4">
      <Message severity="warn" :closable="false">
        <strong>Parent group 'Running Dinner' not found.</strong>
        <p class="mt-1 text-sm">
          Please create the parent group to start organizing events.
        </p>
      </Message>
      <Button
        label="Create Parent Group"
        icon="pi pi-plus"
        severity="warn"
        @click="showCreateDialog = true"
      />
    </div>

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
            dataKey="id"
            placeholder="Select a leader"
            :loading="loadingPersons"
            :disabled="loading"
            filter
            @filter="filterPersons"
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
            dataKey="id"
            placeholder="Select co-leaders (optional)"
            :loading="loadingPersons"
            :disabled="loading"
            filter
            @filter="filterPersons"
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
            :disabled="!selectedLeader"
            @click="handleCreate"
          />
        </div>
      </template>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
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
import SecondaryButton from '@churchtools-extensions/prime-volt/SecondaryButton.vue';
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

// Protected persons that should never be removed from the list
const protectedPersons = ref<Map<number, Person & { displayName: string }>>(
  new Map(),
);

// Debounce timer for search
let filterTimeout: ReturnType<typeof setTimeout> | null = null;

// Computed to check if user has permission
const hasPermission = computed(() => parentGroupExists.value && isLeader.value);

// Helper to create person with display name
function createPersonWithDisplay(
  person: Person,
): Person & { displayName: string } {
  return {
    ...person,
    displayName: `${person.firstName} ${person.lastName}${person.email ? ` (${person.email})` : ''}`,
  };
}

// Helper to add person to protected list
function addProtectedPerson(person: Person & { displayName: string }) {
  protectedPersons.value.set(person.id, person);
}

// Helper to merge search results with protected persons
function mergePersons(
  searchResults: Person[],
): (Person & { displayName: string })[] {
  const resultsWithDisplay = searchResults.map(createPersonWithDisplay);

  // Create a map for deduplication
  const personMap = new Map<number, Person & { displayName: string }>();

  // Add protected persons first (they appear at the top)
  protectedPersons.value.forEach((person) => {
    personMap.set(person.id, person);
  });

  // Add search results
  resultsWithDisplay.forEach((person) => {
    if (!personMap.has(person.id)) {
      personMap.set(person.id, person);
    }
  });

  return Array.from(personMap.values());
}

// Watch for selection changes to update protected persons
watch(selectedLeader, (newLeader) => {
  if (newLeader) {
    addProtectedPerson(newLeader as Person & { displayName: string });
  }
});

watch(selectedCoLeaders, (newCoLeaders) => {
  newCoLeaders.forEach((coLeader) => {
    addProtectedPerson(coLeader as Person & { displayName: string });
  });
});

onMounted(async () => {
  await checkParentGroup();

  // Load current user first and protect them
  const currentUser = await churchtoolsStore.getCurrentUser();
  if (currentUser) {
    const currentPersonWithDisplay = createPersonWithDisplay(currentUser);
    addProtectedPerson(currentPersonWithDisplay);
    selectedLeader.value = currentPersonWithDisplay;
  }

  // Load initial batch of persons (200)
  await loadPersons();
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

async function loadPersons(query: string = '') {
  try {
    loadingPersons.value = true;
    const limit = query ? 20 : 200; // 20 for search, 200 for initial load
    const searchResults = await churchtoolsStore.searchPersons(query, 1, limit);

    // Add initial load results to protected list
    if (!query) {
      searchResults.forEach((person) => {
        addProtectedPerson(createPersonWithDisplay(person));
      });
    }

    persons.value = mergePersons(searchResults);
  } catch (err) {
    console.error('Failed to load persons:', err);
    error.value = 'Failed to load persons list';
  } finally {
    loadingPersons.value = false;
  }
}

async function filterPersons(event: { value: string }) {
  // Clear existing timeout
  if (filterTimeout) {
    clearTimeout(filterTimeout);
  }

  // Show loading immediately
  loadingPersons.value = true;

  // Debounce the API call - wait 600ms after user stops typing
  filterTimeout = setTimeout(async () => {
    await loadPersons(event.value);
  }, 600);
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
