<template>
  <form @submit.prevent="handleSubmit" class="space-y-6">
    <Fieldset>
      <template #legend>
        <div class="flex items-center gap-2">
          <i class="pi pi-info-circle"></i>
          <span class="font-semibold">Basic Information</span>
        </div>
      </template>
      <div class="space-y-4">
        <div class="flex flex-col gap-2">
          <label for="name" class="font-medium text-sm">Event Name *</label>
          <InputText
            id="name"
            v-model="formData.name"
            placeholder="e.g., Summer Running Dinner 2025"
            :invalid="!!errors.name"
          />
          <small v-if="errors.name" class="text-red-500">{{
            errors.name
          }}</small>
        </div>

        <div class="flex flex-col gap-2">
          <label for="description" class="font-medium text-sm"
            >Description</label
          >
          <InputText
            id="description"
            v-model="formData.description"
            placeholder="Brief description of the event"
          />
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="flex flex-col gap-2">
            <label for="date" class="font-medium text-sm">Event Date *</label>
            <DatePicker
              id="date"
              v-model="formData.date"
              dateFormat="yy-mm-dd"
              :invalid="!!errors.date"
            />
            <small v-if="errors.date" class="text-red-500">{{
              errors.date
            }}</small>
          </div>

          <div class="flex flex-col gap-2">
            <label for="city" class="font-medium text-sm">City *</label>
            <InputText
              id="city"
              v-model="formData.city"
              placeholder="e.g., Munich"
              :invalid="!!errors.city"
            />
            <small v-if="errors.city" class="text-red-500">{{
              errors.city
            }}</small>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="flex flex-col gap-2">
            <label for="maxParticipants" class="font-medium text-sm"
              >Max Participants *</label
            >
            <InputNumber
              id="maxParticipants"
              v-model="formData.maxParticipants"
              :min="6"
              :invalid="!!errors.maxParticipants"
            />
            <small v-if="errors.maxParticipants" class="text-red-500">{{
              errors.maxParticipants
            }}</small>
          </div>

          <div class="flex flex-col gap-2">
            <label for="registrationDeadline" class="font-medium text-sm"
              >Registration Deadline *</label
            >
            <DatePicker
              id="registrationDeadline"
              v-model="formData.registrationDeadline"
              dateFormat="yy-mm-dd"
              :invalid="!!errors.registrationDeadline"
            />
            <small v-if="errors.registrationDeadline" class="text-red-500">{{
              errors.registrationDeadline
            }}</small>
          </div>
        </div>
      </div>
    </Fieldset>

    <Fieldset>
      <template #legend>
        <div class="flex items-center gap-2">
          <i class="pi pi-sliders-h"></i>
          <span class="font-semibold">Preferences</span>
        </div>
      </template>
      <div class="space-y-4">
        <div class="flex flex-col gap-2 max-w-[300px]">
          <label for="preferredGroupSize" class="font-medium text-sm"
            >Preferred Group Size</label
          >
          <InputNumber
            id="preferredGroupSize"
            v-model="formData.preferredGroupSize"
            :min="2"
            :max="6"
          />
        </div>

        <div class="flex items-center gap-3">
          <Checkbox
            inputId="allowPreferredPartners"
            v-model="formData.allowPreferredPartners"
            :binary="true"
          />
          <label
            for="allowPreferredPartners"
            class="font-medium text-sm cursor-pointer"
          >
            Allow participants to specify preferred partners
          </label>
        </div>

        <div class="flex items-center gap-3">
          <Checkbox
            inputId="publicSingleSignins"
            v-model="formData.publicSingleSignins"
            :binary="true"
          />
          <label
            for="publicSingleSignins"
            class="font-medium text-sm cursor-pointer"
          >
            Show single registrations publicly
          </label>
        </div>

        <div class="flex items-center gap-3">
          <Checkbox
            inputId="allowPreferredMeal"
            v-model="formData.allowPreferredMeal"
            :binary="true"
          />
          <label
            for="allowPreferredMeal"
            class="font-medium text-sm cursor-pointer"
          >
            Allow meal preferences
          </label>
        </div>
      </div>
    </Fieldset>

    <Fieldset>
      <template #legend>
        <div class="flex items-center gap-2">
          <i class="pi pi-clock"></i>
          <span class="font-semibold">Menu Times</span>
        </div>
      </template>
      <div class="space-y-4">
        <Fieldset legend="Starter">
          <div class="flex items-stretch max-w-sm">
            <span
              class="flex items-center justify-center px-3 border-y border-s border-surface-300 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-surface-600 dark:text-surface-400 rounded-s-md text-sm"
            >
              from
            </span>
            <InputText
              v-model="formData.menu.starter.startTime"
              type="time"
              pt:root="flex-1 rounded-none"
            />
            <span
              class="flex items-center justify-center px-3 border-y border-surface-300 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-surface-600 dark:text-surface-400 text-sm"
            >
              to
            </span>
            <InputText
              v-model="formData.menu.starter.endTime"
              type="time"
              pt:root="flex-1 rounded-s-none rounded-e-md"
            />
          </div>
        </Fieldset>

        <Fieldset legend="Main Course">
          <div class="flex items-stretch max-w-sm">
            <span
              class="flex items-center justify-center px-3 border-y border-s border-surface-300 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-surface-600 dark:text-surface-400 rounded-s-md text-sm"
            >
              from
            </span>
            <InputText
              v-model="formData.menu.mainCourse.startTime"
              type="time"
              pt:root="flex-1 rounded-none"
            />
            <span
              class="flex items-center justify-center px-3 border-y border-surface-300 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-surface-600 dark:text-surface-400 text-sm"
            >
              to
            </span>
            <InputText
              v-model="formData.menu.mainCourse.endTime"
              type="time"
              pt:root="flex-1 rounded-s-none rounded-e-md"
            />
          </div>
        </Fieldset>

        <Fieldset legend="Dessert">
          <div class="flex items-stretch max-w-sm">
            <span
              class="flex items-center justify-center px-3 border-y border-s border-surface-300 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-surface-600 dark:text-surface-400 rounded-s-md text-sm"
            >
              from
            </span>
            <InputText
              v-model="formData.menu.dessert.startTime"
              type="time"
              pt:root="flex-1 rounded-none"
            />
            <span
              class="flex items-center justify-center px-3 border-y border-surface-300 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-surface-600 dark:text-surface-400 text-sm"
            >
              to
            </span>
            <InputText
              v-model="formData.menu.dessert.endTime"
              type="time"
              pt:root="flex-1 rounded-s-none rounded-e-md"
            />
          </div>
        </Fieldset>
      </div>
    </Fieldset>

    <Fieldset>
      <template #legend>
        <div class="flex items-center gap-2">
          <i class="pi pi-star"></i>
          <span class="font-semibold">After Party (Optional)</span>
        </div>
      </template>
      <div class="flex flex-col md:flex-row gap-4">
        <div class="flex flex-col gap-2 md:w-[200px]">
          <label for="afterPartyTime" class="font-medium text-sm">Time</label>
          <InputText id="afterPartyTime" v-model="afterPartyTime" type="time" />
        </div>

        <div class="flex flex-col gap-2 flex-1">
          <label for="afterPartyLocation" class="font-medium text-sm"
            >Location</label
          >
          <InputText
            id="afterPartyLocation"
            v-model="afterPartyLocation"
            placeholder="e.g., City Bar, Main Street 10"
          />
        </div>
      </div>
    </Fieldset>

    <Fieldset>
      <template #legend>
        <div class="flex items-center gap-2">
          <i class="pi pi-comment"></i>
          <span class="font-semibold">Additional Information</span>
        </div>
      </template>
      <div class="flex flex-col gap-2">
        <label for="participantInfo" class="font-medium text-sm">
          Info for Participants
        </label>
        <InputText
          id="participantInfo"
          v-model="formData.participantInfo"
          placeholder="Any additional information participants should know"
        />
      </div>
    </Fieldset>

    <div
      v-if="validationMessage"
      class="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md"
    >
      <pre
        class="text-red-600 dark:text-red-400 text-sm font-medium whitespace-pre-wrap"
        >{{ validationMessage }}</pre
      >
    </div>

    <div class="flex gap-3 justify-end">
      <Button
        type="button"
        label="Cancel"
        severity="secondary"
        outlined
        @click="$emit('cancel')"
      />
      <Button
        type="submit"
        :label="submitLabel"
        icon="pi pi-save"
        :loading="saving"
      />
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue';
import { z } from 'zod';
import type { RunningDinner } from '../types/models';
import { RunningDinnerSchema } from '../types/models';

