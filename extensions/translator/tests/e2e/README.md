# E2E Testing with Playwright - Translator Extension

This directory contains End-to-End (E2E) tests for the Translator extension using [Playwright](https://playwright.dev/).

## Overview

- **Real ChurchTools Instance**: Tests run against a real ChurchTools instance to verify authentic integration (auth, API, persistence).
- **Mocked Azure SDK**: Azure Speech Services are mocked to ensure stability, speed, and zero costs.
- **Browser-based**: Tests run in Chromium to verify the actual user experience, including multi-window features.

## Prerequisites

1.  **Environment Setup**:
    - Copy `.env.e2e.example` to `.env.e2e` in the `extensions/translator` directory.
    - Configure the ChurchTools instance URL and credentials in `.env.e2e`.
    - Ensure the test user has appropriate permissions.

2.  **Dev Server**:
    - The tests expect the dev server to be running (or will start it automatically if configured).
    - `pnpm dev:e2e` starts the server in E2E mode.

## Running Tests

Run these commands from the `extensions/translator` directory:

```bash
# Run all E2E tests (headless)
pnpm test:e2e

# Run with UI (recommended for debugging)
pnpm test:e2e:ui

# Run in headed mode (see the browser)
pnpm test:e2e:headed

# Debug mode
pnpm test:e2e:debug
```

## Test Structure

- `fixtures/`: Custom Playwright fixtures (`extensionPage`, `windowHelper`) that handle setup.
- `mocks/`: Azure SDK mocks (`azureMockSetup.ts`).
- `utils/`: Helpers for localStorage and window management.
- `*.spec.ts`: The actual test files.

## Writing Tests

Use the `extensionFixture` to get a pre-configured page with Azure mocks already applied.

```typescript
import { test, expect } from './fixtures/extensionFixture';

test('my feature works', async ({ extensionPage }) => {
  await extensionPage.goto('/');
  // ChurchTools API calls are REAL
  // Azure SDK calls are MOCKED
  await expect(extensionPage.getByText('Start')).toBeVisible();
});
```
