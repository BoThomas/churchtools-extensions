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
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <!-- Font -->
      <SelectField
        label="Font"
        :model-value="modelValue.presentation.font"
        @update:model-value="updatePresentation('font', $event)"
        :options="presentationFonts"
        :disabled="disabled"
        placeholder="Select font"
        input-id="font"
      >
        <template #option="{ option }">
          <span :style="{ fontFamily: option }">{{ option }}</span>
        </template>
        <template #info>
          <p class="text-sm">
            Font used to display the translated text. Make sure the font has all
            the characters of the selected output language.
          </p>
        </template>
      </SelectField>

      <!-- Font Size -->
      <InputTextField
        label="Font Size"
        :model-value="modelValue.presentation.fontSize"
        @update:model-value="updatePresentation('fontSize', $event)"
        placeholder="2em / 30px"
        :disabled="disabled"
        input-id="font-size"
      >
        <template #info>
          <p class="text-sm">
            Font size of the translated text. You can specify the size in any
            CSS unit (px, em, rem...).
          </p>
        </template>
      </InputTextField>

      <!-- Margin -->
      <InputTextField
        label="Paragraph Margin"
        :model-value="modelValue.presentation.margin"
        @update:model-value="updatePresentation('margin', $event)"
        placeholder="1em 2em"
        :disabled="disabled"
        input-id="margin"
      >
        <template #info>
          <div class="max-w-sm">
            <p class="text-sm">
              Distance of the translated paragraphs to each other and to the
              screen border. Specifications in 'px' and in 'em' are allowed. To
              control all sides individually, e.g. '1em 4em 1em 2em' can be used
              (top, right, bottom, left).
            </p>
          </div>
        </template>
      </InputTextField>

      <!-- Text Color -->
      <InputTextField
        label="Text Color"
        :model-value="modelValue.presentation.color"
        @update:model-value="updatePresentation('color', $event)"
        placeholder="white / #fff"
        :disabled="disabled"
        input-id="color"
      >
        <template #info>
          <p class="text-sm">
            Color of the translated text. You can specify colors with html
            names, rgb, and hex.
          </p>
        </template>
      </InputTextField>

      <!-- Live Text Color -->
      <InputTextField
        label="Live Text Color"
        :model-value="modelValue.presentation.liveColor"
        @update:model-value="updatePresentation('liveColor', $event)"
        placeholder="gray / #999"
        :disabled="disabled"
        input-id="live-color"
      >
        <template #info>
          <p class="text-sm">
            Color of the live translated text. You can specify colors with html
            names, rgb, and hex.
          </p>
        </template>
      </InputTextField>

      <!-- Background -->
      <InputTextField
        label="Background"
        :model-value="modelValue.presentation.background"
        @update:model-value="updatePresentation('background', $event)"
        placeholder="black / #000"
        :disabled="disabled"
        input-id="background"
      >
        <template #info>
          <div class="max-w-sm">
            <p class="text-sm">
              Background of the presentation view. You can specify:
            </p>
            <ul class="text-sm mt-2 ml-4 list-disc space-y-1">
              <li>Colors: html names, rgb, or hex values</li>
              <li>
                Images:
                <code class="text-xs"
                  >center / cover no-repeat
                  url(https://picsum.photos/1920/1080)</code
                >
              </li>
              <li>
                Gradients:
                <code class="text-xs">linear-gradient(red, yellow)</code>
              </li>
            </ul>
          </div>
        </template>
      </InputTextField>

      <!-- Presentation Mode -->
      <SelectField
        label="Presentation Mode"
        :model-value="modelValue.presentation.mode"
        @update:model-value="updatePresentation('mode', $event)"
        :options="presentationModeOptions"
        :disabled="disabled || (presentationLanguagesCount ?? 0) <= 1"
        placeholder="Select presentation mode"
        option-label="name"
        option-value="value"
        input-id="presentation-mode"
      >
        <template #info>
          <div class="max-w-sm">
            <p class="text-sm">
              <strong>Split-screen:</strong> Shows all languages in a single
              window with split layout (supports 2-6 languages total, including
              input language if enabled).
            </p>
            <p class="text-sm mt-2">
              <strong>Multi-window:</strong> Opens a separate window for each
              language. Each window shows content for one language only.
            </p>
            <p class="text-sm mt-2 text-surface-500">
              Note: Single language always uses full-screen display without
              splitting.
            </p>
          </div>
        </template>
      </SelectField>

      <!-- Show Input Language -->
      <div class="flex flex-col gap-2 md:pl-6">
        <label class="font-medium text-sm md:block hidden">&nbsp;</label>
        <div class="flex items-center gap-2 md:h-[42px]">
          <Checkbox
            id="show-input-language"
            :model-value="modelValue.presentation.showInputLanguage"
            @update:model-value="
              updatePresentation('showInputLanguage', $event)
            "
            :binary="true"
            :disabled="disabled"
          />
          <label
            for="show-input-language"
            class="font-medium text-sm cursor-pointer"
            >Show Input Language</label
          >
          <Button
            icon="pi pi-question-circle"
            severity="secondary"
            text
            size="small"
            @click="(e) => showInputLangPopover?.toggle(e)"
            :disabled="disabled"
          />
        </div>
        <Popover ref="showInputLangPopover">
          <div class="max-w-sm">
            <p class="text-sm">
              When enabled, the original spoken input will be displayed
              alongside the translations in the presentation view. In
              split-screen mode, the input will appear as an additional pane. In
              multi-window mode, a separate window for the input language will
              be opened.
            </p>
          </div>
        </Popover>
      </div>
    </div>
  </ToggleableFieldset>

  <!-- Regular mode -->
  <Fieldset
    v-else
    legend="Presentation Options"
    :collapsed="collapsed"
    :toggleable="true"
    @toggle="$emit('toggle', $event)"
  >
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <!-- Same content - will be duplicated for now -->
      <!-- TODO: Extract to component to avoid duplication -->
      <p class="text-sm text-surface-500 col-span-full">
        Content same as toggleable mode above
      </p>
    </div>
  </Fieldset>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import Fieldset from '@churchtools-extensions/prime-volt/Fieldset.vue';
import ToggleableFieldset from '../ToggleableFieldset.vue';
import Checkbox from '@churchtools-extensions/prime-volt/Checkbox.vue';
import Button from '@churchtools-extensions/prime-volt/Button.vue';
import Popover from '@churchtools-extensions/prime-volt/Popover.vue';
import SelectField from '../form/SelectField.vue';
import InputTextField from '../form/InputTextField.vue';
import translationOptions from '../../translation-options.json';
import type { TranslatorSettings } from '../../stores/translator';

interface Props {
  modelValue: TranslatorSettings;
  disabled?: boolean;
  presentationLanguagesCount?: number;
  collapsed?: boolean;
  toggleableEnabled?: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:modelValue': [value: TranslatorSettings];
  'update:enabled': [value: boolean];
  change: [];
  toggle: [event: { value: boolean }];
}>();

const showInputLangPopover = ref();

const presentationFonts = translationOptions.presentationFonts;
const presentationModeOptions = [
  { name: 'Split-screen (2-6 languages)', value: 'split' },
  { name: 'Multi-window', value: 'multi-window' },
];

const updatePresentation = <K extends keyof TranslatorSettings['presentation']>(
  key: K,
  value: TranslatorSettings['presentation'][K],
) => {
  emit('update:modelValue', {
    ...props.modelValue,
    presentation: {
      ...props.modelValue.presentation,
      [key]: value,
    },
  });
  emit('change');
};
</script>
