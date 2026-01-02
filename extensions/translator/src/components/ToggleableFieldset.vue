<template>
  <div class="relative">
    <!-- ToggleButton positioned next to the legend text, overlaying the top border -->
    <div
      class="absolute left-60 top-5 z-20 bg-surface-0 dark:bg-surface-900 px-3"
      style="transform: translateY(-50%)"
    >
      <ToggleButton
        v-model="internalEnabled"
        :on-label="enabledLabel"
        :off-label="disabledLabel"
        :disabled="disabled"
        @update:model-value="handleToggle"
      />
    </div>

    <!-- Standard Fieldset with its native collapse/expand -->
    <Fieldset
      :legend="legend"
      :collapsed="collapsed"
      :toggleable="toggleable"
      @toggle="emit('toggle', $event)"
    >
      <!-- Content with optional disabled overlay -->
      <div class="relative">
        <div
          v-if="!internalEnabled"
          class="absolute inset-0 bg-surface-0/50 dark:bg-surface-900/50 backdrop-blur-[1px] z-10 rounded pointer-events-none"
        />
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
import ToggleButton from '@churchtools-extensions/prime-volt/ToggleButton.vue';

interface Props {
  legend: string;
  enabled?: boolean;
  collapsed?: boolean;
  toggleable?: boolean;
  disabled?: boolean;
  enabledLabel?: string;
  disabledLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  enabled: true,
  collapsed: false,
  toggleable: true,
  disabled: false,
  enabledLabel: 'Enabled',
  disabledLabel: 'Disabled',
});

const emit = defineEmits<{
  'update:enabled': [value: boolean];
  toggle: [event: { value: boolean }];
}>();

const internalEnabled = ref(props.enabled);

// Watch for external changes to enabled prop
watch(
  () => props.enabled,
  (newValue) => {
    internalEnabled.value = newValue;
  },
);

function handleToggle(value: boolean) {
  emit('update:enabled', value);
}
</script>
