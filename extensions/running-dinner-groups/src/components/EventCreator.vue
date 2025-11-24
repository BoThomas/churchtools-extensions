<template>
  <Dialog
    v-model:visible="isVisible"
    header="Create New Event"
    :style="{ width: '90vw', maxWidth: '800px', maxHeight: '90vh' }"
    :modal="true"
    @hide="handleCancel"
  >
    <form @submit.prevent="handleSubmit" class="space-y-6">
      <!-- Basic Information Section -->
      <Fieldset legend="Basic Information">
        <div class="space-y-4">
          <!-- Event Name -->
          <div class="flex flex-col gap-2">
            <label for="event-name" class="font-semibold text-sm">
              Event Name <span class="text-red-500">*</span>
            </label>
            <InputText
              id="event-name"
              v-model="formData.name"
              placeholder="e.g., Running Dinner - December 2025"
              :invalid="!!errors.name"
            />
            <small v-if="errors.name" class="text-red-500">{{
              errors.name
            }}</small>
          </div>

          <!-- Description -->
          <div class="flex flex-col gap-2">
            <label for="event-description" class="font-semibold text-sm">
              Description
            </label>
            <textarea
              id="event-description"
              v-model="formData.description"
              rows="3"
              placeholder="Describe the event..."
              class="p-inputtext p-component"
              :class="{ 'p-invalid': !!errors.description }"
            />
            <small v-if="errors.description" class="text-red-500">{{
              errors.description
            }}</small>
          </div>

          <!-- Event Date -->
          <div class="flex flex-col gap-2">
            <label for="event-date" class="font-semibold text-sm">
              Event Date <span class="text-red-500">*</span>
            </label>
            <DatePicker
              id="event-date"
              v-model="formData.date"
              dateFormat="dd/mm/yy"
              placeholder="Select event date"
              :invalid="!!errors.date"
            />
            <small v-if="errors.date" class="text-red-500">{{
              errors.date
            }}</small>
          </div>
        </div>
      </Fieldset>

      <!-- Configuration Section -->
      <Fieldset legend="Configuration">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Max Participants -->
          <div class="flex flex-col gap-2">
            <label for="max-members" class="font-semibold text-sm">
              Max Participants <span class="text-red-500">*</span>
            </label>
            <InputNumber
              id="max-members"
              v-model="formData.maxMembers"
              :min="6"
              :step="1"
              placeholder="e.g., 30"
              :invalid="!!errors.maxMembers"
            />
            <small v-if="errors.maxMembers" class="text-red-500">{{
              errors.maxMembers
            }}</small>
          </div>

          <!-- Preferred Group Size -->
          <div class="flex flex-col gap-2">
            <label for="group-size" class="font-semibold text-sm">
              Preferred Group Size <span class="text-red-500">*</span>
            </label>
            <InputNumber
              id="group-size"
              v-model="formData.preferredGroupSize"
              :min="2"
              :max="4"
              :step="1"
              placeholder="e.g., 2"
              :invalid="!!errors.preferredGroupSize"
            />
            <small v-if="errors.preferredGroupSize" class="text-red-500">{{
              errors.preferredGroupSize
            }}</small>
          </div>
        </div>

        <!-- Partner Preferences Option -->
        <div
          class="flex items-start gap-3 p-4 mt-4 bg-surface-50 dark:bg-surface-800 rounded-lg"
        >
          <Checkbox
            id="allow-partner-preferences"
            v-model="formData.allowPartnerPreferences"
            binary
          />
          <div class="flex-1">
            <label
              for="allow-partner-preferences"
              class="font-semibold text-sm cursor-pointer"
            >
              Allow Partner Preferences
            </label>
            <p class="text-xs text-surface-500 mt-1">
              When enabled, participants can specify other people they'd like to
              be grouped with during registration. The grouping algorithm will
              try to respect these preferences when creating dinner groups.
            </p>
          </div>
        </div>
      </Fieldset>

      <!-- Menu Timing Section -->
      <Fieldset legend="Menu Timing">
        <div class="space-y-4">
          <!-- Starter -->
          <div class="flex flex-col gap-2">
            <label class="font-semibold text-sm">
              Starter <span class="text-red-500">*</span>
            </label>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="starter-start" class="text-xs text-surface-500">
                  Start Time
                </label>
                <DatePicker
                  id="starter-start"
                  v-model="formData.menu.starter.startTime"
                  timeOnly
                  hourFormat="24"
                  placeholder="e.g., 18:00"
                  :invalid="!!errors.starterStartTime"
                />
                <small v-if="errors.starterStartTime" class="text-red-500">{{
                  errors.starterStartTime
                }}</small>
              </div>
              <div>
                <label for="starter-end" class="text-xs text-surface-500">
                  End Time
                </label>
                <DatePicker
                  id="starter-end"
                  v-model="formData.menu.starter.endTime"
                  timeOnly
                  hourFormat="24"
                  placeholder="e.g., 19:30"
                  :invalid="!!errors.starterEndTime"
                />
                <small v-if="errors.starterEndTime" class="text-red-500">{{
                  errors.starterEndTime
                }}</small>
              </div>
            </div>
          </div>

          <!-- Main Course -->
          <div class="flex flex-col gap-2">
            <label class="font-semibold text-sm">
              Main Course <span class="text-red-500">*</span>
            </label>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="main-start" class="text-xs text-surface-500">
                  Start Time
                </label>
                <DatePicker
                  id="main-start"
                  v-model="formData.menu.mainCourse.startTime"
                  timeOnly
                  hourFormat="24"
                  placeholder="e.g., 20:00"
                  :invalid="!!errors.mainStartTime"
                />
                <small v-if="errors.mainStartTime" class="text-red-500">{{
                  errors.mainStartTime
                }}</small>
              </div>
              <div>
                <label for="main-end" class="text-xs text-surface-500">
                  End Time
                </label>
                <DatePicker
                  id="main-end"
                  v-model="formData.menu.mainCourse.endTime"
                  timeOnly
                  hourFormat="24"
                  placeholder="e.g., 21:30"
                  :invalid="!!errors.mainEndTime"
                />
                <small v-if="errors.mainEndTime" class="text-red-500">{{
                  errors.mainEndTime
                }}</small>
              </div>
            </div>
          </div>

          <!-- Dessert -->
          <div class="flex flex-col gap-2">
            <label class="font-semibold text-sm">
              Dessert <span class="text-red-500">*</span>
            </label>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label for="dessert-start" class="text-xs text-surface-500">
                  Start Time
                </label>
                <DatePicker
                  id="dessert-start"
                  v-model="formData.menu.dessert.startTime"
                  timeOnly
                  hourFormat="24"
                  placeholder="e.g., 22:00"
                  :invalid="!!errors.dessertStartTime"
                />
                <small v-if="errors.dessertStartTime" class="text-red-500">{{
                  errors.dessertStartTime
                }}</small>
              </div>
              <div>
                <label for="dessert-end" class="text-xs text-surface-500">
                  End Time
                </label>
                <DatePicker
                  id="dessert-end"
                  v-model="formData.menu.dessert.endTime"
                  timeOnly
                  hourFormat="24"
                  placeholder="e.g., 23:30"
                  :invalid="!!errors.dessertEndTime"
                />
                <small v-if="errors.dessertEndTime" class="text-red-500">{{
                  errors.dessertEndTime
                }}</small>
              </div>
            </div>
          </div>
        </div>
      </Fieldset>

      <!-- After Party Section (Optional) -->
      <Fieldset legend="After Party (Optional)">
        <div class="space-y-4">
          <div class="flex items-center gap-2">
            <Checkbox id="has-after-party" v-model="hasAfterParty" binary />
            <label for="has-after-party" class="font-semibold text-sm">
              Include after party
            </label>
          </div>

          <template v-if="hasAfterParty">
            <!-- After Party Time -->
            <div class="flex flex-col gap-2">
              <label for="after-party-time" class="font-semibold text-sm">
                Time
              </label>
              <DatePicker
                id="after-party-time"
                v-model="formData.afterParty.time"
                timeOnly
                hourFormat="24"
                placeholder="e.g., 00:00"
              />
            </div>

            <!-- After Party Location -->
            <div class="flex flex-col gap-2">
              <label for="after-party-location" class="font-semibold text-sm">
                Location
              </label>
              <InputText
                id="after-party-location"
                v-model="formData.afterParty.location"
                placeholder="e.g., Bar Central"
              />
            </div>

            <!-- After Party Description -->
            <div class="flex flex-col gap-2">
              <label
                for="after-party-description"
                class="font-semibold text-sm"
              >
                Description
              </label>
              <textarea
                id="after-party-description"
                v-model="formData.afterParty.description"
                rows="2"
                placeholder="Additional details about the after party..."
                class="p-inputtext p-component"
              />
            </div>
          </template>
        </div>
      </Fieldset>

      <!-- Error Message -->
      <Message v-if="generalError" severity="error" :closable="true">
        {{ generalError }}
      </Message>
    </form>

    <template #footer>
      <div class="flex justify-end gap-2">
        <SecondaryButton
          label="Cancel"
          @click="handleCancel"
          :disabled="loading"
        />
        <Button
          label="Create Event"
          icon="pi pi-check"
          @click="handleSubmit"
          :loading="loading"
        />
      </div>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue';