import Button from '@churchtools-extensions/prime-volt/Button.vue';
import InputText from '@churchtools-extensions/prime-volt/InputText.vue';
import InputNumber from '@churchtools-extensions/prime-volt/InputNumber.vue';
import DatePicker from '@churchtools-extensions/prime-volt/DatePicker.vue';
import Checkbox from '@churchtools-extensions/prime-volt/Checkbox.vue';
import Fieldset from '@churchtools-extensions/prime-volt/Fieldset.vue';

interface Props {
  initialData?: RunningDinner;
  saving?: boolean;
  organizerId: number;
  initialGroupName?: string;
}

const props = withDefaults(defineProps<Props>(), {
  saving: false,
});

const emit = defineEmits<{
  submit: [data: Omit<RunningDinner, 'id' | 'createdAt' | 'updatedAt'>];
  cancel: [];
}>();

const formData = reactive<
  Omit<RunningDinner, 'id' | 'createdAt' | 'updatedAt'> & {
    date: string | Date;
    registrationDeadline: string | Date;
  }
>({
  name:
    props.initialData?.name ||
    (props.initialGroupName
      ? `Running Dinner - ${props.initialGroupName}`
      : ''),
  description: props.initialData?.description || '',
  date: props.initialData?.date || '',
  city: props.initialData?.city || '',
  maxParticipants: props.initialData?.maxParticipants || 12,
  allowPreferredPartners: props.initialData?.allowPreferredPartners ?? true,
  publicSingleSignins: props.initialData?.publicSingleSignins ?? false,
  preferredGroupSize: props.initialData?.preferredGroupSize || 2,
  allowPreferredMeal: props.initialData?.allowPreferredMeal ?? true,
  registrationDeadline: props.initialData?.registrationDeadline || '',
  menu: props.initialData?.menu || {
    starter: { startTime: '18:00', endTime: '19:30' },
    mainCourse: { startTime: '20:00', endTime: '21:30' },
    dessert: { startTime: '22:00', endTime: '23:30' },
  },
  participantInfo: props.initialData?.participantInfo || '',
  status: props.initialData?.status || 'draft',
  organizerId: props.organizerId,
  publishedAt: props.initialData?.publishedAt,
});

