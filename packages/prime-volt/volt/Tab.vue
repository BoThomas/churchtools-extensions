<template>
  <Tab
    :value="props.value"
    unstyled
    :pt="theme"
    :ptOptions="{
      mergeProps: ptViewMerge,
    }"
  >
    <slot></slot>
  </Tab>
</template>

<script setup lang="ts">
import Tab, { type TabPassThroughOptions, type TabProps } from 'primevue/tab';
import { ref } from 'vue';
import { ptViewMerge } from './utils';

interface Props extends /* @vue-ignore */ TabProps {}
const props = defineProps<Props>();

const theme = ref<TabPassThroughOptions>({
  // Moderately increased over original (≈1.2x) after user feedback
  root: `flex-shrink-0 cursor-pointer select-none relative whitespace-nowrap py-2.5 px-4
        text-surface-500 dark:text-surface-400
        text-lg md:text-[1.15rem]
        leading-snug
        transition-colors duration-200
        not-p-active:enabled:hover:text-surface-700 dark:not-p-active:enabled:hover:text-surface-0
        p-active:text-black dark:p-active:text-surface-0
        disabled:pointer-events-none disabled:opacity-60
        focus-visible:z-10 focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-[-1px] focus-visible:outline-primary`,
});
</script>
