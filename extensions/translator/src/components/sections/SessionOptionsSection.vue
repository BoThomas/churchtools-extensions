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
    <!-- Placeholder for future fields -->
    <div class="pt-4">
      <div
        class="border border-dashed border-surface-300 dark:border-surface-600 rounded-md p-6 text-center"
      >
        <p class="text-surface-600 dark:text-surface-300 font-medium mb-2">
          Session Configuration Coming Soon
        </p>
        <p class="text-sm text-surface-500 dark:text-surface-400">
          Future options will include:
        </p>
        <ul
          class="text-sm text-surface-500 dark:text-surface-400 mt-2 space-y-1"
        >
          <li>• Session naming and identification</li>
          <li>• Session recording and archival options</li>
          <li>• Reader management and moderation tools</li>
        </ul>
      </div>
    </div>
  </ToggleableFieldset>
</template>

<script setup lang="ts">
import ToggleableFieldset from '../ToggleableFieldset.vue';

interface Props {
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
  'update:enabled': [value: boolean];
  toggle: [event: { value: boolean }];
}>();
</script>
