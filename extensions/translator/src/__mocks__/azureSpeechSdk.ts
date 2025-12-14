import { vi } from 'vitest';

/**
 * Mock for Microsoft Azure Speech SDK
 * Supports scenario-based testing with configurable events and timing
 */

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface RecognitionEvent {
  type: 'recognizing' | 'recognized' | 'canceled' | 'sessionStopped';
  delay: number; // milliseconds
  data?: {
    text?: string;
    translations?: Record<string, string>;
    reason?: number;
    error?: {
      code?: string;
      message?: string;
      errorCode?: string;
      errorDetails?: string;
    };
  };
}

export interface Scenario {
  name: string;
  events: RecognitionEvent[];
}

export interface RecognizerState {
  isRunning: boolean;
  config: {
    inputLanguage: string;
    outputLanguages: string[];
    profanityOption: number;
    stablePartialResultThreshold: string;
    phraseList: string[];
  } | null;
  eventsEmitted: Array<{ type: string; timestamp: number; data?: any }>;
}

export interface MockTimingConfig {
  mode: 'instant' | 'fast' | 'realistic';
  multiplier: number;
}

// ============================================================================
// SDK Constants (matching microsoft-cognitiveservices-speech-sdk)
// ============================================================================

export const CancellationReason = {
  Error: 1,
  EndOfStream: 2,
} as const;

export const ResultReason = {
  TranslatingSpeech: 3,
  TranslatedSpeech: 4,
  NoMatch: 5,
} as const;

export const ProfanityOption = {
  Raw: 0,
  Masked: 1,
  Removed: 2,
} as const;

// ============================================================================
// Mock Azure Speech SDK Manager
// ============================================================================

class MockAzureSpeechSDK {
  private currentScenario: Scenario | null = null;
  private activeRecognizer: MockTranslationRecognizer | null = null;
  private timingConfig: MockTimingConfig = {
    mode: 'instant',
    multiplier: 1,
  };
  private eventLog: Array<{ type: string; timestamp: number; data?: any }> = [];

  /**
   * Set the active scenario for the next recognizer creation
   */
  setScenario(scenario: Scenario | string): void {
    if (typeof scenario === 'string') {
      const predefinedScenario = SCENARIOS[scenario as keyof typeof SCENARIOS];
      if (!predefinedScenario) {
        throw new Error(`Unknown scenario: ${scenario}`);
      }
      this.currentScenario = predefinedScenario;
    } else {
      this.currentScenario = scenario;
    }
  }

  /**
   * Configure timing behavior for events
   */
  setTiming(config: Partial<MockTimingConfig>): void {
    this.timingConfig = { ...this.timingConfig, ...config };
  }

  /**
   * Get current recognizer state for assertions
   */
  getRecognizerState(): RecognizerState {
    if (!this.activeRecognizer) {
      return {
        isRunning: false,
        config: null,
        eventsEmitted: this.eventLog,
      };
    }

    return {
      isRunning: this.activeRecognizer._isRunning,
      config: this.activeRecognizer._config,
      eventsEmitted: this.eventLog,
    };
  }

  /**
   * Reset all mock state
   */
  reset(): void {
    if (this.activeRecognizer) {
      this.activeRecognizer._cleanup();
    }
    this.currentScenario = null;
    this.activeRecognizer = null;
    this.timingConfig = { mode: 'instant', multiplier: 1 };
    this.eventLog = [];
  }

  /**
   * Internal: Register an event for debugging
   */
  _logEvent(type: string, data?: any): void {
    this.eventLog.push({ type, timestamp: Date.now(), data });
  }

  /**
   * Internal: Calculate actual delay based on timing config
   */
  _calculateDelay(baseDelay: number): number {
    if (this.timingConfig.mode === 'instant') {
      return 0;
    }
    return baseDelay * this.timingConfig.multiplier;
  }

  /**
   * Internal: Register the active recognizer
   */
  _registerRecognizer(recognizer: MockTranslationRecognizer): void {
    this.activeRecognizer = recognizer;
  }

