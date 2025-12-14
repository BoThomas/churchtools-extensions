import { beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { clearAllStorage } from '../../src/__mocks__/setup';
import { mockAzureSpeech } from '../../src/__mocks__/azureSpeechSdk';
import {
  _resetKVStore,
  _seedModules,
} from '@churchtools-extensions/ct-utils/__mocks__/kv-store';

// Mock the kv-store module so when actual code imports it, it gets the mock
// This allows PersistanceCategory to use the in-memory mock instead of real ChurchTools API
vi.mock('@churchtools-extensions/ct-utils/kv-store', async () => {
  const mock = await import(
    '@churchtools-extensions/ct-utils/__mocks__/kv-store'
  );
  return mock;
});

const TEST_EXTENSION_KEY = 'translator-test';

// Ensure VITE_KEY environment variable is set
if (typeof import.meta !== 'undefined') {
  (import.meta as any).env = (import.meta as any).env || {};
  (import.meta as any).env.VITE_KEY =
    (import.meta as any).env.VITE_KEY || TEST_EXTENSION_KEY;
}

if (typeof process !== 'undefined') {
  process.env = process.env || {};
  process.env.VITE_KEY = process.env.VITE_KEY || TEST_EXTENSION_KEY;
}

// Global setup for integration tests
// Unlike unit tests, we use real PersistanceCategory with mocked kv-store backend
beforeEach(() => {
  // Fresh Pinia instance for each test
  setActivePinia(createPinia());

  // Clear localStorage/sessionStorage
  clearAllStorage();

  // Reset Azure Speech SDK mock
  mockAzureSpeech.reset();

  // Reset and seed the KV store with test module
  // This provides the in-memory backend that PersistanceCategory will use
  _resetKVStore();
  _seedModules([
    {
      id: 1,
      shorty: TEST_EXTENSION_KEY,
      name: 'Translator Test Module',
      description: 'Test module for translator integration tests',
      sortKey: 100,
    },
  ]);
});

afterEach(() => {
  // Cleanup
  clearAllStorage();
});
