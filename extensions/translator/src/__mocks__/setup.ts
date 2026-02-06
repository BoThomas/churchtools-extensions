import { setActivePinia, createPinia } from 'pinia';
import { mockAzureSpeech, SCENARIOS } from './azureSpeechSdk';
import {
  MockPersistanceCategory,
  mockPersistenceConfig,
  PERSISTENCE_SCENARIOS,
} from './persistance';
import type {
  TranslatorSettings,
  ApiSettings,
  SettingVariant,
} from '../types/translator';
import type { TranslationSession } from '../services/sessionLogger';
import {
  mockApiSettings,
  mockDefaultSettings,
  mockDefaultVariant,
  generateSessions,
} from './fixtures';

/**
 * Mock setup utilities for testing
 * Provides quick setup functions for test environments
 */

// ============================================================================
// Test Environment Presets
// ============================================================================

export type TestEnvironmentPreset =
  | 'clean'
  | 'withData'
  | 'withApiKey'
  | 'withVariants';

export interface TestEnv {
  pinia: ReturnType<typeof createPinia>;
  apiSettings: ApiSettings | null;
  variants: SettingVariant[];
  sessions: TranslationSession[];
}

/**
 * Setup test environment with a preset configuration
 */
export function setupTestEnvironment(
  preset: TestEnvironmentPreset = 'clean',
): TestEnv {
  // Reset all mocks first
  resetAllMocks();

  // Create fresh Pinia instance
  const pinia = createPinia();
  setActivePinia(pinia);

  const env: TestEnv = {
    pinia,
    apiSettings: null,
    variants: [],
    sessions: [],
  };

  switch (preset) {
    case 'clean':
      // Nothing to add - clean slate
      break;

    case 'withApiKey':
      // Add API settings
      env.apiSettings = mockApiSettings;
      break;

    case 'withData':
      // Add API settings, default variant, and some sample sessions
      env.apiSettings = mockApiSettings;
      env.variants = [mockDefaultVariant];
      env.sessions = generateSessions(10);
      break;

    case 'withVariants':
      // Add API settings and multiple variants
      env.apiSettings = mockApiSettings;
      env.variants = [
        mockDefaultVariant,
        {
          name: 'Multi-Language',
          settings: {
            ...mockDefaultSettings,
            outputLanguages: ['de', 'es', 'fr'],
          },
        },
        {
          name: 'Test Mode',
          settings: {
            ...mockDefaultSettings,
            profanityOption: 'remove',
          },
        },
      ];
      break;
  }

  return env;
}

// ============================================================================
// Store Setup
// ============================================================================

export interface TranslatorState {
  apiSettings?: ApiSettings;
  currentSettings?: TranslatorSettings;
  variants?: SettingVariant[];
  currentVariantName?: string;
  sessions?: TranslationSession[];
  isRunning?: boolean;
  isPaused?: boolean;
}

/**
 * Setup translator store with initial state
 * Note: This returns configuration data, not the store itself
 * Use with your store's initialization logic
 */
export function setupTranslatorStore(
  initialState: Partial<TranslatorState> = {},
): TranslatorState {
  return {
    apiSettings: mockApiSettings,
    currentSettings: mockDefaultSettings,
    variants: [mockDefaultVariant],
    currentVariantName: 'Default',
    sessions: [],
    isRunning: false,
    isPaused: false,
    ...initialState,
  };
}

// ============================================================================
// Mock Services Setup
// ============================================================================

export interface MockServiceOptions {
  azureScenario?: keyof typeof SCENARIOS | null;
  persistenceDelay?: {
    min: number;
    max: number;
    mode?: 'off' | 'fast' | 'realistic';
  };
  persistenceError?: keyof typeof PERSISTENCE_SCENARIOS | null;
  timingMode?: 'instant' | 'fast' | 'realistic';
}

/**
 * Setup mock services with common configurations
 */
