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
  const absoluteParagraphCounters: Record<string, number> = {};

  /**
   * Start generating lorem ipsum content for test presentation
   * @param isPaused - Reactive ref to pause state
   * @param operatorLanguages - All languages for operator view
   * @param presentationLanguages - Filtered languages for presentation view
   * @param addFinalizedParagraph - Callback to add a finalized paragraph (handles sliding window)
   * @param currentLiveTranslationByLang - Store for live translations
   * @param updatePresentationWindow - Callback to update presentation window
   * @param scrollToBottom - Optional callback to scroll operator preview to bottom
   */
  function startGeneration(
    isPaused: { value: boolean },
    operatorLanguages: LanguageConfig[],
    presentationLanguages: LanguageConfig[],
    addFinalizedParagraph: (languageCode: string, text: string) => void,
    currentLiveTranslationByLang: { value: Record<string, string> },
    updatePresentationWindow: (
      translations: Record<string, string>,
      isLive: boolean,
    ) => void,
    scrollToBottom?: () => void,
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

          // Scroll after live update
          scrollToBottom?.();
        } else {
          // Finalize the paragraph - different text per language with line numbers
          // Generate for ALL languages (operator view)
          for (const lang of operatorLanguages) {
            // Initialize counter if not present
            if (!absoluteParagraphCounters[lang.code]) {
              absoluteParagraphCounters[lang.code] = 0;
            }
            // Increment absolute counter (continues beyond array window)
            absoluteParagraphCounters[lang.code]++;
            const lineNumber = absoluteParagraphCounters[lang.code];

            const paragraph = lorem.generateParagraphs(1);
            const numberedParagraph = `${lineNumber}. ${paragraph}`;
            // Use callback which handles sliding window internally
            addFinalizedParagraph(lang.code, numberedParagraph);
          }

          currentLiveTranslationByLang.value = {};
          updatePresentationWindow({}, false);

          // Scroll after finalized paragraphs
          scrollToBottom?.();
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
    // Reset absolute counters
    for (const key in absoluteParagraphCounters) {
      delete absoluteParagraphCounters[key];
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
