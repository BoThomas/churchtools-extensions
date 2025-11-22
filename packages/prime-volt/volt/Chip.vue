<template>
  <Chip
    unstyled
    :pt="theme"
    :ptOptions="{
      mergeProps: ptViewMerge,
    }"
    v-bind="$attrs"
  >
    <template #removeicon="{ removeCallback, keydownCallback }">
      <TimesCircleIcon
        class="cursor-pointer text-base w-4 h-4 rounded-full text-surface-800 dark:text-surface-0 focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-primary"
        @click="removeCallback"
        @keydown="keydownCallback"
      />
    </template>
    <template v-for="(_, slotName) in $slots" #[slotName]="slotProps">
      <slot :name="slotName" v-bind="slotProps ?? {}" />
    </template>
  </Chip>
</template>

<script setup lang="ts">
import TimesCircleIcon from '@primevue/icons/timescircle';
import Chip, {
  type ChipPassThroughOptions,
  type ChipProps,
} from 'primevue/chip';
import { computed } from 'vue';
import { ptViewMerge } from './utils';

interface Props extends /* @vue-ignore */ ChipProps {
  size?: 'small' | 'normal' | 'large';
  severity?: 'secondary' | 'success' | 'info' | 'warn' | 'danger' | 'contrast';
}
const props = withDefaults(defineProps<Props>(), {
  size: 'normal',
});

defineOptions({
  inheritAttrs: false,
});

const theme = computed<ChipPassThroughOptions>(() => {
  const sizeClasses = {
    small: 'px-2 py-1 text-xs gap-1',
    normal: 'px-3 py-2 gap-2',
    large: 'px-4 py-3 text-base gap-2',
  };

  const iconSizeClasses = {
    small: 'text-xs w-3 h-3',
    normal: 'text-base w-4 h-4',
    large: 'text-lg w-5 h-5',
  };

  const imageSizeClasses = {
    small: 'w-5 h-5',
    normal: 'w-8 h-8',
    large: 'w-10 h-10',
  };

  // Severity colors matching Badge component
  const severityClasses = {
    secondary:
      'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-300',
    success: 'bg-green-500 dark:bg-green-400 text-white dark:text-green-950',
    info: 'bg-sky-500 dark:bg-sky-400 text-white dark:text-sky-950',
    warn: 'bg-orange-500 dark:bg-orange-400 text-white dark:text-orange-950',
    danger: 'bg-red-500 dark:bg-red-400 text-white dark:text-red-950',
    contrast: 'bg-surface-950 dark:bg-white text-white dark:text-surface-950',
  };

  const baseColors = props.severity
    ? severityClasses[props.severity]
    : 'bg-surface-100 dark:bg-surface-800 text-surface-800 dark:text-surface-0';

  return {
    root: `inline-flex items-center rounded-2xl ${sizeClasses[props.size]}
        ${baseColors}
        has-[img]:pt-1 has-[img]:pb-1
        p-removable:pe-2`,
    image: `rounded-full ${imageSizeClasses[props.size]} -ms-2`,
    icon: `${iconSizeClasses[props.size]}`,
  };
});
</script>
