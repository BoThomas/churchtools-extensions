<template>
  <FormFieldWithInfo
    :label="label"
    :disabled="disabled"
    :input-id="inputId"
    :hint="hint"
  >
    <template #default="{ inputId: id, disabled: isDisabled }">
      <InputText
        :id="id"
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
        :disabled="isDisabled"
        :placeholder="placeholder"
        pt:root="w-full"
      />
    </template>
    <template #info>
      <slot name="info"></slot>
    </template>
  </FormFieldWithInfo>
</template>

<script setup lang="ts">
import FormFieldWithInfo from './FormFieldWithInfo.vue';
import InputText from '@churchtools-extensions/prime-volt/InputText.vue';

interface Props {
  label: string;
  modelValue: string;
  placeholder?: string;
  disabled?: boolean;
  inputId?: string;
  hint?: string;
}

defineProps<Props>();
defineEmits<{
  'update:modelValue': [value: string];
}>();
</script>
