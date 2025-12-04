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
          <!-- Event Leader (Required) -->
          <div class="flex flex-col gap-2 md:col-span-2">
            <label for="leader" class="font-semibold text-sm">
              Event Leader (Leiter) <span class="text-red-500">*</span>
            </label>
            <Select
              id="leader"
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
              :invalid="!!errors.leader"
            />
            <small class="text-surface-500"
              >The leader is required for participants to join the group</small
            >
            <small v-if="errors.leader" class="text-red-500">{{
              errors.leader
            }}</small>
          </div>

          <!-- Co-Leaders (Optional) -->
          <div class="flex flex-col gap-2 md:col-span-2">
            <label for="co-leaders" class="font-semibold text-sm">
              Co-Leaders (Co-Leiter)
            </label>
            <Multiselect
              id="co-leaders"
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
            <small class="text-surface-500"
              >Additional leaders who can help organize this event</small
            >
          </div>

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
              placeholder="e.g., 18"
              :invalid="!!errors.maxMembers"
            />
            <small v-if="errors.maxMembers" class="text-red-500">{{
              errors.maxMembers
            }}</small>
            <small class="text-surface-500">
              💡 For team size {{ formData.preferredGroupSize }}, recommended
              values are:
              <strong>{{
                validParticipantOptions.slice(0, 6).join(', ')
              }}</strong
              >, etc. These ensure no team meets another more than once.
            </small>
          </div>

          <!-- Preferred Group Size -->
          <div class="flex flex-col gap-2">
            <label for="group-size" class="font-semibold text-sm">
              Preferred Group Size (2-4) <span class="text-red-500">*</span>
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
          class="flex items-start gap-3 p-3 mt-4 bg-primary-50 dark:bg-primary-900/20 rounded border border-primary-200 dark:border-primary-800"
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
            <p class="text-xs text-surface-600 dark:text-surface-400 mt-1">
              When enabled, participants can specify other people they'd like to
              be grouped with during registration. The grouping algorithm will
              try to respect these preferences when creating dinner groups.
            </p>
          </div>
        </div>
      </Fieldset>

      <!-- Registration Settings Section -->
      <Fieldset legend="Registration Settings">
        <div class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Registration Open Date -->
            <div class="flex flex-col gap-2">
              <label for="signup-open-date" class="font-semibold text-sm">
                Registration Opens
              </label>
              <DatePicker
                id="signup-open-date"
                v-model="formData.signUpOpeningDate"
                dateFormat="dd/mm/yy"
                placeholder="Immediately (leave empty)"
                showTime
                hourFormat="24"
              />
              <small class="text-surface-500"
                >Leave empty to open registration immediately</small
              >
            </div>

            <!-- Registration Close Date -->
            <div class="flex flex-col gap-2">
              <label for="signup-close-date" class="font-semibold text-sm">
                Registration Closes
              </label>
              <DatePicker
                id="signup-close-date"
                v-model="formData.signUpClosingDate"
                dateFormat="dd/mm/yy"
                placeholder="Manual close (leave empty)"
                showTime
                hourFormat="24"
              />
              <small class="text-surface-500"
                >Leave empty to close manually</small
              >
            </div>
          </div>

          <!-- Spouse Registration -->
          <div
            class="flex items-start gap-3 p-3 bg-primary-50 dark:bg-primary-900/20 rounded border border-primary-200 dark:border-primary-800"
          >
            <Checkbox
              id="allow-spouse-registration"
              v-model="formData.allowSpouseRegistration"
              binary
            />
            <div class="flex-1">
              <label
                for="allow-spouse-registration"
                class="font-semibold text-sm cursor-pointer"
              >
                Allow Spouse Registration
              </label>
              <p class="text-xs text-surface-600 dark:text-surface-400 mt-1">
                Allow participants to register their spouse together using
                ChurchTools relationship data.
              </p>
            </div>
          </div>
        </div>
      </Fieldset>

      <!-- Waitlist Settings Section -->
      <Fieldset legend="Waitlist Settings">
        <div class="space-y-4">
          <div class="flex items-start gap-3">
            <Checkbox
              id="allow-waitlist"
              v-model="formData.allowWaitinglist"
              binary
            />
            <div class="flex-1">
              <label
                for="allow-waitlist"
                class="font-semibold text-sm cursor-pointer"
              >
                Enable Waitlist
              </label>
              <p class="text-xs text-surface-600 dark:text-surface-400 mt-1">
                Allow participants to join a waitlist when the event is full.
              </p>
            </div>
          </div>

          <div
            class="flex items-start gap-3"
            :class="{ 'opacity-50': !formData.allowWaitinglist }"
          >
            <Checkbox
              id="auto-move-up"
              v-model="formData.automaticMoveUp"
              binary
              :disabled="!formData.allowWaitinglist"
            />
            <div class="flex-1">
              <label
                for="auto-move-up"
                class="font-semibold text-sm"
                :class="{
                  'cursor-pointer': formData.allowWaitinglist,
                  'cursor-not-allowed': !formData.allowWaitinglist,
                }"
              >
                Automatic Move-Up
              </label>
              <p class="text-xs text-surface-600 dark:text-surface-400 mt-1">
                Automatically promote waitlisted participants when spots open.
              </p>
            </div>
          </div>

          <div
            class="flex flex-col gap-2"
            :class="{ 'opacity-50': !formData.allowWaitinglist }"
          >
            <label for="waitlist-max" class="font-semibold text-sm">
              Waitlist Limit
            </label>
            <InputNumber
              id="waitlist-max"
              v-model="formData.waitlistMaxPersons"
              :min="1"
              :step="1"
              placeholder="Unlimited (leave empty)"
              :disabled="!formData.allowWaitinglist"
            />
            <small class="text-surface-500"
              >Leave empty for unlimited waitlist</small
            >
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

          <!-- Dessert as After Party Option -->
          <div
            class="flex items-start gap-3 p-3 bg-primary-50 dark:bg-primary-900/20 rounded border border-primary-200 dark:border-primary-800"
            :class="{ 'opacity-50': !hasAfterParty }"
          >
            <Checkbox
              id="dessert-at-after-party"
              v-model="formData.afterParty.isDessertLocation"
              binary
              :disabled="!hasAfterParty"
            />
            <div class="flex-1">
              <label
                for="dessert-at-after-party"
                class="font-semibold text-sm"
                :class="{
                  'cursor-pointer': hasAfterParty,
                  'cursor-not-allowed': !hasAfterParty,
                }"
              >
                Hold dessert at after party location
              </label>
              <p class="text-xs text-surface-600 dark:text-surface-400 mt-1">
                Instead of dessert at different homes, all groups gather at the
                after party venue for dessert.
              </p>
            </div>
          </div>

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
              :disabled="!hasAfterParty"
            />
          </div>

          <!-- After Party Address -->
          <div class="space-y-3">
            <label class="font-semibold text-sm">Location Address</label>

            <!-- Venue Name -->
            <div class="flex flex-col gap-1">
              <label
                for="after-party-name"
                class="text-xs text-surface-600 dark:text-surface-400"
              >
                Venue Name
              </label>
              <InputText
                id="after-party-name"
                v-model="formData.afterParty.address.name"
                placeholder="e.g., St. Georg Kirche"
                :disabled="!hasAfterParty"
              />
            </div>

            <!-- Street -->
            <div class="flex flex-col gap-1">
              <label
                for="after-party-street"
                class="text-xs text-surface-600 dark:text-surface-400"
              >
                Street & Number
              </label>
              <InputText
                id="after-party-street"
                v-model="formData.afterParty.address.street"
                placeholder="e.g., Hauptstraße 328"
                :disabled="!hasAfterParty"
              />
            </div>

            <!-- ZIP and City in a row -->
            <div class="grid grid-cols-3 gap-2">
              <div class="flex flex-col gap-1">
                <label
                  for="after-party-zip"
                  class="text-xs text-surface-600 dark:text-surface-400"
                >
                  ZIP Code
                </label>
                <InputText
                  id="after-party-zip"
                  v-model="formData.afterParty.address.zip"
                  placeholder="e.g., 75223"
                  :disabled="!hasAfterParty"
                />
              </div>
              <div class="flex flex-col gap-1 col-span-2">
                <label
                  for="after-party-city"
                  class="text-xs text-surface-600 dark:text-surface-400"
                >
                  City
                </label>
                <InputText
                  id="after-party-city"
                  v-model="formData.afterParty.address.city"
                  placeholder="e.g., Öschelbronn"
                  :disabled="!hasAfterParty"
                />
              </div>
            </div>
          </div>

          <!-- After Party Description -->
          <div class="flex flex-col gap-2">
            <label for="after-party-description" class="font-semibold text-sm">
              Description (optional)
            </label>
            <textarea
              id="after-party-description"
              v-model="formData.afterParty.description"
              rows="2"
              placeholder="Additional details about the after party..."
              class="p-inputtext p-component"
              :disabled="!hasAfterParty"
            />
          </div>
        </div>
      </Fieldset>
    </form>

    <template #footer>
      <div class="flex flex-col gap-3 w-full pt-2">
        <!-- Error Message - shown next to buttons -->
        <Message
          v-if="generalError"
          severity="error"
          :closable="true"
          class="m-0"
        >
          {{ generalError }}
        </Message>
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
import Select from '@churchtools-extensions/prime-volt/Select.vue';
import Multiselect from '@churchtools-extensions/prime-volt/Multiselect.vue';
import { usePersonSelector } from '@/composables/usePersonSelector';

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

