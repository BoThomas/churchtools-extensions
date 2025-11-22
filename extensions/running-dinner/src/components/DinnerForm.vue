<template>
  <form @submit.prevent="handleSubmit" class="space-y-6">
    <Card>
      <template #title>Basic Information</template>
      <template #content>
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

          <div class="grid grid-cols-2 gap-4">
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

          <div class="grid grid-cols-2 gap-4">
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
      </template>
    </Card>

    <Card>
      <template #title>Preferences</template>
      <template #content>
        <div class="space-y-4">
          <div class="flex flex-col gap-2">
            <label for="preferredGroupSize" class="font-medium text-sm"
              >Preferred Group Size</label
            >
            <InputNumber
              id="preferredGroupSize"
              v-model="formData.preferredGroupSize"
              :min="2"
              :max="6"
            />
            <small class="text-xs text-surface-500"
              >Recommended: 2-4 people per group</small
            >
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
      </template>
    </Card>

    <Card>
      <template #title>Menu Times</template>
      <template #content>
        <div class="space-y-4">
          <Fieldset legend="Starter">
            <div class="grid grid-cols-2 gap-4">
              <div class="flex flex-col gap-2">
                <label class="font-medium text-sm">Start Time</label>
                <InputText
                  v-model="formData.menu.starter.startTime"
                  type="time"
                />
              </div>
              <div class="flex flex-col gap-2">
                <label class="font-medium text-sm">End Time</label>
                <InputText
                  v-model="formData.menu.starter.endTime"
                  type="time"
                />
              </div>
            </div>
          </Fieldset>

          <Fieldset legend="Main Course">
            <div class="grid grid-cols-2 gap-4">
              <div class="flex flex-col gap-2">
                <label class="font-medium text-sm">Start Time</label>
                <InputText
                  v-model="formData.menu.mainCourse.startTime"
                  type="time"
                />
              </div>
              <div class="flex flex-col gap-2">
                <label class="font-medium text-sm">End Time</label>
                <InputText
                  v-model="formData.menu.mainCourse.endTime"
                  type="time"
                />
              </div>
            </div>
          </Fieldset>

          <Fieldset legend="Dessert">
            <div class="grid grid-cols-2 gap-4">
              <div class="flex flex-col gap-2">
                <label class="font-medium text-sm">Start Time</label>
                <InputText
                  v-model="formData.menu.dessert.startTime"
                  type="time"
                />
              </div>
              <div class="flex flex-col gap-2">
                <label class="font-medium text-sm">End Time</label>
                <InputText
                  v-model="formData.menu.dessert.endTime"
                  type="time"
                />
              </div>
            </div>
          </Fieldset>
        </div>
      </template>
    </Card>

    <Card>
      <template #title>After Party (Optional)</template>
      <template #content>
        <div class="space-y-4">
          <div class="flex flex-col gap-2">
            <label for="afterPartyTime" class="font-medium text-sm">Time</label>
            <InputText
              id="afterPartyTime"
              v-model="afterPartyTime"
              type="time"
            />
          </div>

          <div class="flex flex-col gap-2">
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
      </template>
    </Card>

    <Card>
      <template #title>Additional Information</template>
      <template #content>
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
      </template>
    </Card>

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
import type { RunningDinner } from '../types/models';
import { RunningDinnerSchema } from '../types/models';
import Card from '@churchtools-extensions/prime-volt/Card.vue';
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
}

const props = withDefaults(defineProps<Props>(), {
  saving: false,
});

const emit = defineEmits<{
  submit: [data: Omit<RunningDinner, 'id' | 'createdAt' | 'updatedAt'>];
  cancel: [];
}>();

const formData = reactive<
  Omit<RunningDinner, 'id' | 'createdAt' | 'updatedAt'>
>({
  name: props.initialData?.name || '',
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

const submitLabel = computed(() =>
  props.initialData ? 'Update Dinner' : 'Create Dinner',
);

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

  try {
    RunningDinnerSchema.omit({
      id: true,
      createdAt: true,
      updatedAt: true,
    }).parse(formData);
    return true;
  } catch (error: any) {
    if (error.errors) {
      error.errors.forEach((err: any) => {
        errors[err.path[0]] = err.message;
      });
    }
    return false;
  }
}

function handleSubmit() {
  if (validateForm()) {
    emit('submit', formData);
  }
}
</script>
