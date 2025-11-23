<template>
  <form @submit.prevent="handleSubmit" class="space-y-6">
    <Fieldset>
      <template #legend>
        <div class="flex items-center gap-2">
          <i class="pi pi-user"></i>
          <span class="font-semibold">Personal Information</span>
        </div>
      </template>
      <div class="space-y-4">
        <div class="flex flex-col gap-2">
          <label for="name" class="font-medium text-sm">Name *</label>
          <InputText
            id="name"
            v-model="formData.name"
            placeholder="Your full name"
            :invalid="!!errors.name"
          />
          <small v-if="errors.name" class="text-red-500">{{
            errors.name
          }}</small>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div class="flex flex-col gap-2">
            <label for="email" class="font-medium text-sm">Email *</label>
            <InputText
              id="email"
              v-model="formData.email"
              type="email"
              placeholder="your.email@example.com"
              :invalid="!!errors.email"
            />
            <small v-if="errors.email" class="text-red-500">{{
              errors.email
            }}</small>
          </div>

          <div class="flex flex-col gap-2">
            <label for="phone" class="font-medium text-sm">Phone *</label>
            <InputText
              id="phone"
              v-model="formData.phone"
              placeholder="+49 123 456789"
              :invalid="!!errors.phone"
            />
            <small v-if="errors.phone" class="text-red-500">{{
              errors.phone
            }}</small>
          </div>
        </div>
      </div>
    </Fieldset>

    <Fieldset>
      <template #legend>
        <div class="flex items-center gap-2">
          <i class="pi pi-map-marker"></i>
          <span class="font-semibold">Address</span>
        </div>
      </template>
      <div class="space-y-4">
        <div class="flex flex-col gap-2">
          <label for="street" class="font-medium text-sm">Street *</label>
          <InputText
            id="street"
            v-model="formData.address.street"
            placeholder="Street and number"
            :invalid="!!errors['address.street']"
          />
          <small v-if="errors['address.street']" class="text-red-500">{{
            errors['address.street']
          }}</small>
        </div>

        <div class="grid grid-cols-3 gap-4">
          <div class="flex flex-col gap-2">
            <label for="zip" class="font-medium text-sm">ZIP *</label>
            <InputText
              id="zip"
              v-model="formData.address.zip"
              placeholder="12345"
              :invalid="!!errors['address.zip']"
            />
            <small v-if="errors['address.zip']" class="text-red-500">{{
              errors['address.zip']
            }}</small>
          </div>

          <div class="flex flex-col gap-2 col-span-2">
            <label for="city" class="font-medium text-sm">City *</label>
            <InputText
              id="city"
              v-model="formData.address.city"
              placeholder="City name"
              :invalid="!!errors['address.city']"
            />
            <small v-if="errors['address.city']" class="text-red-500">{{
              errors['address.city']
            }}</small>
          </div>
        </div>
      </div>
    </Fieldset>

    <Fieldset>
      <template #legend>
        <div class="flex items-center gap-2">
          <i class="pi pi-heart"></i>
          <span class="font-semibold">Preferences</span>
        </div>
      </template>
      <div class="space-y-4">
        <div class="flex flex-col gap-2">
          <label for="preferredPartners" class="font-medium text-sm"
            >Preferred Partners (optional)</label
          >
          <small class="text-surface-600 dark:text-surface-400 -mt-1 mb-2"
            >Enter email addresses of people you'd like to be grouped with. They
            need to register too.</small
          >
          <Chip
            v-for="(partner, index) in formData.preferredPartners"
            :key="index"
            :label="partner"
            removable
            @remove="removePreferredPartner(index)"
            class="mb-2"
          />
          <div class="flex gap-2">
            <InputText
              v-model="newPartnerEmail"
              type="email"
              placeholder="partner@example.com"
              class="flex-1"
              @keyup.enter="addPreferredPartner"
            />
            <Button
              label="Add"
              icon="pi pi-plus"
              @click="addPreferredPartner"
              :disabled="!newPartnerEmail"
              type="button"
            />
          </div>
          <small v-if="partnerEmailError" class="text-red-500">{{
            partnerEmailError
          }}</small>
        </div>

        <div v-if="allowPreferredMeal" class="flex flex-col gap-2">
          <label class="font-medium text-sm"
            >Preferred Meal to Host (optional)</label
          >
          <small class="text-surface-600 dark:text-surface-400 -mt-1 mb-2"
            >Select which course you'd prefer to host. We'll try to respect
            preferences, but may need to assign a different meal to balance the
            groups.</small
          >
          <div class="space-y-2">
            <div class="flex items-center gap-2">
              <RadioButton
                v-model="formData.preferredMeal"
                inputId="meal-starter"
                name="preferredMeal"
                value="starter"
              />
              <label for="meal-starter" class="cursor-pointer">Starter</label>
            </div>
            <div class="flex items-center gap-2">
              <RadioButton
                v-model="formData.preferredMeal"
                inputId="meal-main"
                name="preferredMeal"
                value="mainCourse"
              />
              <label for="meal-main" class="cursor-pointer">Main Course</label>
            </div>
            <div class="flex items-center gap-2">
              <RadioButton
                v-model="formData.preferredMeal"
                inputId="meal-dessert"
                name="preferredMeal"
                value="dessert"
              />
              <label for="meal-dessert" class="cursor-pointer">Dessert</label>
            </div>
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <label for="dietaryRestrictions" class="font-medium text-sm"
            >Dietary Restrictions & Allergies (optional)</label
          >
          <small class="text-surface-600 dark:text-surface-400 -mt-1 mb-2"
            >Let hosts know about any dietary requirements, allergies, or food
            preferences.</small
          >
          <InputText
            id="dietaryRestrictions"
            v-model="formData.dietaryRestrictions"
            placeholder="e.g., vegetarian, gluten-free, nut allergy"
          />
        </div>
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

    <div class="flex justify-end gap-2">
      <SecondaryButton label="Cancel" @click="$emit('cancel')" type="button" />
      <Button
        :label="isEdit ? 'Update Registration' : 'Register'"
        type="submit"
        :loading="saving"
        :disabled="saving"
      />
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { Person } from '@churchtools-extensions/ct-utils/ct-types';
import type { Participant } from '../types/models';
import { ParticipantSchema } from '../types/models';

