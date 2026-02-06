import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useTestSession } from './useTestSession';

vi.mock('../stores/webpubsub', () => ({
  useWebPubSubStore: () => ({
    openRoom: vi.fn(),
    closeRoom: vi.fn(),
    sendToRoom: vi.fn(),
  }),
}));

vi.mock('../services/translatorPersistance', () => ({
  ensureTranslatorPersistance: vi.fn(),
  getStreamedSessionsCategory: vi.fn(),
}));

describe('useTestSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return startTestSession, stopTestSession, and isTestSessionRunning functions', () => {
    const { startTestSession, stopTestSession, isTestSessionRunning } =
      useTestSession();

    expect(startTestSession).toBeTypeOf('function');
    expect(stopTestSession).toBeTypeOf('function');
    expect(isTestSessionRunning).toBeTypeOf('function');
  });
});