const afterPartyTime = ref(props.initialData?.afterParty?.time || '');
const afterPartyLocation = ref(props.initialData?.afterParty?.location || '');

const errors = reactive<Record<string, string>>({});
const validationMessage = ref('');

const submitLabel = computed(() =>
  props.initialData ? 'Update Dinner' : 'Create Dinner',
);

// Helper to convert Date to ISO string
function toISODate(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }
  return String(value || '');
}

watch([afterPartyTime, afterPartyLocation], () => {
  if (afterPartyTime.value && afterPartyLocation.value) {
    formData.afterParty = {
      time: afterPartyTime.value,
      location: afterPartyLocation.value,
    };
  } else {
    formData.afterParty = undefined;
  }
});

function validateForm(): boolean {
  Object.keys(errors).forEach((key) => delete errors[key]);

  // Convert Date objects to ISO strings for validation
  const dataToValidate = {
    ...formData,
    date: toISODate(formData.date),
    registrationDeadline: toISODate(formData.registrationDeadline),
  };

  const result = RunningDinnerSchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  }).safeParse(dataToValidate);

  if (result.success) {
    return true;
  }

  // Use Zod's flattenError to get a clean error structure
  const flattened = z.flattenError(result.error);

  console.error('Validation errors:', flattened);

  // Populate errors object with field errors
  Object.entries(flattened.fieldErrors).forEach(([field, messages]) => {
    if (messages && messages.length > 0) {
      errors[field] = messages[0]; // Take first error message for each field
      console.error(`Field ${field}: ${messages[0]}`);
    }
  });

  // Store the pretty error for the summary message
  validationMessage.value = z.prettifyError(result.error);

  return false;
}

function handleSubmit() {
  console.log('DinnerForm handleSubmit called');
  console.log('Form data:', formData);

  // Clear previous validation message
  validationMessage.value = '';

  // Convert Date objects to ISO strings for submission
  const submitData = {
    ...formData,
    date: toISODate(formData.date),
    registrationDeadline: toISODate(formData.registrationDeadline),
  } as Omit<RunningDinner, 'id' | 'createdAt' | 'updatedAt'>;

  // Temporarily update formData for validation
  const originalDate = formData.date;
  const originalDeadline = formData.registrationDeadline;
  Object.assign(formData, submitData);

  const isValid = validateForm();
  console.log('Form valid:', isValid);
  console.log('Validation errors:', errors);

  // Restore original values
  formData.date = originalDate;
  formData.registrationDeadline = originalDeadline;

  if (!isValid) {
    return;
  }

  console.log('Emitting submit with data:', submitData);
  emit('submit', submitData);
}
</script>
