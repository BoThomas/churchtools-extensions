<template>
  <FormFieldWithInfo
    :label="label"
    :disabled="disabled"
    :input-id="inputId"
    :hint="hint"
  >
    <template #default="{ inputId: id, disabled: isDisabled }">
      <Select
        :id="id"
        :model-value="modelValue"
        @update:model-value="$emit('update:modelValue', $event)"
        :options="options"
        :disabled="isDisabled"
        :placeholder="placeholder"
        :option-label="optionLabel"
        :option-value="optionValue"
        pt:root="w-full"
      >
        <template v-if="$slots.option" #option="slotProps">
          <slot name="option" v-bind="slotProps"></slot>
        </template>
      </Select>
    </template>
    <template #info>
      <slot name="info"></slot>
    </template>
  </FormFieldWithInfo>
</template>

<script setup lang="ts">
import FormFieldWithInfo from './FormFieldWithInfo.vue';
import Select from '@churchtools-extensions/prime-volt/Select.vue';

interface Props {
  label: string;
  modelValue: any;
  options: any[];
  placeholder?: string;
  disabled?: boolean;
  inputId?: string;
  hint?: string;
  optionLabel?: string;
  optionValue?: string;
}

withDefaults(defineProps<Props>(), {
  optionLabel: undefined,
  optionValue: undefined,
});

defineEmits<{
  'update:modelValue': [value: any];
}>();
</script>
