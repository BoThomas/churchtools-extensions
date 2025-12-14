<template>
  <FormFieldWithInfo :label="label" :disabled="disabled" :input-id="inputId">
    <template #default="{ inputId: id, disabled: isDisabled }">
      <Select
        v-if="!multiple"
        :id="id"
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
        :options="languages"
        filter
        option-label="name"
        option-value="code"
        :disabled="isDisabled"
        :placeholder="placeholder"
        pt:root="flex-1 rounded-e-none"
      />
      <Multiselect
        v-else
        :id="id"
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
        :options="languages"
        filter
        option-label="name"
        option-value="code"
        :disabled="isDisabled"
        :placeholder="placeholder"
        :max-selected-labels="2"
        pt:root="flex-1 rounded-e-none"
      />
    </template>
    <template #info>
      <slot name="info"></slot>
    </template>
  </FormFieldWithInfo>
</template>

<script setup lang="ts">
import FormFieldWithInfo from './FormFieldWithInfo.vue';
import Select from '@churchtools-extensions/prime-volt/Select.vue';
import Multiselect from '@churchtools-extensions/prime-volt/Multiselect.vue';

interface Props {
  label: string;
  modelValue: string | string[];
  languages: Array<{ code: string; name: string }>;
  multiple?: boolean;
  placeholder?: string;
  disabled?: boolean;
  inputId?: string;
}

defineProps<Props>();
defineEmits<{
  'update:modelValue': [value: string | string[]];
}>();
</script>
