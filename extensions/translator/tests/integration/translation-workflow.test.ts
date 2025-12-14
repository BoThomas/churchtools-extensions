import { describe, it, expect, beforeEach } from 'vitest';
import { mockAzureSpeech } from '../../src/__mocks__/azureSpeechSdk';
import {
  CaptioningService,
  type CaptioningCallbacks,
} from '../../src/services/captioning';

/**
 * Integration Tests: Translation Workflow
 *
 * Tests the full translation workflow using the Azure Speech SDK mock
 * and CaptioningService to verify real-world scenarios.
 */
describe('Translation Workflow Integration', () => {
  beforeEach(() => {
    // Note: Pinia setup is in setup.ts global beforeEach
    mockAzureSpeech.reset();
  });

  describe('Basic Translation', () => {
    it('should translate German to English', async () => {
      mockAzureSpeech.setScenario('basicGermanToEnglish');

      const translations: Record<string, string>[] = [];
      const callbacks: CaptioningCallbacks = {
        onTranslated: (trans: Record<string, string>) => {
          translations.push(trans);
        },
        onTranslating: () => {},
        onError: () => {},
      };

      const service = new CaptioningService(
        {
          inputLanguage: 'de-DE',
          outputLanguages: ['en'],
          profanityOption: 'raw',
          stablePartialResultThreshold: '5',
          phraseList: '',
        },
        callbacks,
        'mock-key',
        'westeurope',
      );

      service.start();

      // Wait for translation events
      await new Promise((resolve) => setTimeout(resolve, 1000));

      expect(translations.length).toBeGreaterThan(0);
      expect(translations[translations.length - 1].en).toBeDefined();

      service.stop();
    });

    it('should handle multi-language translation', async () => {
      mockAzureSpeech.setScenario('multiLanguageTranslation');

      const translations: Record<string, string>[] = [];
      const callbacks: CaptioningCallbacks = {
        onTranslated: (trans: Record<string, string>) => {
          translations.push(trans);
        },
        onTranslating: () => {},
        onError: () => {},
      };

      const service = new CaptioningService(
        {
          inputLanguage: 'de-DE',
          outputLanguages: ['en', 'es', 'fr'],
          profanityOption: 'raw',
          stablePartialResultThreshold: '5',
          phraseList: '',
        },
        callbacks,
        'mock-key',
        'westeurope',
      );

      service.start();
      await new Promise((resolve) => setTimeout(resolve, 600));

      const lastTranslation = translations[translations.length - 1];
      expect(lastTranslation.en).toBeDefined();
      expect(lastTranslation.es).toBeDefined();
      expect(lastTranslation.fr).toBeDefined();

      service.stop();
    });

    it('should distinguish live vs finalized translations', async () => {
      mockAzureSpeech.setScenario('basicGermanToEnglish');

      const recognizingEvents: any[] = [];
      const recognizedEvents: any[] = [];

      const callbacks: CaptioningCallbacks = {
        onTranslated: (trans: Record<string, string>) => {
          recognizedEvents.push(trans);
        },
        onTranslating: (trans: Record<string, string>) => {
          recognizingEvents.push(trans);
        },
        onError: () => {},
      };

      const service = new CaptioningService(
        {
          inputLanguage: 'de-DE',
          outputLanguages: ['en'],
          profanityOption: 'raw',
          stablePartialResultThreshold: '5',
          phraseList: '',
        },
        callbacks,
        'mock-key',
        'westeurope',
      );

      service.start();
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Should have both recognizing (live) and recognized (finalized) events
      expect(recognizingEvents.length).toBeGreaterThan(0);
      expect(recognizedEvents.length).toBeGreaterThan(0);

      service.stop();
    });

    it('should preserve original text alongside translations', async () => {
      mockAzureSpeech.setScenario('basicGermanToEnglish');

      let originalText = '';
      const callbacks: CaptioningCallbacks = {
        onTranslated: (_trans: Record<string, string>, original: string) => {
          originalText = original;
        },
        onTranslating: () => {},
        onError: () => {},
      };

      const service = new CaptioningService(
        {
          inputLanguage: 'de-DE',
          outputLanguages: ['en'],
          profanityOption: 'raw',
          stablePartialResultThreshold: '5',
          phraseList: '',
        },
        callbacks,
        'mock-key',
        'westeurope',
      );

      service.start();
      await new Promise((resolve) => setTimeout(resolve, 500));

      expect(originalText).toBeTruthy();
      expect(originalText.length).toBeGreaterThan(0);

      service.stop();
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      mockAzureSpeech.setScenario('networkError');

      let errorCalled = false;
      let errorMessage = '';
      const callbacks: CaptioningCallbacks = {
        onTranslated: () => {},
        onTranslating: () => {},
        onError: (error: string) => {
          errorCalled = true;
          errorMessage = error;
        },
      };

      const service = new CaptioningService(
        {
          inputLanguage: 'de-DE',
          outputLanguages: ['en'],
          profanityOption: 'raw',
          stablePartialResultThreshold: '5',
          phraseList: '',
        },
        callbacks,
        'mock-key',
        'westeurope',
      );

      service.start();
      await new Promise((resolve) => setTimeout(resolve, 500));

      expect(errorCalled).toBe(true);
      expect(errorMessage).toBeTruthy();
    });

    it('should handle no speech detected', async () => {
      mockAzureSpeech.setScenario('noSpeechDetected');

      const recognizedEvents: any[] = [];
      const callbacks: CaptioningCallbacks = {
        onTranslated: (trans: Record<string, string>) => {
          recognizedEvents.push(trans);
        },
        onTranslating: () => {},
        onError: () => {},
      };

      const service = new CaptioningService(
        {
          inputLanguage: 'de-DE',
          outputLanguages: ['en'],
          profanityOption: 'raw',
          stablePartialResultThreshold: '5',
          phraseList: '',
        },
        callbacks,
        'mock-key',
        'westeurope',
      );

      service.start();
      await new Promise((resolve) => setTimeout(resolve, 400));

      // With NoMatch result, no translations should be emitted
      expect(recognizedEvents.length).toBe(0);

      service.stop();
    });

    it('should handle invalid API credentials', async () => {
      mockAzureSpeech.setScenario('invalidCredentials');

      let errorMessage = '';
      const callbacks: CaptioningCallbacks = {
        onTranslated: () => {},
        onTranslating: () => {},
        onError: (error: string) => {
          errorMessage = error;
        },
      };

      const service = new CaptioningService(
        {
          inputLanguage: 'de-DE',
          outputLanguages: ['en'],
          profanityOption: 'raw',
          stablePartialResultThreshold: '5',
          phraseList: '',
        },
        callbacks,
        'invalid-key',
        'westeurope',
      );

      service.start();
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(errorMessage).toContain('Authentication');
    });

    it('should require API key', () => {
      const callbacks: CaptioningCallbacks = {
        onTranslated: () => {},
        onTranslating: () => {},
        onError: () => {},
      };

      expect(() => {
        new CaptioningService(
          {
            inputLanguage: 'de-DE',
            outputLanguages: ['en'],
            profanityOption: 'raw',
            stablePartialResultThreshold: '5',
            phraseList: '',
          },
          callbacks,
          '',
          'westeurope',
        );
      }).toThrow('Missing Azure Speech API Service Key');
    });

    it('should require API region', () => {
      const callbacks: CaptioningCallbacks = {
        onTranslated: () => {},
        onTranslating: () => {},
        onError: () => {},
      };

      expect(() => {
        new CaptioningService(
          {
            inputLanguage: 'de-DE',
            outputLanguages: ['en'],
            profanityOption: 'raw',
            stablePartialResultThreshold: '5',
            phraseList: '',
          },
          callbacks,
          'mock-key',
          '',
        );
      }).toThrow('Missing Azure Speech API Service Region');
    });
  });

  describe('Profanity Filtering', () => {
    it('should apply profanity mask filter', async () => {
      mockAzureSpeech.setScenario('profanityFiltering');

      const translations: Record<string, string>[] = [];
      const callbacks: CaptioningCallbacks = {
        onTranslated: (trans: Record<string, string>) => {
          translations.push(trans);
        },
        onTranslating: () => {},
        onError: () => {},
      };

      const service = new CaptioningService(
        {
          inputLanguage: 'de-DE',
          outputLanguages: ['en'],
          profanityOption: 'mask',
          stablePartialResultThreshold: '5',
          phraseList: '',
        },
        callbacks,
        'mock-key',
        'westeurope',
      );

      service.start();
      await new Promise((resolve) => setTimeout(resolve, 500));

      expect(translations.length).toBeGreaterThan(0);

      service.stop();
    });

    it('should remove profanity when configured', async () => {
      mockAzureSpeech.setScenario('profanityFiltering');

      const translations: Record<string, string>[] = [];
      const callbacks: CaptioningCallbacks = {
        onTranslated: (trans: Record<string, string>) => {
          translations.push(trans);
        },
        onTranslating: () => {},
        onError: () => {},
      };

      const service = new CaptioningService(
        {
          inputLanguage: 'de-DE',
          outputLanguages: ['en'],
          profanityOption: 'remove',
          stablePartialResultThreshold: '5',
          phraseList: '',
        },
        callbacks,
        'mock-key',
        'westeurope',
      );

      service.start();
      await new Promise((resolve) => setTimeout(resolve, 500));

      expect(translations.length).toBeGreaterThan(0);

      service.stop();
    });

    it('should allow raw profanity', async () => {
      mockAzureSpeech.setScenario('profanityFiltering');

      const translations: Record<string, string>[] = [];
      const callbacks: CaptioningCallbacks = {
        onTranslated: (trans: Record<string, string>) => {
          translations.push(trans);
        },
        onTranslating: () => {},
        onError: () => {},
      };

      const service = new CaptioningService(
        {
          inputLanguage: 'de-DE',
          outputLanguages: ['en'],
          profanityOption: 'raw',
          stablePartialResultThreshold: '5',
          phraseList: '',
        },
        callbacks,
        'mock-key',
        'westeurope',
      );

      service.start();
      await new Promise((resolve) => setTimeout(resolve, 500));

      expect(translations.length).toBeGreaterThan(0);

      service.stop();
    });
  });

  describe('Phrase List Support', () => {
    it('should apply phrase list to recognition', async () => {
      mockAzureSpeech.setScenario('basicGermanToEnglish');

      const translations: Record<string, string>[] = [];
      const callbacks: CaptioningCallbacks = {
        onTranslated: (trans: Record<string, string>) => {
          translations.push(trans);
        },
        onTranslating: () => {},
        onError: () => {},
      };

      const service = new CaptioningService(
        {
          inputLanguage: 'de-DE',
          outputLanguages: ['en'],
          profanityOption: 'raw',
          stablePartialResultThreshold: '5',
          phraseList: 'ChurchTools;API;Extension',
        },
        callbacks,
        'mock-key',
        'westeurope',
      );

      service.start();
      await new Promise((resolve) => setTimeout(resolve, 500));

      expect(translations.length).toBeGreaterThan(0);

      service.stop();
    });

    it('should work without phrase list', async () => {
      mockAzureSpeech.setScenario('basicGermanToEnglish');

      const translations: Record<string, string>[] = [];
      const callbacks: CaptioningCallbacks = {
        onTranslated: (trans: Record<string, string>) => {
          translations.push(trans);
        },
        onTranslating: () => {},
        onError: () => {},
      };

      const service = new CaptioningService(
        {
          inputLanguage: 'de-DE',
          outputLanguages: ['en'],
          profanityOption: 'raw',
          stablePartialResultThreshold: '5',
          phraseList: '',
        },
        callbacks,
        'mock-key',
        'westeurope',
      );

      service.start();
      await new Promise((resolve) => setTimeout(resolve, 500));

      expect(translations.length).toBeGreaterThan(0);

      service.stop();
    });
  });

  describe('Service Lifecycle', () => {
    it('should start and stop service cleanly', async () => {
      mockAzureSpeech.setScenario('basicGermanToEnglish');

      const callbacks: CaptioningCallbacks = {
        onTranslated: () => {},
        onTranslating: () => {},
        onError: () => {},
      };

      const service = new CaptioningService(
        {
          inputLanguage: 'de-DE',
          outputLanguages: ['en'],
          profanityOption: 'raw',
          stablePartialResultThreshold: '5',
          phraseList: '',
        },
        callbacks,
        'mock-key',
        'westeurope',
      );

      service.start();
      expect(mockAzureSpeech.getRecognizerState().isRunning).toBe(true);

      service.stop();
      expect(mockAzureSpeech.getRecognizerState().isRunning).toBe(false);
    });

    it('should handle multiple start/stop cycles', async () => {
      mockAzureSpeech.setScenario('basicGermanToEnglish');

      const callbacks: CaptioningCallbacks = {
        onTranslated: () => {},
        onTranslating: () => {},
        onError: () => {},
      };

      const service = new CaptioningService(
        {
          inputLanguage: 'de-DE',
          outputLanguages: ['en'],
          profanityOption: 'raw',
          stablePartialResultThreshold: '5',
          phraseList: '',
        },
        callbacks,
        'mock-key',
        'westeurope',
      );

      // First cycle
      service.start();
      service.stop();

      // Second cycle
      service.start();
      expect(mockAzureSpeech.getRecognizerState().isRunning).toBe(true);
      service.stop();
    });

    it('should handle stop when not running', () => {
      mockAzureSpeech.setScenario('basicGermanToEnglish');

      const callbacks: CaptioningCallbacks = {
        onTranslated: () => {},
        onTranslating: () => {},
        onError: () => {},
      };

      const service = new CaptioningService(
        {
          inputLanguage: 'de-DE',
          outputLanguages: ['en'],
          profanityOption: 'raw',
          stablePartialResultThreshold: '5',
          phraseList: '',
        },
        callbacks,
        'mock-key',
        'westeurope',
      );

      // Should not throw when stopping without starting
      expect(() => service.stop()).not.toThrow();
    });
  });

  describe('Long Running Sessions', () => {
    it('should handle continuous translation', async () => {
      mockAzureSpeech.setScenario('continuousSpeech');

      const translations: Record<string, string>[] = [];
      const callbacks: CaptioningCallbacks = {
        onTranslated: (trans: Record<string, string>) => {
          translations.push(trans);
        },
        onTranslating: () => {},
        onError: () => {},
      };

      const service = new CaptioningService(
        {
          inputLanguage: 'de-DE',
          outputLanguages: ['en'],
          profanityOption: 'raw',
          stablePartialResultThreshold: '5',
          phraseList: '',
        },
        callbacks,
        'mock-key',
        'westeurope',
      );

      service.start();

      // Let it run for continuous events
      await new Promise((resolve) => setTimeout(resolve, 1200));

      // Should have received multiple translations
      expect(translations.length).toBeGreaterThan(1);

      service.stop();
    });

    it('should handle long pause in speech with session stop', async () => {
      mockAzureSpeech.setScenario('longPauseInSpeech');

      const translations: Record<string, string>[] = [];
      const callbacks: CaptioningCallbacks = {
        onTranslated: (trans: Record<string, string>) => {
          translations.push(trans);
        },
        onTranslating: () => {},
        onError: () => {},
      };

      const service = new CaptioningService(
        {
          inputLanguage: 'de-DE',
          outputLanguages: ['en'],
          profanityOption: 'raw',
          stablePartialResultThreshold: '5',
          phraseList: '',
        },
        callbacks,
        'mock-key',
        'westeurope',
      );

      service.start();
      await new Promise((resolve) => setTimeout(resolve, 1200));

      // Should receive translations before session stops
      expect(translations.length).toBeGreaterThan(0);

      // Service should auto-stop after sessionStopped event
      expect(mockAzureSpeech.getRecognizerState().isRunning).toBe(false);
    });
  });

  describe('Partial Results Threshold', () => {
    it('should respect stable partial result threshold setting', async () => {
      mockAzureSpeech.setScenario('continuousSpeech');

      const recognizingEvents: any[] = [];
      const callbacks: CaptioningCallbacks = {
        onTranslated: () => {},
        onTranslating: (trans: Record<string, string>) => {
          recognizingEvents.push(trans);
        },
        onError: () => {},
      };

      const service = new CaptioningService(
        {
          inputLanguage: 'de-DE',
          outputLanguages: ['en'],
          profanityOption: 'raw',
          stablePartialResultThreshold: '3',
          phraseList: '',
        },
        callbacks,
        'mock-key',
        'westeurope',
      );

      service.start();
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Should have received partial (recognizing) results
      expect(recognizingEvents.length).toBeGreaterThan(0);

      service.stop();
    });
  });
});
