<template>
  <div class="flex flex-col gap-2">
    <label v-if="label" :for="inputId" class="font-medium text-sm">
      {{ label }}
    </label>
    <div
      class="flex items-stretch w-full"
      :class="{ 'has-info': $slots.info || infoContent }"
    >
      <slot :input-id="inputId" :disabled="disabled" />
      <span
        v-if="$slots.info || infoContent"
        class="flex items-center justify-center border-y border-e border-surface-300 dark:border-surface-700 rounded-e-md overflow-hidden bg-surface-50 dark:bg-surface-800/50"
      >
        <Button
          icon="pi pi-question-circle"
          severity="secondary"
          text
          class="rounded-none!"
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

<style scoped>
/* Ensure the input takes up the available space */
:deep(> *:first-child) {
  flex: 1 1 0%;
  margin: 0 !important;
}

/* Remove right border radius when info button is present */
.has-info :deep(> *:first-child) {
  border-top-right-radius: 0 !important;
  border-bottom-right-radius: 0 !important;
}

/* InputNumber renders the actual input inside the first child, so target it explicitly */
.has-info :deep(> *:first-child [data-pc-name='pcinputtext']) {
  border-top-right-radius: 0 !important;
  border-bottom-right-radius: 0 !important;
}
</style>