import { z } from 'zod';
import { GroupConfigService } from '@/services/GroupConfigService';
import { useChurchtoolsStore } from '@/stores/churchtools';
import { useEventMetadataStore } from '@/stores/eventMetadata';
import { useToast } from 'primevue/usetoast';
import Dialog from '@churchtools-extensions/prime-volt/Dialog.vue';
import Button from '@churchtools-extensions/prime-volt/Button.vue';
import SecondaryButton from '@churchtools-extensions/prime-volt/SecondaryButton.vue';
import Fieldset from '@churchtools-extensions/prime-volt/Fieldset.vue';
import InputText from '@churchtools-extensions/prime-volt/InputText.vue';
import InputNumber from '@churchtools-extensions/prime-volt/InputNumber.vue';
// @ts-ignore - DatePicker type definition issue
import DatePicker from '@churchtools-extensions/prime-volt/DatePicker.vue';
import Checkbox from '@churchtools-extensions/prime-volt/Checkbox.vue';
import Message from '@churchtools-extensions/prime-volt/Message.vue';

// Props
interface Props {
  visible: boolean;
  parentGroupId: number;
}

const props = defineProps<Props>();

// Emits
interface Emits {
  (e: 'update:visible', value: boolean): void;
  (e: 'created', groupId: number): void;
}

