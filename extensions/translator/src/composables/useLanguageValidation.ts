import { computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useSettingsStore } from '../stores/settings';
import translationOptions from '../translation-options.json';
import type { LanguageConfig } from '../types/language';

export function useLanguageValidation() {
  const store = useSettingsStore();
  const { settings } = storeToRefs(store);

  const inputLanguageValid = computed(() => {
    return translationOptions.inputLanguages.some(
      (lang) => lang.code === settings.value.inputLanguage,
    );
  });

  const outputLanguagesValid = computed(() => {
    if (
      !settings.value.outputLanguages ||
      settings.value.outputLanguages.length === 0
    ) {
      return false;
    }
    return settings.value.outputLanguages.every((code) =>
      translationOptions.outputLanguages.some((lang) => lang.code === code),
    );
  });

  const hasInvalidLanguages = computed(() => {
    return !inputLanguageValid.value || !outputLanguagesValid.value;
  });

  // Show warning when loading/switching variants with invalid languages,
  // and keep showing it after loading if languages are still invalid
  const shouldShowInvalidLanguageWarning = computed(() => {
    return hasInvalidLanguages.value;
  });

  const allLanguages = computed<LanguageConfig[]>(() => {
    const languages: LanguageConfig[] = [];

    if (inputLanguageValid.value) {
      languages.push({ code: settings.value.inputLanguage, isInput: true });
    }

    if (outputLanguagesValid.value) {
      settings.value.outputLanguages.forEach((code) => {
        languages.push({ code, isInput: false });
      });
    }

    return languages;
  });

  const operatorLanguages = computed<LanguageConfig[]>(() => {
    // Test mode: always show input language for operator
    return allLanguages.value;
  });

  const presentationLanguages = computed<LanguageConfig[]>(() => {
    // Presentation: respect showInputLanguage setting
    if (settings.value.presentation.showInputLanguage) {
      return allLanguages.value;
    } else {
      return allLanguages.value.filter((lang) => !lang.isInput);
    }
  });

  const hasTooManyLanguagesForSplit = computed(() => {
    // Split mode supports max 6 languages
    return (
      settings.value.presentation.mode === 'split' &&
      presentationLanguages.value.length > 6
    );
  });

  return {
    inputLanguageValid,
    outputLanguagesValid,
    hasInvalidLanguages,
    shouldShowInvalidLanguageWarning,
    allLanguages,
    operatorLanguages,
    presentationLanguages,
    hasTooManyLanguagesForSplit,
  };
}