  /**
   * Internal: Get current scenario
   */
  _getCurrentScenario(): Scenario | null {
    return this.currentScenario;
  }
}

// Global singleton instance
export const mockAzureSpeech = new MockAzureSpeechSDK();

// ============================================================================
// Mock TranslationRecognizer
// ============================================================================

export class MockTranslationRecognizer {
  public sessionStopped: any = null;
  public canceled: any = null;
  public recognizing: any = null;
  public recognized: any = null;

  _isRunning = false;
  _config: RecognizerState['config'] = null;
  private eventTimeouts: NodeJS.Timeout[] = [];

  startContinuousRecognitionAsync = vi.fn((successCallback?: () => void) => {
    this._isRunning = true;
    mockAzureSpeech._logEvent('startContinuousRecognitionAsync');

    // Trigger success callback immediately
    if (successCallback) {
      setTimeout(successCallback, 0);
    }

    // Emit scenario events
    const scenario = mockAzureSpeech._getCurrentScenario();
    if (scenario) {
      this._emitScenarioEvents(scenario);
    }
  });

  stopContinuousRecognitionAsync = vi.fn((successCallback?: () => void) => {
    this._isRunning = false;
    mockAzureSpeech._logEvent('stopContinuousRecognitionAsync');
    this._cleanup();

    // Trigger success callback immediately
    if (successCallback) {
      setTimeout(successCallback, 0);
    }
  });

  private _emitScenarioEvents(scenario: Scenario): void {
    for (const event of scenario.events) {
      const delay = mockAzureSpeech._calculateDelay(event.delay);
      const timeout = setTimeout(() => {
        if (!this._isRunning) return;

        mockAzureSpeech._logEvent(event.type, event.data);

        switch (event.type) {
          case 'recognizing':
            this._emitRecognizing(event.data);
            break;
          case 'recognized':
            this._emitRecognized(event.data);
            break;
          case 'canceled':
            this._emitCanceled(event.data);
            break;
          case 'sessionStopped':
            this._emitSessionStopped();
            break;
        }
      }, delay);

      this.eventTimeouts.push(timeout);
    }
  }

  private _emitRecognizing(data?: RecognitionEvent['data']): void {
    if (this.recognizing) {
      const translations = new Map(Object.entries(data?.translations || {}));
      const event = {
        result: {
          reason: data?.reason ?? ResultReason.TranslatingSpeech,
          text: data?.text || '',
          translations,
        },
      };
      this.recognizing(null, event);
    }
  }

  private _emitRecognized(data?: RecognitionEvent['data']): void {
    if (this.recognized) {
      const translations = new Map(Object.entries(data?.translations || {}));
      const event = {
        result: {
          reason: data?.reason ?? ResultReason.TranslatedSpeech,
          text: data?.text || '',
          translations,
        },
      };
      this.recognized(null, event);
    }
  }

  private _emitCanceled(data?: RecognitionEvent['data']): void {
    if (this.canceled) {
      const event = {
        reason: data?.error
          ? CancellationReason.Error
          : CancellationReason.EndOfStream,
        errorCode: data?.error?.errorCode || '',
        errorDetails: data?.error?.errorDetails || data?.error?.message || '',
      };
      this.canceled(null, event);
    }
  }

  private _emitSessionStopped(): void {
    if (this.sessionStopped) {
      this.sessionStopped(null, {});
    }
  }

  _cleanup(): void {
    for (const timeout of this.eventTimeouts) {
      clearTimeout(timeout);
    }
    this.eventTimeouts = [];
  }
}

// ============================================================================
// Mock SpeechTranslationConfig
// ============================================================================

export class MockSpeechTranslationConfig {
  speechRecognitionLanguage = '';
  private targetLanguages: string[] = [];
  private profanity: number = ProfanityOption.Masked;
  private properties: Record<string, string> = {};

  static fromSubscription = vi.fn((_apiKey: string, _region: string) => {
    return new MockSpeechTranslationConfig();
  });