import InputText from '@churchtools-extensions/prime-volt/InputText.vue';
import Button from '@churchtools-extensions/prime-volt/Button.vue';
import SecondaryButton from '@churchtools-extensions/prime-volt/SecondaryButton.vue';
import RadioButton from '@churchtools-extensions/prime-volt/RadioButton.vue';
import Chip from '@churchtools-extensions/prime-volt/Chip.vue';
import Fieldset from '@churchtools-extensions/prime-volt/Fieldset.vue';
import { z } from 'zod';

interface Props {
  dinnerId: number;
  currentUser?: Person | null;
  initialData?: Participant;
  allowPreferredMeal?: boolean;
  saving?: boolean;
}

interface Emits {
  (e: 'submit', data: Omit<Participant, 'id'>): void;
  (e: 'cancel'): void;
}

const props = withDefaults(defineProps<Props>(), {
  currentUser: null,
  initialData: undefined,
  allowPreferredMeal: false,
  saving: false,
});

const emit = defineEmits<Emits>();

const isEdit = computed(() => !!props.initialData);

const formData = ref<Omit<Participant, 'id'>>({
  dinnerId: props.dinnerId,
  personId: props.currentUser?.id,
  name: '',
  email: '',
  phone: '',
  address: {
    street: '',
    zip: '',
    city: '',
  },
  preferredPartners: [],
  preferredMeal: undefined,
  dietaryRestrictions: '',
  registrationStatus: 'confirmed',
  registeredAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const newPartnerEmail = ref('');
const partnerEmailError = ref('');
const errors = ref<Record<string, string>>({});
const validationMessage = ref('');

// Initialize form data
if (props.initialData) {
  formData.value = { ...props.initialData };
} else if (props.currentUser) {
  // Pre-populate from ChurchTools user
  formData.value.name =
    `${props.currentUser.firstName ?? ''} ${props.currentUser.lastName ?? ''}`.trim();
  formData.value.email = props.currentUser.email ?? '';
  formData.value.personId = props.currentUser.id;

  // Try to get phone and address if available
  // Note: ChurchTools API might have additional fields we can use
  // For now, we'll leave phone and address empty for user to fill
}

// Watch for changes to dinnerId
watch(
  () => props.dinnerId,
  (newDinnerId) => {
    formData.value.dinnerId = newDinnerId;
  },
);

function addPreferredPartner() {
  partnerEmailError.value = '';

  if (!newPartnerEmail.value) {
    return;
  }

  // Validate email
  const emailSchema = z.string().email();
  const result = emailSchema.safeParse(newPartnerEmail.value);

  if (!result.success) {
    partnerEmailError.value = 'Please enter a valid email address';
    return;
  }

  // Check if already added
  if (formData.value.preferredPartners.includes(newPartnerEmail.value)) {
    partnerEmailError.value = 'This partner is already added';
    return;
  }

  // Check if it's the user's own email
  if (newPartnerEmail.value === formData.value.email) {
    partnerEmailError.value = "You can't add yourself as a partner";
    return;
  }

  formData.value.preferredPartners.push(newPartnerEmail.value);
  newPartnerEmail.value = '';
}

function removePreferredPartner(index: number) {
  formData.value.preferredPartners.splice(index, 1);
}

function validateForm(): boolean {
  errors.value = {};

  const result = ParticipantSchema.omit({
    id: true,
  }).safeParse(formData.value);

  if (result.success) {
    return true;
  }

  console.error('Validation errors:', result.error);

  // Process errors from Zod
  result.error.issues.forEach((issue) => {
    const path = issue.path.join('.');
    errors.value[path] = issue.message;
    console.error(`Field ${path}: ${issue.message}`);
  });

  // Store the pretty error for the summary message
  validationMessage.value = z.prettifyError(result.error);

  return false;
}

function handleSubmit() {
  // Clear previous validation message
  validationMessage.value = '';

  if (!validateForm()) {
    return;
  }

  // Update timestamp
  formData.value.updatedAt = new Date().toISOString();

  emit('submit', { ...formData.value });
}
</script>
