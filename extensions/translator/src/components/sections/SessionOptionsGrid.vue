<template>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    <!-- Display Name -->
    <InputTextField
      label="Session Display Name"
      :model-value="modelValue.session?.displayName ?? ''"
      @update:model-value="updateSession('displayName', $event || undefined)"
      placeholder="Auto-generated if empty"
      :disabled="disabled"
      input-id="session-display-name"
    >
      <template #info>
        <p class="text-sm">
          Optional custom name for this session. If left empty, a name will be
          auto-generated when the session starts.
        </p>
      </template>
    </InputTextField>

    <!-- Max Clients -->
    <InputNumberField
      label="Max Clients"
      :model-value="modelValue.session?.maxClients ?? null"
      @update:model-value="updateSession('maxClients', $event ?? undefined)"
      placeholder="Unlimited"
      :disabled="disabled"
      :min="1"
      :max="10000"
      input-id="session-max-clients"
    >
      <template #info>
        <div class="max-w-sm">
          <p class="text-sm">
            Maximum number of clients that can connect to this session. Leave
            empty for unlimited.
          </p>
          <p class="text-sm mt-2 text-surface-500">
            Note: Free Azure Web PubSub subscriptions support up to 20
            concurrent connections (19 readers + 1 operator).
          </p>
        </div>
      </template>
    </InputNumberField>

    <!-- Hidden -->
    <div class="flex flex-col gap-2 lg:pl-6">
      <label class="font-medium text-sm lg:block hidden">&nbsp;</label>
      <div class="flex items-center gap-2 md:h-[42px]">
        <Checkbox
          id="session-hidden"
          :model-value="modelValue.session?.hidden ?? false"
          @update:model-value="updateSession('hidden', $event)"
          :binary="true"
          :disabled="disabled"
        />
        <label for="session-hidden" class="font-medium text-sm cursor-pointer"
          >Hide from Session Overview</label
        >
        <Button
          icon="pi pi-question-circle"
          severity="secondary"
          text
          size="small"
          @click="(e) => hiddenPopover?.toggle(e)"
          :disabled="disabled"
        />
      </div>
      <Popover ref="hiddenPopover">
        <div class="max-w-sm">
          <p class="text-sm">
            When enabled, this session will not appear in the session overview.
          </p>
        </div>
      </Popover>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import Checkbox from '@churchtools-extensions/prime-volt/Checkbox.vue';
import Button from '@churchtools-extensions/prime-volt/Button.vue';
import Popover from '@churchtools-extensions/prime-volt/Popover.vue';
import InputTextField from '../form/InputTextField.vue';
import InputNumberField from '../form/InputNumberField.vue';
import type { TranslatorSettings } from '../../stores/translator';

interface Props {
  modelValue: TranslatorSettings;
  disabled?: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:modelValue': [value: TranslatorSettings];
  change: [];
}>();

const hiddenPopover = ref();

const updateSession = <
  K extends keyof NonNullable<TranslatorSettings['session']>,
>(
  key: K,
  value: NonNullable<TranslatorSettings['session']>[K],
) => {
  emit('update:modelValue', {
    ...props.modelValue,
    session: {
      ...(props.modelValue.session || { hidden: false }),
      [key]: value,
    },
  });
  emit('change');
};
</script>
