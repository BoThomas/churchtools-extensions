<template>
  <Card>
    <template #title>{{ title }}</template>
    <template #content>
      <form
        class="grid md:grid-cols-2 gap-6 text-sm"
        @submit.prevent="onSubmit"
      >
        <div class="flex flex-col gap-2 md:col-span-2">
          <label for="rd-name" class="font-medium">Name</label>
          <InputText
            id="rd-name"
            v-model="form.name"
            required
            placeholder="Spring 2025 Dinner"
            aria-describedby="rd-name-help"
          />
          <Message
            id="rd-name-help"
            size="small"
            severity="secondary"
            variant="simple"
            >Internal title shown to participants.</Message
          >
        </div>
        <div class="flex flex-col gap-2 md:col-span-2">
          <label for="rd-desc" class="font-medium">Description</label>
          <InputText
            id="rd-desc"
            v-model="form.description"
            placeholder="Short description"
          />
        </div>
        <div class="flex flex-col gap-2">
          <label for="rd-date" class="font-medium">Date</label>
          <DatePicker id="rd-date" v-model="form.date" :manualInput="true" />
        </div>
        <div class="flex flex-col gap-2">
          <label for="rd-city" class="font-medium">City</label>
          <InputText id="rd-city" v-model="form.city" placeholder="City" />
        </div>
        <div class="flex flex-col gap-2">
          <label for="rd-max" class="font-medium">Max Participants</label>
          <InputNumber
            id="rd-max"
            v-model="form.maxParticipants"
            :useGrouping="false"
          />
        </div>
        <div class="flex flex-col gap-2">
          <label for="rd-groupsize" class="font-medium"
            >Preferred Group Size</label
          >
          <InputNumber
            id="rd-groupsize"
            v-model="form.preferredGroupSize"
            :useGrouping="false"
          />
        </div>
        <fieldset class="md:col-span-2 grid sm:grid-cols-3 gap-4">
          <legend class="sr-only">Options</legend>
          <label class="flex items-center gap-2"
            ><Checkbox v-model="form.allowPreferredPartners" :binary="true" />
            <span>Allow preferred partners</span></label
          >
          <label class="flex items-center gap-2"
            ><Checkbox v-model="form.publicSingleSignins" :binary="true" />
            <span>Public single sign-ins</span></label
          >
          <label class="flex items-center gap-2"
            ><Checkbox v-model="form.allowPreferredMeal" :binary="true" />
            <span>Allow preferred meal</span></label
          >
        </fieldset>
        <div class="flex flex-col gap-2 md:col-span-2">
          <label for="rd-deadline" class="font-medium"
            >Registration Deadline</label
          >
          <DatePicker
            id="rd-deadline"
            v-model="form.registrationDeadline"
            :manualInput="true"
          />
        </div>
        <div class="md:col-span-2 flex gap-3 pt-2">
          <Button type="submit" size="small" :disabled="saving">{{
            form.id ? 'Update' : 'Create'
          }}</Button>
          <SecondaryButton
            type="button"
            size="small"
            @click="emit('cancel')"
            :disabled="saving"
            >Cancel</SecondaryButton
          >
        </div>
      </form>
    </template>
  </Card>
</template>

<script setup lang="ts">
import Card from '@/volt/Card.vue';
import InputText from '@/volt/InputText.vue';
import InputNumber from '@/volt/InputNumber.vue';
import DatePicker from '@/volt/DatePicker.vue';
import Checkbox from '@/volt/Checkbox.vue';
import Button from '@/volt/Button.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import Message from '@/volt/Message.vue';
import type { RunningDinnerRecord } from '@/stores/runningDinner';

defineProps<{ title: string; form: RunningDinnerRecord; saving: boolean }>();
const emit = defineEmits<{ (e: 'submit'): void; (e: 'cancel'): void }>();

function onSubmit() {
  emit('submit');
}
</script>
