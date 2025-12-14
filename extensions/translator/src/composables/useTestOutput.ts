import { ref, nextTick } from 'vue';
import type { LanguageConfig } from '../types/language';

export function useTestOutput() {
  const finalizedParagraphsByLang = ref<Record<string, string[]>>({});
  const currentLiveTranslationByLang = ref<Record<string, string>>({});
  const testOutputLangRefs = ref<Record<string, HTMLDivElement>>({});

  const scrollTestOutputToBottom = async (languageCode: string) => {
    await nextTick();
    const element = testOutputLangRefs.value[languageCode];
    if (element) {
      element.scrollTop = element.scrollHeight;
    }
  };

  const addFinalizedParagraph = (languageCode: string, text: string) => {
    if (!finalizedParagraphsByLang.value[languageCode]) {
      finalizedParagraphsByLang.value[languageCode] = [];
    }
    finalizedParagraphsByLang.value[languageCode].push(text);
    scrollTestOutputToBottom(languageCode);
  };

  const updateLiveTranslation = (languageCode: string, text: string) => {
    currentLiveTranslationByLang.value[languageCode] = text;
  };

  const clearOutput = () => {
    finalizedParagraphsByLang.value = {};
    currentLiveTranslationByLang.value = {};
  };

  const initializeLanguages = (languages: LanguageConfig[]) => {
    languages.forEach((lang) => {
      if (!finalizedParagraphsByLang.value[lang.code]) {
        finalizedParagraphsByLang.value[lang.code] = [];
      }
      if (!currentLiveTranslationByLang.value[lang.code]) {
        currentLiveTranslationByLang.value[lang.code] = '';
      }
    });
  };

  return {
    finalizedParagraphsByLang,
    currentLiveTranslationByLang,
    testOutputLangRefs,
    addFinalizedParagraph,
    updateLiveTranslation,
    clearOutput,
    scrollTestOutputToBottom,
    initializeLanguages,
  };
}