const emit = defineEmits<Emits>();

// Composables
const toast = useToast();
const churchtoolsStore = useChurchtoolsStore();
const eventMetadataStore = useEventMetadataStore();

// State
const loading = ref(false);
const generalError = ref<string | null>(null);
const hasAfterParty = ref(false);

// Form data
const formData = reactive({
  name: '',
  description: '',
  date: null as Date | null,
  maxMembers: 30,
  preferredGroupSize: 2,
  allowPartnerPreferences: false,
  menu: {
    starter: {
      startTime: null as Date | null,
      endTime: null as Date | null,
    },
    mainCourse: {
      startTime: null as Date | null,
      endTime: null as Date | null,
    },
    dessert: {
      startTime: null as Date | null,
      endTime: null as Date | null,
    },
  },
  afterParty: {
    time: null as Date | null,
    location: '',
    description: '',
  },
});

// Validation errors
const errors = reactive({
  name: '',
  description: '',
  date: '',
  maxMembers: '',
  preferredGroupSize: '',
  starterStartTime: '',
  starterEndTime: '',
  mainStartTime: '',
  mainEndTime: '',
  dessertStartTime: '',
  dessertEndTime: '',
});

// Computed
const isVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value),
});

// Validation schema
const eventSchema = z.object({
  name: z.string().min(1, 'Event name is required'),
  description: z.string().optional(),
  date: z.date({ message: 'Event date is required' }),
  maxMembers: z
    .number()
    .min(6, 'At least 6 participants needed')
    .int('Must be a whole number'),
  preferredGroupSize: z
    .number()
    .min(2, 'Group size must be at least 2')
    .max(4, 'Group size cannot exceed 4')
    .int('Must be a whole number'),
  menu: z.object({
    starter: z.object({
      startTime: z.date({ message: 'Start time is required' }),
      endTime: z.date({ message: 'End time is required' }),
    }),
    mainCourse: z.object({
      startTime: z.date({ message: 'Start time is required' }),
      endTime: z.date({ message: 'End time is required' }),
    }),
    dessert: z.object({
      startTime: z.date({ message: 'Start time is required' }),
      endTime: z.date({ message: 'End time is required' }),
    }),
  }),
});

// Watch hasAfterParty to clear after party data
watch(hasAfterParty, (value) => {
  if (!value) {
    formData.afterParty.time = null;
    formData.afterParty.location = '';
    formData.afterParty.description = '';
  }
});

// Methods
function clearErrors() {
  Object.keys(errors).forEach((key) => {
    errors[key as keyof typeof errors] = '';
  });
  generalError.value = null;
}

