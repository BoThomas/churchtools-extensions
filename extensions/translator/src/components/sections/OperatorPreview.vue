<template>
  <Fieldset
    legend="Operator Preview"
    :toggleable="true"
    :collapsed="!isOpen"
    @toggle="onToggle"
    data-testid="operator-preview"
  >
    <!-- Placeholder when nothing is running -->
    <div
      v-if="!isActive"
      class="text-surface-500 text-sm py-4"
      data-testid="operator-preview-placeholder"
    >
      Start a translation test or presentation to see the live preview here.
    </div>

    <!-- Active translation grid -->
    <div
      v-else
      class="grid gap-4 grid-cols-1 md:grid-cols-2"
      data-testid="operator-preview-content"
    >
      <Fieldset
        v-for="lang in languages"
        :key="lang.code"
        :data-testid="`operator-preview-${lang.code}`"
      >
        <template #legend>
          <span class="font-semibold">
            {{
              getLanguageDisplayName(
                lang.code,
                lang.isInput ? 'input' : 'output',
              )
            }}
          </span>
        </template>
        <div
          :ref="(el) => setLangRef(lang.code, el as HTMLDivElement)"
          class="space-y-2 max-h-96 overflow-y-auto"
          :data-testid="`operator-preview-content-${lang.code}`"
        >
          <p
            v-for="(paragraph, index) in finalizedParagraphsByLang[lang.code] ||
            []"
            :key="'trans-' + lang.code + '-' + index"
            class="text-sm"
            :data-testid="`operator-preview-finalized-${lang.code}-${index}`"
          >
            {{ paragraph }}
          </p>
          <p
            v-if="currentLiveTranslationByLang[lang.code]"
            class="text-sm text-surface-500"
            :data-testid="`operator-preview-live-${lang.code}`"
          >
            {{ currentLiveTranslationByLang[lang.code] }}
          </p>
        </div>
      </Fieldset>
    </div>
  </Fieldset>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import Fieldset from '@churchtools-extensions/prime-volt/Fieldset.vue';
import { getLanguageDisplayName } from '../../utils/languageHelpers';
import type { LanguageConfig } from '../../types/language';

interface Props {
  isOpen: boolean;
  isActive: boolean;
  languages: LanguageConfig[];
  finalizedParagraphsByLang: Record<string, string[]>;
  currentLiveTranslationByLang: Record<string, string>;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  toggle: [event: { value: boolean }];
}>();

// Refs for scrollable containers
const langRefs = ref<Record<string, HTMLDivElement>>({});

// Set ref for a language container
function setLangRef(langCode: string, el: HTMLDivElement) {
  if (el) {
    langRefs.value[langCode] = el;
  }
}

// Handle toggle event from Fieldset
function onToggle(event: { value: boolean }) {
  emit('toggle', event);
}

// Expose langRefs for parent to scroll
defineExpose({
  langRefs,
});
</script>
