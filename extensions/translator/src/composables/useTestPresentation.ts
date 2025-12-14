import { LoremIpsum } from 'lorem-ipsum';
import type { LanguageConfig } from '../types/language';

/**
 * Composable for managing test presentation with Lorem Ipsum content
 * Generates fake translations for testing presentation windows
 */
export function useTestPresentation() {
  // Lorem Ipsum generator
  const lorem = new LoremIpsum({
    sentencesPerParagraph: {
      max: 5,
      min: 1,
    },
    wordsPerSentence: {
      max: 20,
      min: 4,
    },
  });

  let testPresentationInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Start generating lorem ipsum content for test presentation
   * @param isPaused - Reactive ref to pause state
   * @param operatorLanguages - All languages for operator view
   * @param presentationLanguages - Filtered languages for presentation view
   * @param finalizedParagraphsByLang - Store for finalized paragraphs
   * @param currentLiveTranslationByLang - Store for live translations
   * @param updatePresentationWindow - Callback to update presentation window
   */
  function startGeneration(
    isPaused: { value: boolean },
    operatorLanguages: LanguageConfig[],
    presentationLanguages: LanguageConfig[],
    finalizedParagraphsByLang: { value: Record<string, string[]> },
    currentLiveTranslationByLang: { value: Record<string, string> },
    updatePresentationWindow: (
      translations: Record<string, string>,
      isLive: boolean,
    ) => void,
  ) {
    stopGeneration();

    let showLive = true;
    testPresentationInterval = setInterval(() => {
      if (!isPaused.value) {
        if (showLive) {
          // Show live translation (preview) - different text per language
          const liveTranslations: Record<string, string> = {};

          // Generate for ALL languages (operator view)
          for (const lang of operatorLanguages) {
            const liveText = lorem.generateSentences(1);
            liveTranslations[lang.code] = liveText;
            currentLiveTranslationByLang.value[lang.code] = liveText;
          }

          // But only send presentation languages to windows
          const presentationLiveTranslations: Record<string, string> = {};
          for (const lang of presentationLanguages) {
            presentationLiveTranslations[lang.code] =
              liveTranslations[lang.code];
          }
          updatePresentationWindow(presentationLiveTranslations, true);
        } else {
          // Finalize the paragraph - different text per language with line numbers
          // Generate for ALL languages (operator view)
          for (const lang of operatorLanguages) {
            // Ensure array exists for this language
            if (!finalizedParagraphsByLang.value[lang.code]) {
              finalizedParagraphsByLang.value[lang.code] = [];
            }
            const paragraph = lorem.generateParagraphs(1);
            const lineNumber =
              finalizedParagraphsByLang.value[lang.code].length + 1;
            const numberedParagraph = `${lineNumber}. ${paragraph}`;
            finalizedParagraphsByLang.value[lang.code].push(numberedParagraph);
          }

          currentLiveTranslationByLang.value = {};
          updatePresentationWindow({}, false);
        }
        showLive = !showLive;
      }
    }, 800);
  }

  /**
   * Stop generating lorem ipsum content
   */
  function stopGeneration() {
    if (testPresentationInterval) {
      clearInterval(testPresentationInterval);
      testPresentationInterval = null;
    }
  }

  /**
   * Check if generation is currently running
   */
  function isGenerating(): boolean {
    return testPresentationInterval !== null;
  }

  return {
    startGeneration,
    stopGeneration,
    isGenerating,
  };
}
