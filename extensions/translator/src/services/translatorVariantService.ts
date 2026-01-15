import type { SettingVariant, TranslatorSettings } from '../types/translator';

export const DEFAULT_TRANSLATOR_SETTINGS: TranslatorSettings = {
  inputLanguage: 'de-DE',
  outputLanguages: ['en'],
  profanityOption: 'raw',
  stablePartialResultThreshold: '5',
  phraseList: '',
  presentation: {
    font: 'Arial',
    fontSize: '2em',
    margin: '1em 2em',
    color: 'white',
    liveColor: '#999',
    background: 'black',
    mode: 'split',
    showInputLanguage: false,
  },
  session: {
    hidden: false,
  },
  outputModes: {
    presentationEnabled: true,
    streamedSessionEnabled: false,
  },
};

export type UserPreferences = Record<string, { lastVariantId: number }>;

export class TranslatorVariantService {
  createDefaultVariant(): SettingVariant {
    return {
      name: 'Default',
      settings: { ...DEFAULT_TRANSLATOR_SETTINGS },
    };
  }

  resolveLastVariantId(
    userPrefs: UserPreferences,
    userId?: number,
  ): number | null {
    if (userId && userPrefs[userId.toString()]) {
      return userPrefs[userId.toString()].lastVariantId || null;
    }

    if (!userId) {
      const firstPref = Object.values(userPrefs)[0];
      return firstPref?.lastVariantId || null;
    }

    return null;
  }

  /**
   * Migrate old settings format (object with name/code) to new format (code string only)
   * Also migrates single outputLanguage to outputLanguages array
   */
  migrateSettings(settings: unknown): TranslatorSettings {
    const migrated = JSON.parse(JSON.stringify(settings ?? {}));

    // Migrate inputLanguage if it's an object
    if (
      typeof (settings as any)?.inputLanguage === 'object' &&
      (settings as any)?.inputLanguage?.code
    ) {
      migrated.inputLanguage = (settings as any).inputLanguage.code;
    }

    // Migrate old outputLanguage (string) to new outputLanguages (array)
    if (
      (settings as any)?.outputLanguage &&
      !(settings as any)?.outputLanguages
    ) {
      // Old format: single language as string or object
      if (typeof (settings as any).outputLanguage === 'string') {
        migrated.outputLanguages = [(settings as any).outputLanguage];
      } else if ((settings as any).outputLanguage?.code) {
        migrated.outputLanguages = [(settings as any).outputLanguage.code];
      }
      delete migrated.outputLanguage;
    } else if (
      (settings as any)?.outputLanguages &&
      !Array.isArray((settings as any).outputLanguages)
    ) {
      // Ensure outputLanguages is always an array
      migrated.outputLanguages = [(settings as any).outputLanguages];
    } else if (!(settings as any)?.outputLanguages) {
      // No output language set at all, use default
      migrated.outputLanguages = ['en'];
    }

    // Ensure presentation.mode exists (default to 'split')
    if (migrated.presentation && !migrated.presentation.mode) {
      migrated.presentation.mode = 'split';
    }

    // Ensure presentation.showInputLanguage exists (default to false)
    if (
      migrated.presentation &&
      migrated.presentation.showInputLanguage === undefined
    ) {
      migrated.presentation.showInputLanguage = false;
    }

    // Ensure presentation object exists with defaults
    migrated.presentation = {
      ...DEFAULT_TRANSLATOR_SETTINGS.presentation,
      ...(migrated.presentation || {}),
    };

    // Ensure outputModes exists with defaults
    if (!migrated.outputModes) {
      migrated.outputModes = {
        presentationEnabled: true,
        streamedSessionEnabled: false,
      };
    } else {
      // Ensure both keys are booleans
      migrated.outputModes.presentationEnabled =
        !!migrated.outputModes.presentationEnabled;
      migrated.outputModes.streamedSessionEnabled =
        !!migrated.outputModes.streamedSessionEnabled;
    }

    // Ensure session exists with defaults
    if (!migrated.session) {
      migrated.session = {
        hidden: false,
      };
    } else {
      // Ensure hidden is a boolean
      if (typeof migrated.session.hidden !== 'boolean') {
        migrated.session.hidden = false;
      }
      // Ensure maxClients is a number or undefined
      if (
        migrated.session.maxClients !== undefined &&
        typeof migrated.session.maxClients !== 'number'
      ) {
        migrated.session.maxClients = undefined;
      }
    }

    // Fill other defaults if missing
    if (!migrated.inputLanguage) {
      migrated.inputLanguage = DEFAULT_TRANSLATOR_SETTINGS.inputLanguage;
    }

    if (!migrated.profanityOption) {
      migrated.profanityOption = DEFAULT_TRANSLATOR_SETTINGS.profanityOption;
    }

    if (!migrated.stablePartialResultThreshold) {
      migrated.stablePartialResultThreshold =
        DEFAULT_TRANSLATOR_SETTINGS.stablePartialResultThreshold;
    }

    if (migrated.phraseList === undefined) {
      migrated.phraseList = '';
    }

    return migrated as TranslatorSettings;
  }
}