  addTargetLanguage = vi.fn((language: string) => {
    this.targetLanguages.push(language);
  });

  setProfanity = vi.fn((option: number) => {
    this.profanity = option;
  });

  setProperty = vi.fn((key: string, value: string) => {
    this.properties[key] = value;
  });

  _getConfig() {
    return {
      inputLanguage: this.speechRecognitionLanguage,
      outputLanguages: this.targetLanguages,
      profanityOption: this.profanity,
      properties: this.properties,
    };
  }
}

// ============================================================================
// Mock AudioConfig
// ============================================================================

export class MockAudioConfig {
  static fromDefaultMicrophoneInput = vi.fn(() => {
    return new MockAudioConfig();
  });
}

// ============================================================================
// Mock PhraseListGrammar
// ============================================================================

export class MockPhraseListGrammar {
  private phrases: string[] = [];

  static fromRecognizer = vi.fn((_recognizer: MockTranslationRecognizer) => {
    return new MockPhraseListGrammar();
  });

  addPhrases = vi.fn((phrases: string[]) => {
    this.phrases.push(...phrases);
  });

  _getPhrases() {
    return this.phrases;
  }
}

// ============================================================================
// Mock TranslationRecognizer Factory
// ============================================================================

export const TranslationRecognizer = vi.fn(
  (config: MockSpeechTranslationConfig, _audioConfig: MockAudioConfig) => {
    const recognizer = new MockTranslationRecognizer();

    // Store configuration on the recognizer
    recognizer._config = {
      inputLanguage: config.speechRecognitionLanguage,
      outputLanguages: config._getConfig().outputLanguages,
      profanityOption: config._getConfig().profanityOption,
      stablePartialResultThreshold:
        config._getConfig().properties[
          'SpeechServiceResponse_StablePartialResultThreshold'
        ] || '5',
      phraseList: [],
    };

    // Register with manager
    mockAzureSpeech._registerRecognizer(recognizer);

    return recognizer;
  },
);

// ============================================================================
// Pre-built Scenarios
// ============================================================================