export function setupMockServices(options: MockServiceOptions = {}): void {
  const {
    azureScenario = null,
    persistenceDelay = null,
    persistenceError = null,
    timingMode = 'instant',
  } = options;

  // Configure Azure Speech SDK mock
  if (azureScenario) {
    mockAzureSpeech.setScenario(SCENARIOS[azureScenario]);
  }
  mockAzureSpeech.setTiming({ mode: timingMode, multiplier: 1 });

  // Configure Persistence mock
  if (persistenceDelay) {
    mockPersistenceConfig.setNetworkDelay(
      persistenceDelay.min,
      persistenceDelay.max,
      persistenceDelay.mode || 'realistic',
    );
  }
  if (persistenceError) {
    mockPersistenceConfig.simulateError(
      PERSISTENCE_SCENARIOS[persistenceError],
    );
  }
}

// ============================================================================
// Quick Setup Combinations
// ============================================================================

/**
 * Setup for basic translation test (instant, no errors)
 */
export function setupBasicTranslationTest(): TestEnv {
  const env = setupTestEnvironment('withApiKey');
  setupMockServices({
    azureScenario: 'basicGermanToEnglish',
    timingMode: 'instant',
  });
  return env;
}

/**
 * Setup for multi-language translation test
 */
export function setupMultiLanguageTest(): TestEnv {
  const env = setupTestEnvironment('withApiKey');
  setupMockServices({
    azureScenario: 'multiLanguageTranslation',
    timingMode: 'instant',
  });
  return env;
}

/**
 * Setup for error handling test
 */
export function setupErrorTest(
  errorType: 'azure' | 'persistence' = 'azure',
): TestEnv {
  const env = setupTestEnvironment('withApiKey');

  if (errorType === 'azure') {
    setupMockServices({
      azureScenario: 'networkError',
      timingMode: 'instant',
    });
  } else {
    setupMockServices({
      persistenceError: 'networkTimeout',
    });
  }

  return env;
}

/**
 * Setup for realistic timing test (useful for integration tests)
 */
export function setupRealisticTimingTest(): TestEnv {
  const env = setupTestEnvironment('withApiKey');
  setupMockServices({
    azureScenario: 'continuousSpeech',
    timingMode: 'fast',
    persistenceDelay: { min: 50, max: 150, mode: 'fast' },
  });
  return env;
}

/**
 * Setup for session tracking test with pre-existing sessions
 */
export function setupSessionTrackingTest(): TestEnv {
  const env = setupTestEnvironment('withData');
  setupMockServices({ timingMode: 'instant' });
  return env;
}

// ============================================================================
// Data Seeding Helpers
// ============================================================================

/**
 * Seed persistence mock with test data
 */
export async function seedPersistenceData(_data: {
  apiSettings?: ApiSettings;
  variants?: SettingVariant[];
  sessions?: TranslationSession[];
  userPrefs?: Record<string, any>;
}): Promise<void> {
  // Note: This is a helper that can be used with MockPersistanceCategory
  // Actual implementation depends on how you create and use persistence categories in your app
  // This would typically be used like:
  // const variantsCategory = await MockPersistanceCategory.init<SettingVariant>({ ... });
  // if (_data.variants) {
  //   variantsCategory._seedData(_data.variants.map((v, i) => ({ id: i + 1, value: v })));
  // }
}

// ============================================================================
// Cleanup Utilities
// ============================================================================

/**
 * Reset all mocks to clean state
 */
export function resetAllMocks(): void {
  // Reset Azure Speech SDK mock
  mockAzureSpeech.reset();

  // Reset Persistence mock
  MockPersistanceCategory._resetAll();
  mockPersistenceConfig.reset();
}

/**
 * Clear all storage (localStorage, sessionStorage)
 */
export function clearAllStorage(): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.clear();
  }
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.clear();
  }
}

/**
 * Full cleanup - resets mocks and clears storage
 */
