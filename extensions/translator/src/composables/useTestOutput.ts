import { ref, nextTick } from 'vue';
import type { LanguageConfig } from '../types/language';
import { PRESENTATION_PARAGRAPH_WINDOW_SIZE } from '../config';

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
    // Use spread to create new array for reliable reactivity, then apply sliding window
    const paragraphs = [...finalizedParagraphsByLang.value[languageCode], text];
    finalizedParagraphsByLang.value[languageCode] = paragraphs.slice(
      -PRESENTATION_PARAGRAPH_WINDOW_SIZE,
    );
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