function resetForm() {
  formData.name = '';
  formData.description = '';
  formData.date = null;
  formData.maxMembers = 30;
  formData.preferredGroupSize = 2;
  formData.allowPartnerPreferences = false;
  formData.menu.starter.startTime = null;
  formData.menu.starter.endTime = null;
  formData.menu.mainCourse.startTime = null;
  formData.menu.mainCourse.endTime = null;
  formData.menu.dessert.startTime = null;
  formData.menu.dessert.endTime = null;
  hasAfterParty.value = false;
  formData.afterParty.time = null;
  formData.afterParty.location = '';
  formData.afterParty.description = '';
  clearErrors();
}

function handleCancel() {
  resetForm();
  isVisible.value = false;
}

function combineDateTime(date: Date, time: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(time.getHours()).padStart(2, '0');
  const minutes = String(time.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}:00`;
}

async function handleSubmit() {
  clearErrors();

  try {
    // Validate form data
    const validatedData = eventSchema.parse(formData);

    // Get current user
    const currentUser = await churchtoolsStore.getCurrentUser();

    if (!currentUser) {
      throw new Error('Could not get current user');
    }

    loading.value = true;

    // Combine date and times into ISO strings
    const menu = {
      starter: {
        startTime: combineDateTime(
          validatedData.date,
          validatedData.menu.starter.startTime,
        ),
        endTime: combineDateTime(
          validatedData.date,
          validatedData.menu.starter.endTime,
        ),
      },
      mainCourse: {
        startTime: combineDateTime(
          validatedData.date,
          validatedData.menu.mainCourse.startTime,
        ),
        endTime: combineDateTime(
          validatedData.date,
          validatedData.menu.mainCourse.endTime,
        ),
      },
      dessert: {
        startTime: combineDateTime(
          validatedData.date,
          validatedData.menu.dessert.startTime,
        ),
        endTime: combineDateTime(
          validatedData.date,
          validatedData.menu.dessert.endTime,
        ),
      },
    };

    // Prepare after party data if enabled
    let afterParty = undefined;
    if (
      hasAfterParty.value &&
      formData.afterParty.time &&
      formData.afterParty.location
    ) {
      afterParty = {
        time: combineDateTime(validatedData.date, formData.afterParty.time),
        location: formData.afterParty.location,
        description: formData.afterParty.description || undefined,
      };
    }

    // Create child group using GroupConfigService
    const groupConfigService = new GroupConfigService();
    const groupId = await groupConfigService.createChildGroup({
      parentGroupId: props.parentGroupId,
      name: validatedData.name,
      description: validatedData.description || '',
      date: validatedData.date.toISOString(),
      maxMembers: validatedData.maxMembers,
      organizerId: currentUser.id,
      preferredGroupSize: validatedData.preferredGroupSize,
      allowPartnerPreferences: formData.allowPartnerPreferences,
      menu,
      afterParty,
    });

    // Reload event metadata
    await eventMetadataStore.fetchAll();

    // Show success message
    toast.add({
      severity: 'success',
      summary: 'Event Created',
      detail: `Event "${validatedData.name}" has been created successfully.`,
      life: 5000,
    });

    // Emit created event
    emit('created', groupId);

    // Reset and close
    resetForm();
    isVisible.value = false;
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Handle validation errors
      error.issues.forEach((err: z.ZodIssue) => {
        const path = err.path.join('.');
        if (path === 'name') errors.name = err.message;
        else if (path === 'description') errors.description = err.message;
        else if (path === 'date') errors.date = err.message;
        else if (path === 'maxMembers') errors.maxMembers = err.message;
        else if (path === 'preferredGroupSize')
          errors.preferredGroupSize = err.message;
        else if (path === 'menu.starter.startTime')
          errors.starterStartTime = err.message;
        else if (path === 'menu.starter.endTime')
          errors.starterEndTime = err.message;
        else if (path === 'menu.mainCourse.startTime')
          errors.mainStartTime = err.message;
        else if (path === 'menu.mainCourse.endTime')
          errors.mainEndTime = err.message;
        else if (path === 'menu.dessert.startTime')
          errors.dessertStartTime = err.message;
        else if (path === 'menu.dessert.endTime')
          errors.dessertEndTime = err.message;
      });
    } else {
      // Handle general errors
      console.error('Failed to create event:', error);
      generalError.value =
        error instanceof Error
          ? error.message
          : 'Failed to create event. Please try again.';

      toast.add({
        severity: 'error',
        summary: 'Error',
        detail: generalError.value,
        life: 5000,
      });
    }
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
textarea.p-inputtext {
  resize: vertical;
}

textarea.p-invalid {
  border-color: var(--red-500);
}
</style>