export function cleanup(): void {
  resetAllMocks();
  clearAllStorage();
}

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean,
  options: { timeout?: number; interval?: number } = {},
): Promise<void> {
  const { timeout = 5000, interval = 50 } = options;
  const startTime = Date.now();

  while (!condition()) {
    if (Date.now() - startTime > timeout) {
      throw new Error('waitFor timeout: condition not met');
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

/**
 * Wait for a specific amount of time
 */
export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a mock callback set for CaptioningService
 */
export interface MockCallbacks {
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

export function createMockCallbacks(customImpl?: Partial<MockCallbacks>): {
  onTranslating: (
    translations: Record<string, string>,
    original: string,
  ) => void;
  onTranslated: (
    translations: Record<string, string>,
    original: string,
  ) => void;
  onError: (error: string) => void;
  _calls: {
    onTranslating: Array<{
      translations: Record<string, string>;
      original: string;
    }>;
    onTranslated: Array<{
      translations: Record<string, string>;
      original: string;
    }>;
    onError: Array<{ error: string }>;
  };
  _reset: () => void;
} {
  const calls = {
    onTranslating: [] as Array<{
      translations: Record<string, string>;
      original: string;
    }>,
    onTranslated: [] as Array<{
      translations: Record<string, string>;
      original: string;
    }>,
    onError: [] as Array<{ error: string }>,
  };

  const callbacks = {
    onTranslating: (translations: Record<string, string>, original: string) => {
      calls.onTranslating.push({ translations, original });
      customImpl?.onTranslating?.(translations, original);
    },
    onTranslated: (translations: Record<string, string>, original: string) => {
      calls.onTranslated.push({ translations, original });
      customImpl?.onTranslated?.(translations, original);
    },
    onError: (error: string) => {
      calls.onError.push({ error });
      customImpl?.onError?.(error);
    },
    _calls: calls,
    _reset: () => {
      calls.onTranslating = [];
      calls.onTranslated = [];
      calls.onError = [];
    },
  };

  return callbacks;
}

/**
 * Simulate localStorage events between windows
 */
export function simulateStorageEvent(
  key: string,
  newValue: string | null,
): void {
  const event = new StorageEvent('storage', {
    key,
    newValue,
    oldValue: localStorage.getItem(key),
    storageArea: localStorage,
    url: window.location.href,
  });
  window.dispatchEvent(event);
}

// ============================================================================
// Assertion Helpers
// ============================================================================

/**
 * Assert that Azure mock received expected events
 */
export function assertAzureEvents(expectedEventTypes: string[]): void {
  const state = mockAzureSpeech.getRecognizerState();
  const actualEventTypes = state.eventsEmitted.map((e) => e.type);

  if (JSON.stringify(actualEventTypes) !== JSON.stringify(expectedEventTypes)) {
    throw new Error(
      `Expected Azure events ${JSON.stringify(expectedEventTypes)}, but got ${JSON.stringify(actualEventTypes)}`,
    );
  }
}

/**
 * Assert that persistence mock has expected metrics
 */
export function assertPersistenceMetrics(expected: {
  minCalls?: number;
  maxCalls?: number;
  failedCalls?: number;
  successRate?: number;
}): void {
  const metrics = mockPersistenceConfig.getMetrics();

  if (
    expected.minCalls !== undefined &&
    metrics.totalCalls < expected.minCalls
  ) {
    throw new Error(
      `Expected at least ${expected.minCalls} calls, but got ${metrics.totalCalls}`,
    );
  }

  if (
    expected.maxCalls !== undefined &&
    metrics.totalCalls > expected.maxCalls
  ) {
    throw new Error(
      `Expected at most ${expected.maxCalls} calls, but got ${metrics.totalCalls}`,
    );
  }

  if (
    expected.failedCalls !== undefined &&
    metrics.failedCalls !== expected.failedCalls
  ) {
    throw new Error(
      `Expected ${expected.failedCalls} failed calls, but got ${metrics.failedCalls}`,
    );
  }

  if (expected.successRate !== undefined) {
    const actualRate = metrics.successfulCalls / metrics.totalCalls;
    if (Math.abs(actualRate - expected.successRate) > 0.01) {
      throw new Error(
        `Expected success rate of ${expected.successRate}, but got ${actualRate}`,
      );
    }
  }
}
