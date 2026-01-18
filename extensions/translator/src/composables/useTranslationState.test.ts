import { describe, it, expect, beforeEach } from 'vitest';
import { useTranslationState } from './useTranslationState';

describe('useTranslationState', () => {
  let translationState: ReturnType<typeof useTranslationState>;

  beforeEach(() => {
    translationState = useTranslationState();
  });

  describe('initial state', () => {
    it('should initialize with all flags false', () => {
      expect(translationState.state.value).toEqual({
        isTestRunning: false,
        isLiveTranslationPrepared: false,
        isPaused: false,
        isLiveTranslating: false,
        presentationSessionId: null,
        isTestPresentationRunning: false,
        presentationWindowsOpenedButNotStarted: false,
        isTestSessionRunning: false,
      });
    });

    it('should have empty state text initially', () => {
      expect(translationState.stateText.value).toBe('');
    });

    it('should have secondary severity initially', () => {
      expect(translationState.statusSeverity.value).toBe('secondary');
    });

    it('should not disable inputs initially', () => {
      expect(translationState.inputsDisabled.value).toBe(false);
    });
  });

  describe('state transitions', () => {
    it('should show Testing state when test is running', () => {
      translationState.state.value.isTestRunning = true;

      expect(translationState.stateText.value).toBe('Testing');
      expect(translationState.statusSeverity.value).toBe('success');
      expect(translationState.inputsDisabled.value).toBe(true);
    });

    it('should show Presentation Ready state when presentation opened but not started', () => {
      translationState.state.value.isLiveTranslationPrepared = true;
      translationState.state.value.isLiveTranslating = false;

      expect(translationState.stateText.value).toBe('Live Translation Ready');
      expect(translationState.statusSeverity.value).toBe('secondary');
      expect(translationState.inputsDisabled.value).toBe(true);
    });

    it('should show Presenting state when presenting and translating', () => {
      translationState.state.value.isLiveTranslationPrepared = true;
      translationState.state.value.isLiveTranslating = true;

      expect(translationState.stateText.value).toBe('Live Translation');
      expect(translationState.statusSeverity.value).toBe('success');
      expect(translationState.inputsDisabled.value).toBe(true);
    });

    it('should show Paused state when paused', () => {
      translationState.state.value.isLiveTranslationPrepared = true;
      translationState.state.value.isLiveTranslating = true;
      translationState.state.value.isPaused = true;

      expect(translationState.stateText.value).toBe('Paused');
      expect(translationState.statusSeverity.value).toBe('warn');
      expect(translationState.inputsDisabled.value).toBe(true);
    });

    it('should show Test Presentation Ready state when test presentation windows opened', () => {
      translationState.state.value.isTestPresentationRunning = true;
      translationState.state.value.presentationWindowsOpenedButNotStarted = true;

      expect(translationState.stateText.value).toBe('Test Presentation Ready');
      expect(translationState.statusSeverity.value).toBe('secondary');
      expect(translationState.inputsDisabled.value).toBe(true);
    });

    it('should show Test Presentation state when test presentation is active', () => {
      translationState.state.value.isTestPresentationRunning = true;
      translationState.state.value.presentationWindowsOpenedButNotStarted = false;

      expect(translationState.stateText.value).toBe('Test Presentation');
      expect(translationState.statusSeverity.value).toBe('success');
      expect(translationState.inputsDisabled.value).toBe(true);
    });
  });

  describe('priority of states', () => {
    it('should prioritize paused state over presenting', () => {
      translationState.state.value.isLiveTranslationPrepared = true;
      translationState.state.value.isLiveTranslating = true;
      translationState.state.value.isPaused = true;

      expect(translationState.stateText.value).toBe('Paused');
      expect(translationState.statusSeverity.value).toBe('warn');
    });

    it('should prioritize paused over testing', () => {
      translationState.state.value.isTestRunning = true;
      translationState.state.value.isPaused = true;

      expect(translationState.stateText.value).toBe('Paused');
      expect(translationState.statusSeverity.value).toBe('warn');
    });

    it('should prioritize testing over presentation', () => {
      translationState.state.value.isTestRunning = true;
      translationState.state.value.isLiveTranslationPrepared = true;

      expect(translationState.stateText.value).toBe('Testing');
      expect(translationState.statusSeverity.value).toBe('success');
    });
  });

  describe('inputsDisabled', () => {
    it('should disable inputs when test is running', () => {
      translationState.state.value.isTestRunning = true;

      expect(translationState.inputsDisabled.value).toBe(true);
    });

    it('should disable inputs when presentation is running', () => {
      translationState.state.value.isLiveTranslationPrepared = true;

      expect(translationState.inputsDisabled.value).toBe(true);
    });

    it('should disable inputs when test presentation is running', () => {
      translationState.state.value.isTestPresentationRunning = true;

      expect(translationState.inputsDisabled.value).toBe(true);
    });

    it('should enable inputs when nothing is running', () => {
      translationState.state.value.isTestRunning = false;
      translationState.state.value.isLiveTranslationPrepared = false;
      translationState.state.value.isTestPresentationRunning = false;

      expect(translationState.inputsDisabled.value).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reset all state to initial values', () => {
      // Set various states
      translationState.state.value.isTestRunning = true;
      translationState.state.value.isLiveTranslationPrepared = true;
      translationState.state.value.isPaused = true;
      translationState.state.value.isLiveTranslating = true;
      translationState.state.value.presentationSessionId = 'session_123';
      translationState.state.value.isTestPresentationRunning = true;
      translationState.state.value.presentationWindowsOpenedButNotStarted = true;

      // Reset
      translationState.reset();

      // Verify all back to defaults
      expect(translationState.state.value).toEqual({
        isTestRunning: false,
        isLiveTranslationPrepared: false,
        isPaused: false,
        isLiveTranslating: false,
        presentationSessionId: null,
        isTestPresentationRunning: false,
        presentationWindowsOpenedButNotStarted: false,
        isTestSessionRunning: false,
      });
      expect(translationState.stateText.value).toBe('');
      expect(translationState.inputsDisabled.value).toBe(false);
    });
  });

  describe('presentationSessionId', () => {
    it('should track presentation session ID', () => {
      const sessionId = 'session_123456';
      translationState.state.value.presentationSessionId = sessionId;

      expect(translationState.state.value.presentationSessionId).toBe(
        sessionId,
      );
    });

    it('should clear presentation session ID on reset', () => {
      translationState.state.value.presentationSessionId = 'session_123';

      translationState.reset();

      expect(translationState.state.value.presentationSessionId).toBeNull();
    });
  });

  describe('complex state scenarios', () => {
    it('should handle transition from idle to test to idle', () => {
      // Start test
      translationState.state.value.isTestRunning = true;
      expect(translationState.stateText.value).toBe('Testing');
      expect(translationState.inputsDisabled.value).toBe(true);

      // Stop test
      translationState.reset();
      expect(translationState.stateText.value).toBe('');
      expect(translationState.inputsDisabled.value).toBe(false);
    });

    it('should handle full presentation lifecycle', () => {
      // Open presentation windows
      translationState.state.value.isLiveTranslationPrepared = true;
      translationState.state.value.isLiveTranslating = false;
      expect(translationState.stateText.value).toBe('Live Translation Ready');
      expect(translationState.statusSeverity.value).toBe('secondary');

      // Start translation
      translationState.state.value.isLiveTranslating = true;
      expect(translationState.stateText.value).toBe('Live Translation');
      expect(translationState.statusSeverity.value).toBe('success');

      // Pause
      translationState.state.value.isPaused = true;
      expect(translationState.stateText.value).toBe('Paused');
      expect(translationState.statusSeverity.value).toBe('warn');

      // Resume
      translationState.state.value.isPaused = false;
      expect(translationState.stateText.value).toBe('Live Translation');
      expect(translationState.statusSeverity.value).toBe('success');

      // Stop
      translationState.reset();
      expect(translationState.stateText.value).toBe('');
      expect(translationState.inputsDisabled.value).toBe(false);
    });
  });
});
