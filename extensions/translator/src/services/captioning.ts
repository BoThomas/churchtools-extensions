import * as sdk from 'microsoft-cognitiveservices-speech-sdk';

export interface CaptioningConfig {
  inputLanguage: { name: string; code: string };
  outputLanguage: { name: string; code: string };
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
  onTranslating: (translation: string, original: string) => void;
  onTranslated: (translation: string, original: string) => void;
  onError: (error: string) => void;
}

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
    speechConfig.speechRecognitionLanguage = this.config.inputLanguage.code;
    speechConfig.addTargetLanguage(this.config.outputLanguage.code);

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

    this.recognizer.sessionStopped = () => {
      console.log('Session stopped.');
      this.stop();
    };

    this.recognizer.canceled = (_s: any, e: any) => {
      if (sdk.CancellationReason.EndOfStream === e.reason) {
        this.callbacks.onError('End of stream reached.');
      } else if (sdk.CancellationReason.Error === e.reason) {
        this.callbacks.onError(
          `Encountered error. Error code: ${e.errorCode}. Error details: ${e.errorDetails}`,
        );
      } else {
        this.callbacks.onError(
          `Request was cancelled for an unrecognized reason: ${e.reason}.`,
        );
      }
      this.stop();
    };

    this.recognizer.recognizing = (_s: any, e: any) => {
      const translation = e.result.translations.get(
        this.config.outputLanguage.code,
      );
      if (
        sdk.ResultReason.TranslatingSpeech === e.result.reason &&
        translation &&
        translation !== ''
      ) {
        this.callbacks.onTranslating(translation, e.result.text);
      }
    };

    this.recognizer.recognized = (_s: any, e: any) => {
      const translation = e.result.translations.get(
        this.config.outputLanguage.code,
      );
      if (
        sdk.ResultReason.TranslatedSpeech === e.result.reason &&
        translation &&
        translation !== ''
      ) {
        this.callbacks.onTranslated(translation, e.result.text);
      } else if (sdk.ResultReason.NoMatch === e.result.reason) {
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