export const SCENARIOS = {
  /**
   * Basic German to English translation
   */
  basicGermanToEnglish: {
    name: 'basicGermanToEnglish',
    events: [
      {
        type: 'recognizing' as const,
        delay: 100,
        data: {
          text: 'Guten Tag',
          translations: { en: 'Good day' },
        },
      },
      {
        type: 'recognized' as const,
        delay: 300,
        data: {
          text: 'Guten Tag',
          translations: { en: 'Good day' },
        },
      },
      {
        type: 'recognizing' as const,
        delay: 500,
        data: {
          text: 'Wie geht es Ihnen',
          translations: { en: 'How are you' },
        },
      },
      {
        type: 'recognized' as const,
        delay: 800,
        data: {
          text: 'Wie geht es Ihnen',
          translations: { en: 'How are you' },
        },
      },
    ],
  } as Scenario,

  /**
   * Multi-language translation (3 languages)
   */
  multiLanguageTranslation: {
    name: 'multiLanguageTranslation',
    events: [
      {
        type: 'recognizing' as const,
        delay: 100,
        data: {
          text: 'Hello everyone',
          translations: {
            de: 'Hallo zusammen',
            es: 'Hola a todos',
            fr: 'Bonjour à tous',
          },
        },
      },
      {
        type: 'recognized' as const,
        delay: 400,
        data: {
          text: 'Hello everyone',
          translations: {
            de: 'Hallo zusammen',
            es: 'Hola a todos',
            fr: 'Bonjour à tous',
          },
        },
      },
    ],
  } as Scenario,

  /**
   * Network error during recognition
   */
  networkError: {
    name: 'networkError',
    events: [
      {
        type: 'recognizing' as const,
        delay: 100,
        data: {
          text: 'Hello',
          translations: { de: 'Hallo' },
        },
      },
      {
        type: 'canceled' as const,
        delay: 300,
        data: {
          error: {
            errorCode: 'ConnectionFailure',
            errorDetails:
              'WebSocket upgrade failed: Authentication error (401)',
          },
        },
      },
    ],
  } as Scenario,

  /**
   * Invalid API credentials
   */
  invalidCredentials: {
    name: 'invalidCredentials',
    events: [
      {
        type: 'canceled' as const,
        delay: 50,
        data: {
          error: {
            errorCode: 'Forbidden',
            errorDetails:
              'Authentication failed: Invalid subscription key or authorization token',
          },
        },
      },
    ],
  } as Scenario,

  /**
   * No speech detected
   */
  noSpeechDetected: {
    name: 'noSpeechDetected',
    events: [
      {
        type: 'recognized' as const,
        delay: 200,
        data: {
          reason: ResultReason.NoMatch,
          text: '',
          translations: {},
        },
      },
    ],
  } as Scenario,

  /**
   * Profanity filtering (masked)
   */
  profanityFiltering: {
    name: 'profanityFiltering',
    events: [
      {
        type: 'recognizing' as const,
        delay: 100,
        data: {
          text: 'This is ****',
          translations: { de: 'Das ist ****' },
        },
      },
      {
        type: 'recognized' as const,
        delay: 300,
        data: {
          text: 'This is ****',
          translations: { de: 'Das ist ****' },
        },
      },
    ],
  } as Scenario,

  /**
   * Long pause in speech (session stopped)
   */
  longPauseInSpeech: {
    name: 'longPauseInSpeech',
    events: [
      {
        type: 'recognizing' as const,
        delay: 100,
        data: {
          text: 'First sentence',
          translations: { de: 'Erster Satz' },
        },
      },
      {
        type: 'recognized' as const,
        delay: 300,
        data: {
          text: 'First sentence',
          translations: { de: 'Erster Satz' },
        },
      },
      {
        type: 'sessionStopped' as const,
        delay: 1000,
      },
    ],
  } as Scenario,

  /**
   * Continuous speech with multiple phrases
   */
  continuousSpeech: {
    name: 'continuousSpeech',
    events: [
      {
        type: 'recognizing' as const,
        delay: 100,
        data: {
          text: 'Welcome to',
          translations: { de: 'Willkommen zu' },
        },
      },
      {
        type: 'recognizing' as const,
        delay: 200,
        data: {
          text: 'Welcome to our',
          translations: { de: 'Willkommen zu unserem' },
        },
      },
      {
        type: 'recognizing' as const,
        delay: 300,
        data: {
          text: 'Welcome to our church',
          translations: { de: 'Willkommen zu unserer Kirche' },
        },
      },
      {
        type: 'recognized' as const,
        delay: 500,
        data: {
          text: 'Welcome to our church',
          translations: { de: 'Willkommen zu unserer Kirche' },
        },
      },
      {
        type: 'recognizing' as const,
        delay: 700,
        data: {
          text: 'We are glad',
          translations: { de: 'Wir freuen uns' },
        },
      },
      {
        type: 'recognized' as const,
        delay: 900,
        data: {
          text: 'We are glad you are here',
          translations: { de: 'Wir freuen uns, dass Sie hier sind' },
        },
      },
    ],
  } as Scenario,

  /**
   * Empty scenario (no events)
   */
  empty: {
    name: 'empty',
    events: [],
  } as Scenario,
} as const;

// ============================================================================
// Vitest Mock Setup
// ============================================================================

// Export for mocking in tests
export const SpeechTranslationConfig = MockSpeechTranslationConfig;
export const AudioConfig = MockAudioConfig;
export const PhraseListGrammar = MockPhraseListGrammar;

// Auto-mock the module when imported
vi.mock('microsoft-cognitiveservices-speech-sdk', () => ({
  SpeechTranslationConfig: MockSpeechTranslationConfig,
  AudioConfig: MockAudioConfig,
  TranslationRecognizer,
  ProfanityOption,
  PhraseListGrammar: MockPhraseListGrammar,
  CancellationReason,
  ResultReason,
}));
