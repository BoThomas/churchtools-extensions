/**
 * Azure Mock Setup for E2E Tests
 *
 * Since Playwright runs in a real browser, we need to inject Azure SDK mocks
 * at the browser context level. ChurchTools API calls are NOT mocked - tests
 * use a real ChurchTools instance for authentic integration testing.
 *
 * This approach:
 * - Mocks Azure Speech SDK (stable, no costs, fast)
 * - Uses real ChurchTools instance (tests auth, persistence, API compatibility)
 */

import type { BrowserContext } from '@playwright/test';

/**
 * Setup Azure mocks for E2E testing at the CONTEXT level
 *
 * This function configures Playwright to mock the Azure Speech SDK
 * at the browser context level, which means it applies to ALL pages
 * (including popups/new windows) created in that context.
 *
 * @param context - Playwright browser context
 * @param options - Mock configuration options
 */
export async function setupAzureMocksForContext(
  context: BrowserContext,
  options: {
    azureScenario?: string;
  } = {},
) {
  const { azureScenario = 'basic' } = options;

  // Inject init script to enable Azure mocking
  // This runs before any page loads in this context
  await context.addInitScript((scenarioName) => {
    (window as any).__USE_MOCK_AZURE__ = true;
    (window as any).__MOCK_AZURE_SCENARIO__ = scenarioName;
  }, azureScenario);

  console.log(`🎭 Azure SDK mocking enabled (scenario: ${azureScenario})`);
}

/**
 * Azure mock scenarios available for testing
 *
 * These correspond to scenarios in src/__mocks__/azureSpeechSdk.ts
 */
export const AZURE_SCENARIOS = {
  basic: 'basic' as const,
  multiLanguage: 'multiLanguage' as const,
  error: 'error' as const,
  networkError: 'networkError' as const,
  noSpeech: 'noSpeech' as const,
  profanity: 'profanity' as const,
  longPause: 'longPause' as const,
  multipleUtterances: 'multipleUtterances' as const,
  canceledRecognition: 'canceledRecognition' as const,
};
