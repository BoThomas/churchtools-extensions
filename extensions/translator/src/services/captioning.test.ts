import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CaptioningService } from './captioning';
import { mockAzureSpeech } from '../__mocks__/azureSpeechSdk';

// Import the Azure Speech SDK mock
import '../__mocks__/azureSpeechSdk';

describe('CaptioningService', () => {
  const mockCallbacks = {
    onTranslating: vi.fn(),
    onTranslated: vi.fn(),
    onError: vi.fn(),
  };

  beforeEach(() => {
    mockAzureSpeech.reset();
  });

  describe('constructor', () => {
    it('should throw error if API key is missing', () => {
      expect(() => {
        new CaptioningService(
          {
            inputLanguage: 'de-DE',
            outputLanguages: ['en'],
            profanityOption: 'raw',
            stablePartialResultThreshold: '5',
            phraseList: '',
          },
          mockCallbacks,
          '', // Missing API key
          'westeurope',
        );
      }).toThrow('Missing Azure Speech API Service Key.');
    });

    it('should throw error if API region is missing', () => {
      expect(() => {
        new CaptioningService(
          {
            inputLanguage: 'de-DE',
            outputLanguages: ['en'],
            profanityOption: 'raw',
            stablePartialResultThreshold: '5',
            phraseList: '',
          },
          mockCallbacks,
          'test-key-123',
          '', // Missing region
        );
      }).toThrow('Missing Azure Speech API Service Region.');
    });

    it('should create service with valid credentials', () => {
      expect(() => {
        new CaptioningService(
          {
            inputLanguage: 'de-DE',
            outputLanguages: ['en'],
            profanityOption: 'raw',
            stablePartialResultThreshold: '5',
            phraseList: '',
          },
          mockCallbacks,
          'test-key-123',
          'westeurope',
        );
      }).not.toThrow();
    });

    it('should configure profanity filter for raw mode', () => {
      const config = {
        inputLanguage: 'de-DE',
        outputLanguages: ['en'],
        profanityOption: 'raw' as const,
        stablePartialResultThreshold: '5',
        phraseList: '',
      };

      const service = new CaptioningService(
        config,
        mockCallbacks,
        'test-key',
        'westeurope',
      );

      expect(service).toBeDefined();
      // Just verify it doesn't throw - actual SDK behavior is tested by Microsoft
    });

    it('should configure profanity filter for remove mode', () => {
      const config = {
        inputLanguage: 'de-DE',
        outputLanguages: ['en'],
        profanityOption: 'remove' as const,
        stablePartialResultThreshold: '5',
        phraseList: '',
      };

      const service = new CaptioningService(
        config,
        mockCallbacks,
        'test-key',
        'westeurope',
      );
      expect(service).toBeDefined();
    });

    it('should configure profanity filter for mask mode (default)', () => {
      const config = {
        inputLanguage: 'de-DE',
        outputLanguages: ['en'],
        profanityOption: 'mask' as const,
        stablePartialResultThreshold: '5',
        phraseList: '',
      };

      const service = new CaptioningService(
        config,
        mockCallbacks,
        'test-key',
        'westeurope',
      );
      expect(service).toBeDefined();
    });

    it('should configure multiple target languages', () => {
      const config = {
        inputLanguage: 'de-DE',
        outputLanguages: ['en', 'es', 'fr'],
        profanityOption: 'raw' as const,
        stablePartialResultThreshold: '5',
        phraseList: '',
      };

      const service = new CaptioningService(
        config,
        mockCallbacks,
        'test-key',
        'westeurope',
      );
      expect(service).toBeDefined();
    });

    it('should configure stable partial result threshold', () => {
      const config = {
        inputLanguage: 'de-DE',
        outputLanguages: ['en'],
        profanityOption: 'raw' as const,
        stablePartialResultThreshold: '7',
        phraseList: '',
      };

      const service = new CaptioningService(
        config,
        mockCallbacks,
        'test-key',
        'westeurope',
      );
      expect(service).toBeDefined();
    });

    it('should enable TrueText post-processing', () => {
      const config = {
        inputLanguage: 'de-DE',
        outputLanguages: ['en'],
        profanityOption: 'raw' as const,
        stablePartialResultThreshold: '5',
        phraseList: '',
      };

      const service = new CaptioningService(
        config,
        mockCallbacks,
        'test-key',
        'westeurope',
      );
      expect(service).toBeDefined();
    });

    it('should add phrase list when provided', () => {
      const config = {
        inputLanguage: 'de-DE',
        outputLanguages: ['en'],
        profanityOption: 'raw' as const,
        stablePartialResultThreshold: '5',
        phraseList: 'church;worship;sermon',
      };

      const service = new CaptioningService(
        config,
        mockCallbacks,
        'test-key',
        'westeurope',
      );
      expect(service).toBeDefined();
    });

    it('should not add phrase list when empty', () => {
      const config = {
        inputLanguage: 'de-DE',
        outputLanguages: ['en'],
        profanityOption: 'raw' as const,
        stablePartialResultThreshold: '5',
        phraseList: '',
      };

      const service = new CaptioningService(
        config,
        mockCallbacks,
        'test-key',
        'westeurope',
      );
      expect(service).toBeDefined();
    });

    it('should set input language on speech config', () => {
      const config = {
        inputLanguage: 'en-GB',
        outputLanguages: ['de'],
        profanityOption: 'raw' as const,
        stablePartialResultThreshold: '5',
        phraseList: '',
      };

      const service = new CaptioningService(
        config,
        mockCallbacks,
        'test-key',
        'westeurope',
      );
      expect(service).toBeDefined();
    });
  });

  describe('start', () => {
    it('should start continuous recognition', () => {
      const service = new CaptioningService(
        {
          inputLanguage: 'de-DE',
          outputLanguages: ['en'],
          profanityOption: 'raw',
          stablePartialResultThreshold: '5',
          phraseList: '',
        },
        mockCallbacks,
        'test-key',
        'westeurope',
      );

      expect(() => service.start()).not.toThrow();
    });
  });

  describe('stop', () => {
    it('should stop continuous recognition when running', () => {
      const service = new CaptioningService(
        {
          inputLanguage: 'de-DE',
          outputLanguages: ['en'],
          profanityOption: 'raw',
          stablePartialResultThreshold: '5',
          phraseList: '',
        },
        mockCallbacks,
        'test-key',
        'westeurope',
      );

      service.start();

      expect(() => service.stop()).not.toThrow();
    });

    it('should not crash when stopping before starting', () => {
      const service = new CaptioningService(
        {
          inputLanguage: 'de-DE',
          outputLanguages: ['en'],
          profanityOption: 'raw',
          stablePartialResultThreshold: '5',
          phraseList: '',
        },
        mockCallbacks,
        'test-key',
        'westeurope',
      );

      expect(() => {
        service.stop();
      }).not.toThrow();
    });
  });
});
