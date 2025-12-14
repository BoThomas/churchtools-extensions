import { beforeEach, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { resetAllMocks, clearAllStorage } from '../../src/__mocks__/setup';
import { mockAzureSpeech } from '../../src/__mocks__/azureSpeechSdk';
import { MockPersistanceCategory } from '../../src/__mocks__/persistance';

// Global setup
beforeEach(() => {
  // Fresh Pinia instance for each test
  setActivePinia(createPinia());

  // Reset all mocks to clean state
  resetAllMocks();

  // Clear localStorage/sessionStorage
  clearAllStorage();

  // Reset global mock configurations
  mockAzureSpeech.reset();
  MockPersistanceCategory._resetAll();
});

afterEach(() => {
  // Cleanup
  clearAllStorage();
});
