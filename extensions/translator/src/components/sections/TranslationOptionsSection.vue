<template>
  <Fieldset
    legend="Translation"
    :collapsed="collapsed"
    :toggleable="true"
    data-testid="fieldset-translation-options"
    @toggle="$emit('toggle', $event)"
  >
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Input Language -->
      <LanguageSelectField
        label="Spoken Input Language"
        :model-value="modelValue.inputLanguage"
        @update:model-value="
          (value) => updateSetting('inputLanguage', value as string)
        "
        :languages="inputLanguages"
        :disabled="disabled"
        placeholder="Select input language"
        input-id="input-lang"
        :invalid="inputLanguageValid === false"
      >
        <template #info>
          <p class="text-sm">The spoken language to be translated.</p>
        </template>
      </LanguageSelectField>

      <!-- Output Languages -->
      <LanguageSelectField
        label="Written Output Languages"
        :model-value="modelValue.outputLanguages"
        @update:model-value="
          (value) => updateSetting('outputLanguages', value as string[])
        "
        :languages="outputLanguages"
        :disabled="disabled"
        placeholder="Select output languages"
        input-id="output-langs"
        :invalid="outputLanguagesValid === false"
        multiple
      >
        <template #info>
          <p class="text-sm">
            The written languages to which speech is translated. Multiple
            languages can be selected.
          </p>
        </template>
      </LanguageSelectField>

      <!-- Profanity Filter -->
      <SelectField
        label="Profanity Option"
        :model-value="modelValue.profanityOption"
        @update:model-value="
          (value) =>
            updateSetting('profanityOption', value as 'raw' | 'remove' | 'mask')
        "
        :options="profanityOptions"
        :disabled="disabled"
        placeholder="Select profanity option"
        input-id="profanity"
      >
        <template #info>
          <div class="max-w-xs">
            <p class="text-sm mb-2">Setting for dealing with profanity:</p>
            <p class="text-sm">
              <strong>raw</strong>: swear words are kept<br />
              <strong>remove</strong>: swear words are removed<br />
              <strong>mask</strong>: swear words are replaced by ***
            </p>
          </div>
        </template>
      </SelectField>

      <!-- Stable Partial Result Threshold -->
      <SelectField
        label="Partial Result Threshold"
        :model-value="modelValue.stablePartialResultThreshold"
        @update:model-value="
          (value) =>
            updateSetting('stablePartialResultThreshold', value as string)
        "
        :options="partialThresholds"
        :disabled="disabled"
        placeholder="Select threshold"
        input-id="threshold"
      >
        <template #info>
          <div class="max-w-sm">
            <p class="text-sm mb-2">
              Real-time translation presents tradeoffs with respect to latency
              versus accuracy. You could show the text as soon as possible.
              However, if you can accept some latency, you can improve the
              accuracy of the caption by setting a higher 'partial results
              threshold'.
            </p>
            <p class="text-sm">
              The value that you set is the number of times a word has to be
              recognized before the Speech service returns a live translation.
            </p>
          </div>
        </template>
      </SelectField>

      <!-- Phrase List -->
      <div class="md:col-span-2">
        <InputTextField
          label="Phrase List"
          :model-value="modelValue.phraseList"
          @update:model-value="
            (value) => updateSetting('phraseList', value as string)
          "
          placeholder="Oeschelbronn;Schaan;Paul"
          :disabled="disabled"
          input-id="phrases"
        >
          <template #info>
            <div class="max-w-sm">
              <p class="text-sm mb-2">
                A phrase list is a list of words or phrases that you can provide
                before starting the translation. Adding a phrase to a phrase
                list increases its importance, thus making it more likely to be
                recognized.
              </p>
              <p class="text-sm mb-2">
                Examples of phrases include: Names, Geographical locations,
                Homonyms, Words or acronyms unique to your industry or
                organization.
              </p>
              <p class="text-sm">
                Phrases need to be separated by a semicolon.
              </p>
            </div>
          </template>
        </InputTextField>
      </div>
    </div>
  </Fieldset>
</template>

<script setup lang="ts">
import Fieldset from '@churchtools-extensions/prime-volt/Fieldset.vue';
import LanguageSelectField from '../form/LanguageSelectField.vue';
import SelectField from '../form/SelectField.vue';
import InputTextField from '../form/InputTextField.vue';
import translationOptions from '../../translation-options.json';
import type { TranslatorSettings } from '../../stores/translator';

interface Props {
  modelValue: TranslatorSettings;
  disabled?: boolean;
  inputLanguageValid?: boolean;
  outputLanguagesValid?: boolean;
  collapsed?: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:modelValue': [value: TranslatorSettings];
  change: [];
  toggle: [event: { value: boolean }];
}>();

const inputLanguages = translationOptions.inputLanguages;
const outputLanguages = translationOptions.outputLanguages;
const profanityOptions = translationOptions.profanityOptions;
const partialThresholds = translationOptions.partialThresholds;

const updateSetting = <K extends keyof TranslatorSettings>(
  key: K,
  value: TranslatorSettings[K],
) => {
  emit('update:modelValue', {
    ...props.modelValue,
    [key]: value,
  });
  emit('change');
};
</script>
