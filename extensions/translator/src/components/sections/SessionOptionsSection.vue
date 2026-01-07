<template>
  <ToggleableFieldset
    legend="Streamed Session"
    :enabled="enabled"
    :collapsed="collapsed"
    :toggleable="true"
    :disabled="disabled"
    info="Streams translation text over Azure Web PubSub in real-time. Allows remote readers to follow along."
    data-testid="fieldset-session-options"
    @update:enabled="$emit('update:enabled', $event)"
    @toggle="$emit('toggle', $event)"
  >
    <div class="pt-4">
      <SessionOptionsGrid
        :model-value="modelValue"
        :disabled="disabled"
        @update:model-value="$emit('update:modelValue', $event)"
        @change="$emit('change')"
      />
    </div>
  </ToggleableFieldset>
</template>

<script setup lang="ts">
import ToggleableFieldset from '../ToggleableFieldset.vue';
import SessionOptionsGrid from './SessionOptionsGrid.vue';
import type { TranslatorSettings } from '../../stores/translator';

interface Props {
  modelValue: TranslatorSettings;
  enabled?: boolean;
  collapsed?: boolean;
  disabled?: boolean;
}

withDefaults(defineProps<Props>(), {
  enabled: false,
  collapsed: true,
  disabled: false,
});

defineEmits<{
  'update:modelValue': [value: TranslatorSettings];
  'update:enabled': [value: boolean];
  change: [];
  toggle: [event: { value: boolean }];
}>();
</script>
