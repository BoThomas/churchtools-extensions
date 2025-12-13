import * as sdk from 'microsoft-cognitiveservices-speech-sdk';

export interface CaptioningConfig {
  inputLanguage: string; // Language code (e.g., 'de-DE')
  outputLanguages: string[]; // Array of language codes (e.g., ['en', 'es'])
  profanityOption: 'raw' | 'remove' | 'mask';
  stablePartialResultThreshold: string;
  phraseList: string;
  presentation?: {
    font: string;
    fontSize: string;
    margin: string;
    color: string;
    liveColor: string;
    background: string;
  };
}

export interface CaptioningCallbacks {
  onTranslating: (
    translations: Record<string, string>,
    original: string,
  ) => void;
  onTranslated: (
    translations: Record<string, string>,
    original: string,
  ) => void;
  onError: (error: string) => void;
}

// Type exports for Speech SDK types
export type {
  TranslationRecognizer,
  SpeechTranslationConfig,
  AudioConfig,
  TranslationRecognitionEventArgs,
  TranslationRecognitionCanceledEventArgs,
  SessionEventArgs,
} from 'microsoft-cognitiveservices-speech-sdk';

export class CaptioningService {
  private recognizer: sdk.TranslationRecognizer | null = null;
  private recognizerRunning = false;
  private config: CaptioningConfig;
  private callbacks: CaptioningCallbacks;
  private apiKey: string;
  private apiRegion: string;

  constructor(
    config: CaptioningConfig,
    callbacks: CaptioningCallbacks,
    apiKey: string,
    apiRegion: string,
  ) {
    this.config = config;
    this.callbacks = callbacks;
    this.apiKey = apiKey;
    this.apiRegion = apiRegion;

    if (!this.apiKey) {
      throw new Error('Missing Azure Speech API Service Key.');
    }
    if (!this.apiRegion) {
      throw new Error('Missing Azure Speech API Service Region.');
    }

    this.recognizer = this.createRecognizer();
    this.setupListeners();
  }

  private createRecognizer(): sdk.TranslationRecognizer {
    const speechConfig = sdk.SpeechTranslationConfig.fromSubscription(
      this.apiKey,
      this.apiRegion,
    );
    speechConfig.speechRecognitionLanguage = this.config.inputLanguage;

    // Add all target languages
    for (const lang of this.config.outputLanguages) {
      speechConfig.addTargetLanguage(lang);
    }

    // profanity filter
    let profanityOption = sdk.ProfanityOption.Masked;
    switch (this.config.profanityOption.toLowerCase()) {
      case 'raw':
        profanityOption = sdk.ProfanityOption.Raw;
        break;
      case 'remove':
        profanityOption = sdk.ProfanityOption.Removed;
        break;
    }
    speechConfig.setProfanity(profanityOption);

    // threshold
    speechConfig.setProperty(
      'SpeechServiceResponse_StablePartialResultThreshold',
      this.config.stablePartialResultThreshold,
    );

    // filter "hmm" and other noises
    speechConfig.setProperty(
      'SpeechServiceResponse_PostProcessingOption',
      'TrueText',
    );

    const audioConfig = sdk.AudioConfig.fromDefaultMicrophoneInput();
    const recognizer = new sdk.TranslationRecognizer(speechConfig, audioConfig);

    // phrase list
    if (this.config.phraseList) {
      const grammar = sdk.PhraseListGrammar.fromRecognizer(recognizer);
      grammar.addPhrases(this.config.phraseList.split(';'));
    }

    return recognizer;
  }

  private setupListeners(): void {
    if (!this.recognizer) return;

    this.recognizer.sessionStopped = (
      _sender: sdk.Recognizer,
      _event: sdk.SessionEventArgs,
    ) => {
      console.log('Session stopped.');
      this.stop();
    };

    this.recognizer.canceled = (
      _sender: sdk.Recognizer,
      event: sdk.TranslationRecognitionCanceledEventArgs,
    ) => {
      if (sdk.CancellationReason.EndOfStream === event.reason) {
        this.callbacks.onError('End of stream reached.');
      } else if (sdk.CancellationReason.Error === event.reason) {
        this.callbacks.onError(
          `Encountered error. Error code: ${event.errorCode}. Error details: ${event.errorDetails}`,
        );
      } else {
        this.callbacks.onError(
          `Request was cancelled for an unrecognized reason: ${event.reason}.`,
        );
      }
      this.stop();
    };

    this.recognizer.recognizing = (
      _sender: sdk.Recognizer,
      event: sdk.TranslationRecognitionEventArgs,
    ) => {
      if (sdk.ResultReason.TranslatingSpeech === event.result.reason) {
        // Collect all translations for the configured output languages
        const translations: Record<string, string> = {};
        for (const lang of this.config.outputLanguages) {
          const translation = event.result.translations.get(lang);
          if (translation && translation !== '') {
            translations[lang] = translation;
          }
        }

        if (Object.keys(translations).length > 0) {
          this.callbacks.onTranslating(translations, event.result.text);
        }
      }
    };

    this.recognizer.recognized = (
      _sender: sdk.Recognizer,
      event: sdk.TranslationRecognitionEventArgs,
    ) => {
      if (sdk.ResultReason.TranslatedSpeech === event.result.reason) {
        // Collect all translations for the configured output languages
        const translations: Record<string, string> = {};
        for (const lang of this.config.outputLanguages) {
          const translation = event.result.translations.get(lang);
          if (translation && translation !== '') {
            translations[lang] = translation;
          }
        }

        if (Object.keys(translations).length > 0) {
          this.callbacks.onTranslated(translations, event.result.text);
        }
      } else if (sdk.ResultReason.NoMatch === event.result.reason) {
        console.log('NOMATCH: Speech could not be recognized.');
      }
    };
  }

  public start(): void {
    if (!this.recognizer) return;

    this.recognizer.startContinuousRecognitionAsync();
    this.recognizerRunning = true;
  }

  public stop(): void {
    if (this.recognizerRunning && this.recognizer) {
      this.recognizerRunning = false;
      this.recognizer.stopContinuousRecognitionAsync();
    }
  }
}

export default CaptioningService;