// Person selector composable (auto-selects current user as leader)
const personSelector = usePersonSelector({
  autoSelectCurrentUser: true,
});

// Helper function to create a time object
function createTime(hours: number, minutes: number = 0): Date {
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

// Form data
const formData = reactive({
  name: '',
  description: '',
  date: null as Date | null,
  maxMembers: 18, // Default for team size 2: 9 teams × 2 people
  preferredGroupSize: 2,
  allowPartnerPreferences: false,
  // CT-native registration settings
  signUpOpeningDate: null as Date | null,
  signUpClosingDate: null as Date | null,
  // Waitlist settings
  allowWaitinglist: true,
  automaticMoveUp: true,
  waitlistMaxPersons: null as number | null,
  // Co-registration settings
  allowSpouseRegistration: true,
  menu: {
    starter: {
      startTime: createTime(18, 0) as Date | null, // 18:00
      endTime: createTime(19, 30) as Date | null, // 19:30
    },
    mainCourse: {
      startTime: createTime(20, 0) as Date | null, // 20:00
      endTime: createTime(21, 30) as Date | null, // 21:30
    },
    dessert: {
      startTime: createTime(22, 0) as Date | null, // 22:00
      endTime: createTime(23, 30) as Date | null, // 23:30
    },
  },
  afterParty: {
    time: createTime(0, 0) as Date | null, // 00:00
    address: {
      name: '',
      street: '',
      zip: '',
      city: '',
      country: 'DE',
    },
    description: '',
    isDessertLocation: false,
  },
});

// Validation errors
const errors = reactive({
  name: '',
  description: '',
  date: '',
  leader: '',
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

// Computed: list of valid participant counts for the current team size
// Valid counts are multiples of (3 × teamSize) since we need teams divisible by 3
const validParticipantOptions = computed(() => {
  const teamSize = formData.preferredGroupSize;
  const minTeams = 6; // Minimum 6 teams (2 groups of 3)
  const options: number[] = [];

  // Generate options: 6, 9, 12, 15... teams × teamSize
  for (let teams = minTeams; teams <= 30; teams += 3) {
    options.push(teams * teamSize);
  }
  return options;
});

// Validation schema
const eventSchema = z.object({
  name: z.string().min(1, 'Event name is required'),
  description: z.string().optional(),
  date: z.date({ message: 'Event date is required' }),
  leader: z
    .number({ message: 'Event leader is required' })
    .positive('Event leader is required'),
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

// Initialize person selector when dialog becomes visible
watch(
  () => props.visible,
  async (visible) => {
    if (visible) {
      await personSelector.initialize();
    }
  },
  { immediate: true },
);

// Watch hasAfterParty to clear after party data
watch(hasAfterParty, (value) => {
  if (!value) {
    formData.afterParty.time = null;
    formData.afterParty.address.name = '';
    formData.afterParty.address.street = '';
    formData.afterParty.address.zip = '';
    formData.afterParty.address.city = '';
    formData.afterParty.description = '';
    formData.afterParty.isDessertLocation = false;
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
  formData.maxMembers = 18; // Default for team size 2: 9 teams × 2 people
  formData.preferredGroupSize = 2;
  formData.allowPartnerPreferences = false;
  formData.signUpOpeningDate = null;
  formData.signUpClosingDate = null;
  formData.allowWaitinglist = true;
  formData.automaticMoveUp = true;
  formData.waitlistMaxPersons = null;
  formData.allowSpouseRegistration = true;
  formData.menu.starter.startTime = createTime(18, 0);
  formData.menu.starter.endTime = createTime(19, 30);
  formData.menu.mainCourse.startTime = createTime(20, 0);
  formData.menu.mainCourse.endTime = createTime(21, 30);
  formData.menu.dessert.startTime = createTime(22, 0);
  formData.menu.dessert.endTime = createTime(23, 30);
  hasAfterParty.value = false;
  formData.afterParty.time = createTime(0, 0);
  formData.afterParty.address.name = '';
  formData.afterParty.address.street = '';
  formData.afterParty.address.zip = '';
  formData.afterParty.address.city = '';
  formData.afterParty.description = '';
  formData.afterParty.isDessertLocation = false;
  personSelector.reset();
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
    // Validate leader selection first (not part of Zod schema as it's a complex object)
    if (!personSelector.selectedLeader.value) {
      errors.leader = 'Event leader is required';
      return;
    }

    // Prepare data for validation
    const dataToValidate = {
      ...formData,
      leader: personSelector.selectedLeader.value.id,
    };

    // Validate form data
    const validatedData = eventSchema.parse(dataToValidate);

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
    const hasValidAddress =
      formData.afterParty.address.street || formData.afterParty.address.name;
    if (hasAfterParty.value && formData.afterParty.time && hasValidAddress) {
      afterParty = {
        time: combineDateTime(validatedData.date, formData.afterParty.time),
        address: {
          name: formData.afterParty.address.name || undefined,
          street: formData.afterParty.address.street || undefined,
          zip: formData.afterParty.address.zip || undefined,
          city: formData.afterParty.address.city || undefined,
          country: formData.afterParty.address.country || 'DE',
        },
        description: formData.afterParty.description || undefined,
        isDessertLocation: formData.afterParty.isDessertLocation,
      };
    }

    // Prepare registration dates (convert to ISO if set)
    const signUpOpeningDate = formData.signUpOpeningDate
      ? formData.signUpOpeningDate.toISOString()
      : null;
    const signUpClosingDate = formData.signUpClosingDate
      ? formData.signUpClosingDate.toISOString()
      : null;

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
      // CT-native registration settings
      leaderPersonId: personSelector.selectedLeader.value!.id,
      coLeaderPersonIds: personSelector.coLeaderIds.value,
      signUpOpeningDate,
      signUpClosingDate,
      // Waitlist settings
      allowWaitinglist: formData.allowWaitinglist,
      automaticMoveUp: formData.automaticMoveUp,
      waitlistMaxPersons: formData.waitlistMaxPersons,
      // Co-registration settings
      allowSpouseRegistration: formData.allowSpouseRegistration,
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
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to create event. Please try again.';

      // Check for duplicate name error
      if (
        errorMessage.includes('duplicate') ||
        errorMessage.includes('already exists') ||
        errorMessage.includes('same name')
      ) {
        errors.name =
          'A event with this name already exists. Please choose a different name.';
        generalError.value =
          'A event with this name already exists. Please choose a different name.';
      } else {
        generalError.value = errorMessage;
      }

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
