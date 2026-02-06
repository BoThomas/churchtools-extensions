<template>
  <div class="relative">
    <!-- SelectButton positioned next to the legend text, overlaying the top border -->
    <div
      class="absolute left-60 top-5 z-20 flex items-center gap-4"
      style="transform: translateY(-50%)"
    >
      <div class="bg-surface-0 dark:bg-surface-900 px-3">
        <SelectButton
          v-model="internalEnabled"
          :options="toggleOptions"
          option-label="label"
          option-value="value"
          :disabled="disabled"
          :pt:pcToggleButton:content:class="
            internalEnabled
              ? 'relative flex-auto inline-flex items-center justify-center gap-2 py-1 px-3 rounded-md transition-colors duration-200 p-checked:bg-surface-0 dark:p-checked:bg-surface-800 p-checked:shadow-[0px_1px_2px_0px_rgba(0,0,0,0.02),0px_1px_2px_0px_rgba(0,0,0,0.04)] p-checked:text-green-600 dark:p-checked:text-green-500'
              : 'relative flex-auto inline-flex items-center justify-center gap-2 py-1 px-3 rounded-md transition-colors duration-200 p-checked:bg-surface-0 dark:p-checked:bg-surface-800 p-checked:shadow-[0px_1px_2px_0px_rgba(0,0,0,0.02),0px_1px_2px_0px_rgba(0,0,0,0.04)] p-checked:text-red-600 dark:p-checked:text-red-500'
          "
          @update:model-value="handleToggle"
        />
      </div>
      <div v-if="info" class="bg-surface-0 dark:bg-surface-900 px-1">
        <Button
          icon="pi pi-question-circle"
          text
          @click="(e) => popover?.toggle(e)"
          :disabled="disabled"
          class="h-8 w-8"
        />
      </div>
    </div>
    <Popover v-if="info" ref="popover">
      <div class="max-w-sm text-sm" v-html="info"></div>
    </Popover>

    <!-- Standard Fieldset with its native collapse/expand -->
    <Fieldset
      :legend="legend"
      :collapsed="collapsed"
      :toggleable="toggleable"
      :pt:root:class="
        !internalEnabled ? 'border-surface-100 dark:border-surface-900' : ''
      "
      @toggle="emit('toggle', $event)"
    >
      <!-- Content with optional disabled styling -->
      <div class="relative">
        <div
          v-if="!internalEnabled"
          class="absolute -inset-2 z-10 flex items-center justify-center"
        >
          <div
            class="absolute inset-0 backdrop-blur-[1px] rounded pointer-events-none"
          />

          <!-- Hint with subtle radial shadow behind it -->
          <div class="relative">
            <!-- Light mode shadow (subtler) -->
            <div
              class="absolute -inset-x-16 -inset-y-10 rounded-full pointer-events-none block dark:hidden"
              style="
                background: radial-gradient(
                  ellipse at center,
                  rgba(3, 7, 18, 0.22) 0%,
                  rgba(3, 7, 18, 0.1) 30%,
                  rgba(3, 7, 18, 0) 85%
                );
                filter: blur(18px);
              "
            />

            <!-- Dark mode shadow (light halo) -->
            <div
              class="absolute -inset-x-16 -inset-y-10 rounded-full pointer-events-none hidden dark:block"
              style="
                background: radial-gradient(
                  ellipse at center,
                  rgba(255, 255, 255, 0.1) 0%,
                  rgba(255, 255, 255, 0.05) 30%,
                  rgba(255, 255, 255, 0) 85%
                );
                filter: blur(18px);
              "
            />

            <div
              class="relative z-20 flex items-center gap-2 px-3 py-1 rounded-md bg-surface-0 text-sm font-medium text-surface-700 dark:text-surface-200 shadow cursor-pointer"
              role="button"
              tabindex="0"
              @click="enable()"
              @keydown.enter.prevent="enable()"
              @keydown.space.prevent="enable()"
              aria-label="Turn on to configure"
            >
              Turn
              <span class="text-green-600 dark:text-green-500 font-semibold"
                >on</span
              >
              to configure
            </div>
          </div>
        </div>

        <div :class="{ 'opacity-50 pointer-events-none': !internalEnabled }">
          <slot />
        </div>
      </div>
    </Fieldset>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import Fieldset from '@churchtools-extensions/prime-volt/Fieldset.vue';
import SelectButton from '@churchtools-extensions/prime-volt/SelectButton.vue';
import Button from '@churchtools-extensions/prime-volt/Button.vue';
import Popover from '@churchtools-extensions/prime-volt/Popover.vue';

interface Props {
  legend: string;
  enabled?: boolean;
  collapsed?: boolean;
  toggleable?: boolean;
  disabled?: boolean;
  enabledLabel?: string;
  disabledLabel?: string;
  info?: string;
}

const props = withDefaults(defineProps<Props>(), {
  enabled: true,
  collapsed: false,
  toggleable: true,
  disabled: false,
  enabledLabel: 'On',
  disabledLabel: 'Off',
});

const emit = defineEmits<{
  'update:enabled': [value: boolean];
  toggle: [event: { value: boolean }];
}>();

const internalEnabled = ref(props.enabled);
const previousValue = ref(props.enabled);
const popover = ref();

const toggleOptions = [
  { label: props.enabledLabel, value: true },
  { label: props.disabledLabel, value: false },
];

// Watch for external changes to enabled prop
watch(
  () => props.enabled,
  (newValue) => {
    internalEnabled.value = newValue;
    previousValue.value = newValue;
  },
);

// Watch internalEnabled and prevent null/undefined values
watch(internalEnabled, (newValue) => {
  if (newValue === null || newValue === undefined) {
    // SelectButton tried to deselect - toggle to the opposite value instead
    internalEnabled.value = !previousValue.value;
    previousValue.value = internalEnabled.value;
    emit('update:enabled', internalEnabled.value);
  } else {
    previousValue.value = newValue;
    emit('update:enabled', newValue);
  }
});

function handleToggle(value: boolean | null) {
  // The watch on internalEnabled will handle null values
  if (value !== null && value !== undefined) {
    internalEnabled.value = value;
  }
}

function enable() {
  if (props.disabled) return;
  internalEnabled.value = true;
  previousValue.value = true;
  emit('update:enabled', true);
}
</script>
