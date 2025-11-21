<template>
  <Popover
    ref="el"
    unstyled
    :pt="theme"
    :ptOptions="{
      mergeProps: ptViewMerge,
    }"
  >
    <template v-for="(_, slotName) in $slots" #[slotName]="slotProps">
      <slot :name="slotName" v-bind="slotProps ?? {}" />
    </template>
  </Popover>
</template>

<script setup lang="ts">
import Popover, {
  type PopoverPassThroughOptions,
  type PopoverProps,
} from 'primevue/popover';
import { ref } from 'vue';
import { ptViewMerge } from './utils';

interface Props extends /* @vue-ignore */ PopoverProps {}
defineProps<Props>();

const theme = ref<PopoverPassThroughOptions>({
  root: `mt-[10px] p-flipped:-mt-[10px] p-flipped:mb-[10px]
        bg-surface-0 dark:bg-surface-900 text-surface-700 dark:text-surface-0
        border border-surface-200 dark:border-surface-700
        rounded-md shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)]`,
  content: `p-3`,
  transition: {
    enterFromClass: 'opacity-0 scale-y-75',
    enterActiveClass: 'transition duration-120 ease-[cubic-bezier(0,0,0.2,1)]',
    leaveActiveClass: 'transition-opacity duration-100 ease-linear',
    leaveToClass: 'opacity-0',
  },
});

const el = ref();
defineExpose({
  toggle: (event: any, target: any) => el.value.toggle(event, target),
  show: (event: any, target: any) => el.value.show(event, target),
  hide: () => el.value.toggle(),
});
</script>
