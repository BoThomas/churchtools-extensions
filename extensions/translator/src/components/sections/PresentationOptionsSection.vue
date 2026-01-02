<template>
  <!-- Toggleable mode when WebPubSub enabled -->
  <ToggleableFieldset
    v-if="toggleableEnabled !== undefined"
    legend="Presentation Options"
    :enabled="toggleableEnabled"
    :collapsed="collapsed"
    :toggleable="true"
    @update:enabled="$emit('update:enabled', $event)"
    @toggle="$emit('toggle', $event)"
  >
    <PresentationOptionsGrid
      :model-value="modelValue"
      :disabled="disabled"
      :presentation-languages-count="presentationLanguagesCount"
      @update:model-value="$emit('update:modelValue', $event)"
      @change="$emit('change')"
    />
  </ToggleableFieldset>

  <!-- Regular mode -->
  <Fieldset
    v-else
    legend="Presentation Options"
    :collapsed="collapsed"
    :toggleable="true"
    @toggle="$emit('toggle', $event)"
  >
    <PresentationOptionsGrid
      :model-value="modelValue"
      :disabled="disabled"
      :presentation-languages-count="presentationLanguagesCount"
      @update:model-value="$emit('update:modelValue', $event)"
      @change="$emit('change')"
    />
  </Fieldset>
</template>

<script setup lang="ts">
import Fieldset from '@churchtools-extensions/prime-volt/Fieldset.vue';
import ToggleableFieldset from '../ToggleableFieldset.vue';
import PresentationOptionsGrid from './PresentationOptionsGrid.vue';
import type { TranslatorSettings } from '../../stores/translator';

interface Props {
  modelValue: TranslatorSettings;
  disabled?: boolean;
  presentationLanguagesCount?: number;
  collapsed?: boolean;
  toggleableEnabled?: boolean;
}

defineProps<Props>();

defineEmits<{
  'update:modelValue': [value: TranslatorSettings];
  'update:enabled': [value: boolean];
  change: [];
  toggle: [event: { value: boolean }];
}>();
</script>
