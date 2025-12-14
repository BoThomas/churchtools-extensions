<template>
  <FormFieldWithInfo :label="label" :disabled="disabled" :input-id="inputId">
    <template #default="{ inputId: id, disabled: isDisabled }">
      <Select
        v-if="!multiple"
        :id="id"
        :model-value="isValidValue ? modelValue : null"
        @update:model-value="$emit('update:modelValue', $event)"
        :options="languages"
        filter
        option-label="name"
        option-value="code"
        :disabled="isDisabled"
        :placeholder="placeholder"
        :invalid="invalid"
        pt:root="flex-1 rounded-e-none"
      />
      <Multiselect
        v-else
        :id="id"
        :model-value="validMultipleValues"
        @update:model-value="$emit('update:modelValue', $event)"
        :options="languages"
        filter
        option-label="name"
        option-value="code"
        :disabled="isDisabled"
        :placeholder="placeholder"
        :max-selected-labels="2"
        :invalid="invalid"
        pt:root="flex-1 rounded-e-none"
      />
    </template>
    <template #info>
      <slot name="info"></slot>
    </template>
  </FormFieldWithInfo>
</template>

<script setup lang="ts">
import { computed } from 'vue';
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
  invalid?: boolean;
}

const props = defineProps<Props>();
defineEmits<{
  'update:modelValue': [value: string | string[]];
}>();

// Check if the single value exists in the languages list
const isValidValue = computed(() => {
  if (!props.multiple && typeof props.modelValue === 'string') {
    return props.languages.some((lang) => lang.code === props.modelValue);
  }
  return true;
});

// Filter out invalid values from multiple selection
const validMultipleValues = computed(() => {
  if (props.multiple && Array.isArray(props.modelValue)) {
    const validCodes = props.languages.map((lang) => lang.code);
    return props.modelValue.filter((code) => validCodes.includes(code));
  }
  return props.modelValue;
});
</script>
