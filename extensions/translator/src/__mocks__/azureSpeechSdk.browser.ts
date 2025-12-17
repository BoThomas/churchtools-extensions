/**
 * Browser-compatible Mock for Microsoft Azure Speech SDK (E2E Tests)
 *
 * This mock is used via Vite's resolve.alias when running in E2E mode.
 * It replaces the real SDK with a mock that doesn't make external API calls.
 *
 * Unlike the Vitest mock (azureSpeechSdk.ts), this version:
 * - Works in real browsers (no Vitest dependencies)
 * - Supports scenario-based testing via window.__MOCK_AZURE_SCENARIO__
 * - Provides realistic timing and event sequences
 */

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
// Mock SDK Scenario Data
// ============================================================================

interface ScenarioEvent {
  type: 'recognizing' | 'recognized' | 'canceled' | 'sessionStopped';
  delay: number;
  data?: {
    text?: string;
    translations?: Record<string, string>;
    reason?: number;
    error?: any;
  };
}

const SCENARIOS: Record<string, ScenarioEvent[]> = {
  basic: [
    {
      type: 'recognizing',
      delay: 500,
      data: {
        text: 'Hello',
        translations: { de: 'Hallo', fr: 'Bonjour', es: 'Hola' },
      },
    },
    {
      type: 'recognized',
      delay: 1000,
      data: {
        text: 'Hello world',
        translations: {
          de: 'Hallo Welt',
          fr: 'Bonjour le monde',
          es: 'Hola mundo',
        },
      },
    },
  ],
  multiLanguage: [
    {
      type: 'recognizing',
      delay: 300,
      data: {
        text: 'Welcome to',
        translations: {
          de: 'Willkommen zu',
          fr: 'Bienvenue à',
          es: 'Bienvenido a',
        },
      },
    },
    {
      type: 'recognized',
      delay: 800,
      data: {
        text: 'Welcome to our church',
        translations: {
          de: 'Willkommen zu unserer Kirche',
          fr: 'Bienvenue à notre église',
          es: 'Bienvenido a nuestra iglesia',
        },
      },
    },
  ],
  error: [
    {
      type: 'canceled',
      delay: 500,
      data: {
        reason: CancellationReason.Error,
        error: {
          code: 'ServiceError',
          message: 'Mock service error',
        },
      },
    },
  ],
  noSpeech: [
    {
      type: 'sessionStopped',
      delay: 2000,
      data: {},
    },
  ],
};

// ============================================================================
// Mock Translation Result
// ============================================================================

class MockTranslationResult {
  constructor(
    public text: string,
    public translations: Map<string, string>,
    public reason: number,
  ) {}
}

// ============================================================================
// Mock Translation Recognizer
// ============================================================================

export class TranslationRecognizer {
  private timeouts: NodeJS.Timeout[] = [];
  private isRunning = false;

  public recognizing: ((sender: any, event: any) => void) | null = null;
  public recognized: ((sender: any, event: any) => void) | null = null;
  public canceled: ((sender: any, event: any) => void) | null = null;
  public sessionStopped: ((sender: any, event: any) => void) | null = null;

  constructor(_speechConfig: any, _audioConfig: any) {
    console.log('🎭 Mock Azure TranslationRecognizer created (E2E mode)');
  }

  public startContinuousRecognitionAsync(
    successCallback?: () => void,
    _errorCallback?: (error: string) => void,
  ): void {
    if (this.isRunning) {
      console.warn('Mock recognizer already running');
      return;
    }

    this.isRunning = true;
    console.log('🎭 Mock Azure recognition started');

    // Get scenario from window or default to 'basic'
    const scenarioName = (window as any).__MOCK_AZURE_SCENARIO__ || 'basic';
    const events = SCENARIOS[scenarioName] || SCENARIOS.basic;

    console.log(`🎭 Using scenario: ${scenarioName} (${events.length} events)`);

    // Schedule all events
    events.forEach((event) => {
      const timeout = setTimeout(() => {
        if (!this.isRunning) return;

        switch (event.type) {
          case 'recognizing':
            if (this.recognizing && event.data) {
              const translations = new Map(
                Object.entries(event.data.translations || {}),
              );
              const result = new MockTranslationResult(
                event.data.text || '',
                translations,
                ResultReason.TranslatingSpeech,
              );
              this.recognizing(this, { result });
            }
            break;

          case 'recognized':
            if (this.recognized && event.data) {
              const translations = new Map(
                Object.entries(event.data.translations || {}),
              );
              const result = new MockTranslationResult(
                event.data.text || '',
                translations,
                ResultReason.TranslatedSpeech,
              );
              this.recognized(this, { result });
            }
            break;

          case 'canceled':
            if (this.canceled && event.data) {
              this.canceled(this, {
                reason: event.data.reason,
                errorCode: event.data.error?.code,
                errorDetails: event.data.error?.message,
              });
            }
            break;

          case 'sessionStopped':
            if (this.sessionStopped) {
              this.sessionStopped(this, {});
            }
            break;
        }
      }, event.delay);

      this.timeouts.push(timeout);
    });

    if (successCallback) {
      successCallback();
    }
  }

  public stopContinuousRecognitionAsync(
    successCallback?: () => void,
    _errorCallback?: (error: string) => void,
  ): void {
    console.log('🎭 Mock Azure recognition stopped');
    this.isRunning = false;

    // Clear all pending timeouts
    this.timeouts.forEach((timeout) => clearTimeout(timeout));
    this.timeouts = [];

    if (successCallback) {
      successCallback();
    }
  }

  public close(): void {
    this.stopContinuousRecognitionAsync();
  }
}

// ============================================================================
// Mock Speech Translation Config
// ============================================================================

export class SpeechTranslationConfig {
  public speechRecognitionLanguage = '';
  private targetLanguages: string[] = [];
  private properties: Map<string, string> = new Map();
  private _profanityOption: number = ProfanityOption.Masked;

  private constructor(
    private _subscriptionKey: string,
    private _region: string,
  ) {}

  static fromSubscription(
    subscriptionKey: string,
    region: string,
  ): SpeechTranslationConfig {
    return new SpeechTranslationConfig(subscriptionKey, region);
  }

  addTargetLanguage(language: string): void {
    this.targetLanguages.push(language);
  }

  setProfanity(option: number): void {
    this._profanityOption = option;
  }

  setProperty(name: string, value: string): void {
    this.properties.set(name, value);
  }
}

// ============================================================================
// Mock Audio Config
// ============================================================================

export class AudioConfig {
  static fromDefaultMicrophoneInput(): AudioConfig {
    return new AudioConfig();
  }

  static fromStreamInput(_stream: any): AudioConfig {
    return new AudioConfig();
  }
}

// ============================================================================
// Mock Phrase List Grammar
// ============================================================================

export class PhraseListGrammar {
  private phrases: string[] = [];

  static fromRecognizer(_recognizer: TranslationRecognizer): PhraseListGrammar {
    return new PhraseListGrammar();
  }

  addPhrase(phrase: string): void {
    this.phrases.push(phrase);
  }

  addPhrases(phrases: string[]): void {
    this.phrases.push(...phrases);
  }
}

// ============================================================================
// Mock Recognizer (base class)
// ============================================================================

export class Recognizer {
  // Base recognizer class (if needed)
}

// Log mock activation
console.log(
  '🎭 Azure Speech SDK Mock loaded (browser-compatible for E2E tests)',
);
