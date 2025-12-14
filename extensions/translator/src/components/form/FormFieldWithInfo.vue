<template>
  <div class="flex flex-col gap-2">
    <label v-if="label" :for="inputId" class="font-medium text-sm">
      {{ label }}
    </label>
    <div class="flex items-stretch w-full">
      <slot :input-id="inputId" :disabled="disabled" />
      <span
        v-if="$slots.info || infoContent"
        class="flex items-center justify-center border-y border-e border-surface-300 dark:border-surface-700 rounded-e-md overflow-hidden"
      >
        <Button
          icon="pi pi-question-circle"
          severity="secondary"
          text
          pt:root="rounded-none"
          @click="(e) => popover?.toggle(e)"
          :disabled="disabled"
        />
      </span>
    </div>
    <small v-if="hint" class="text-surface-500">{{ hint }}</small>
    <Popover v-if="$slots.info || infoContent" ref="popover">
      <div class="max-w-sm">
        <slot name="info">
          <div v-if="infoContent" class="text-sm" v-html="infoContent"></div>
        </slot>
      </div>
    </Popover>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import Button from '@churchtools-extensions/prime-volt/Button.vue';
import Popover from '@churchtools-extensions/prime-volt/Popover.vue';

interface Props {
  label?: string;
  inputId?: string;
  infoContent?: string;
  hint?: string;
  disabled?: boolean;
}

withDefaults(defineProps<Props>(), {
  inputId: () => `field-${Math.random().toString(36).substring(2, 11)}`,
});

const popover = ref();
</script>
