<template>
  <div class="space-y-6">
    <header class="space-y-2 max-w-4xl">
      <h2 class="text-2xl font-bold tracking-tight">Running Dinners</h2>
      <p class="text-sm text-surface-500 dark:text-surface-400 max-w-prose">
        Create and manage Running Dinners. Data persisted via ChurchTools Custom
        Modules.
      </p>
    </header>

    <div class="lg:grid lg:grid-cols-12 lg:gap-8 max-w-6xl">
      <!-- Dinners list / empty state -->
      <div class="space-y-4 lg:col-span-7">
        <section class="space-y-4" v-if="dinners.length">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-semibold">Existing Dinners</h3>
            <Button size="small" @click="startCreate" :disabled="formVisible"
              >New</Button
            >
          </div>
          <DinnerList :dinners="dinners">
            <template #actions="{ record }">
              <Button
                size="small"
                @click.stop="editDinner(record)"
                :disabled="formVisible"
                >Edit</Button
              >
              <DangerButton
                size="small"
                :disabled="formVisible || removingId === record.id"
                @click.stop="confirmDelete(record)"
                >Delete</DangerButton
              >
            </template>
          </DinnerList>
        </section>
        <section
          v-else
          class="text-sm text-surface-500 dark:text-surface-400 flex flex-col gap-4"
        >
          <div>No running dinners saved yet.</div>
          <div>
            <Button size="small" @click="startCreate" :disabled="formVisible"
              >Create first Dinner</Button
            >
          </div>
        </section>
      </div>

      <!-- Form (only when creating or editing) -->
      <div v-if="formVisible" class="mt-6 lg:mt-0 lg:col-span-5">
        <RunningDinnerForm
          :title="formTitle"
          :form="form"
          :saving="saving"
          @submit="saveDinner"
          @cancel="onCancelForm"
        />
      </div>
    </div>

    <!-- Global confirm dialog -->
    <ConfirmDialog />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue';
import { storeToRefs } from 'pinia';
import Button from '@churchtools-extensions/prime-volt/Button.vue';
import DangerButton from '@churchtools-extensions/prime-volt/DangerButton.vue';
import DinnerList from '@/components/DinnerList.vue';
import RunningDinnerForm from '@/components/RunningDinnerForm.vue';
import ConfirmDialog from '@churchtools-extensions/prime-volt/ConfirmDialog.vue';
import { useConfirm } from 'primevue/useconfirm';
import {
  useRunningDinnerStore,
  type RunningDinnerRecord,
} from '@/stores/runningDinner';

const store = useRunningDinnerStore();
const { dinners, saving } = storeToRefs(store);
const confirm = useConfirm();
const form = reactive<RunningDinnerRecord>({
  name: '',
  description: '',
  date: undefined,
  city: '',
  maxParticipants: undefined,
  allowPreferredPartners: false,
  publicSingleSignins: false,
  preferredGroupSize: 2,
  allowPreferredMeal: false,
  registrationDeadline: undefined,
  createdAt: new Date().toISOString(),
});

const removingId = ref<number | null>(null);
const formVisible = ref(false);
const formTitle = computed(() =>
  form.id ? `Edit: ${form.name || 'Running Dinner'}` : 'New Running Dinner',
);

function resetForm() {
  Object.assign(form, {
    id: undefined,
    name: '',
    description: '',
    date: undefined,
    city: '',
    maxParticipants: undefined,
    allowPreferredPartners: false,
    publicSingleSignins: false,
    preferredGroupSize: 2,
    allowPreferredMeal: false,
    registrationDeadline: undefined,
    createdAt: new Date().toISOString(),
  });
}

function startCreate() {
  resetForm();
  formVisible.value = true;
}

function onCancelForm() {
  resetForm();
  formVisible.value = false;
}

async function saveDinner() {
  if (form.id) {
    await store.update(form.id, { ...form });
  } else {
    const id = await store.create({ ...form });
    form.id = id;
  }
  // After successful save hide the form
  onCancelForm();
}

function editDinner(rec: { id: number; value: RunningDinnerRecord }) {
  Object.assign(form, rec.value);
  form.id = rec.id;
  formVisible.value = true;
}

async function removeDinner(id: number) {
  try {
    removingId.value = id;
    await store.remove(id);
    if (form.id === id) resetForm();
  } finally {
    removingId.value = null;
  }
}

function confirmDelete(rec: { id: number; value: RunningDinnerRecord }) {
  confirm.require({
    message: `Delete "${rec.value.name || 'Running Dinner'}"? This cannot be undone.`,
    header: 'Confirm Deletion',
    rejectProps: { label: 'Cancel' },
    acceptProps: { label: 'Delete' },
    accept: () => removeDinner(rec.id),
  });
}

onMounted(() => {
  store.fetchAll();
});
</script>
