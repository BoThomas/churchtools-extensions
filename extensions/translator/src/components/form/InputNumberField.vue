<template>
  <FormFieldWithInfo
    :label="label"
    :disabled="disabled"
    :input-id="inputId"
    :hint="hint"
  >
    <template #default="{ inputId: id, disabled: isDisabled }">
      <InputNumber
        :id="id"
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
        :disabled="isDisabled"
        :placeholder="placeholder"
        :min="min"
        :max="max"
        :step="step"
        :show-buttons="showButtons"
      />
    </template>
    <template #info>
      <slot name="info"></slot>
    </template>
  </FormFieldWithInfo>
</template>

<script setup lang="ts">
import FormFieldWithInfo from './FormFieldWithInfo.vue';
import InputNumber from '@churchtools-extensions/prime-volt/InputNumber.vue';

interface Props {
  label: string;
  modelValue: number | null;
  placeholder?: string;
  disabled?: boolean;
  inputId?: string;
  hint?: string;
  min?: number;
  max?: number;
  step?: number;
  showButtons?: boolean;
}

withDefaults(defineProps<Props>(), {
  showButtons: false,
  step: 1,
});

defineEmits<{
  'update:modelValue': [value: number | null];
}>();
</script>
