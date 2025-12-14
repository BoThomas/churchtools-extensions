<template>
  <div v-if="isTestRunning" class="grid gap-4 grid-cols-1 md:grid-cols-2">
    <Fieldset v-for="lang in languages" :key="lang.code">
      <template #legend>
        <span class="font-semibold">
          {{
            getLanguageDisplayName(lang.code, lang.isInput ? 'input' : 'output')
          }}
        </span>
      </template>
      <div
        :ref="(el) => setLangRef(lang.code, el as HTMLDivElement)"
        class="space-y-2 max-h-96 overflow-y-auto"
      >
        <p
          v-for="(paragraph, index) in finalizedParagraphsByLang[lang.code] ||
          []"
          :key="'trans-' + lang.code + '-' + index"
          class="text-sm"
        >
          {{ paragraph }}
        </p>
        <p
          v-if="currentLiveTranslationByLang[lang.code]"
          class="text-sm text-surface-500"
        >
          {{ currentLiveTranslationByLang[lang.code] }}
        </p>
      </div>
    </Fieldset>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import Fieldset from '@churchtools-extensions/prime-volt/Fieldset.vue';
import { getLanguageDisplayName } from '../../utils/languageHelpers';
import type { LanguageConfig } from '../../types/language';

interface Props {
  isTestRunning: boolean;
  languages: LanguageConfig[];
  finalizedParagraphsByLang: Record<string, string[]>;
  currentLiveTranslationByLang: Record<string, string>;
}

const props = defineProps<Props>();

// Refs for scrollable containers
const langRefs = ref<Record<string, HTMLDivElement>>({});

// Set ref for a language container
function setLangRef(langCode: string, el: HTMLDivElement) {
  if (el) {
    langRefs.value[langCode] = el;
  }
}

// Expose langRefs for parent to scroll
defineExpose({
  langRefs,
});
</script>
