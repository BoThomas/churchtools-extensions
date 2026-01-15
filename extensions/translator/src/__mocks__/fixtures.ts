import type {
  TranslatorSettings,
  ApiSettings,
  SettingVariant,
} from '../types/translator';
import { DEFAULT_TRANSLATOR_SETTINGS } from '../services/translatorVariantService';
import type { TranslationSession } from '../services/sessionLogger';

/**
 * Test fixtures for translator tests
 * Includes settings, variants, sessions, and data generators
 */

// ============================================================================
// API Settings Fixtures
// ============================================================================

export const mockApiSettings: ApiSettings = {
  azureApiKey: 'test-key-12345',
  azureRegion: 'westeurope',
};

export const mockEmptyApiSettings: ApiSettings = {
  azureApiKey: '',
  azureRegion: '',
};

export const mockInvalidApiSettings: ApiSettings = {
  azureApiKey: 'invalid-key',
  azureRegion: 'invalid-region',
};

// ============================================================================
// Translator Settings Fixtures
// ============================================================================

export const mockDefaultSettings: TranslatorSettings = {
  ...DEFAULT_TRANSLATOR_SETTINGS,
};

export const mockMultiLanguageSettings: TranslatorSettings = {
  inputLanguage: 'en-GB',
  outputLanguages: ['de', 'es', 'fr'],
  profanityOption: 'mask',
  stablePartialResultThreshold: '3',
  phraseList: 'church;worship;sermon',
  presentation: {
    font: 'Helvetica',
    fontSize: '1.5em',
    margin: '2em',
    color: '#ffffff',
    liveColor: '#cccccc',
    background: '#000000',
    mode: 'multi-window',
    showInputLanguage: true,
  },
};

export const mockTestModeSettings: TranslatorSettings = {
  inputLanguage: 'de-DE',
  outputLanguages: ['en', 'es'],
  profanityOption: 'remove',
  stablePartialResultThreshold: '7',
  phraseList: 'Gott;Jesus;Gemeinde',
  presentation: {
    font: 'Verdana',
    fontSize: '1.8em',
    margin: '1.5em',
    color: '#f0f0f0',
    liveColor: '#aaaaaa',
    background: '#1a1a1a',
    mode: 'split',
    showInputLanguage: true,
  },
};

export const mockMinimalSettings: TranslatorSettings = {
  inputLanguage: 'en-US',
  outputLanguages: ['fr'],
  profanityOption: 'raw',
  stablePartialResultThreshold: '5',
  phraseList: '',
  presentation: {
    font: 'Arial',
    fontSize: '2em',
    margin: '1em',
    color: 'white',
    liveColor: '#999',
    background: 'black',
    mode: 'split',
    showInputLanguage: false,
  },
};

export const mockFiveLanguageSettings: TranslatorSettings = {
  inputLanguage: 'en-US',
  outputLanguages: ['de', 'es', 'fr', 'it', 'pt'],
  profanityOption: 'mask',
  stablePartialResultThreshold: '5',
  phraseList: 'God;grace;faith;prayer;blessing',
  presentation: {
    font: 'Georgia',
    fontSize: '1.6em',
    margin: '1em 1.5em',
    color: '#ffffff',
    liveColor: '#bbbbbb',
    background: '#000000',
    mode: 'split',
    showInputLanguage: false,
  },
};

// ============================================================================
// Setting Variants Fixtures
// ============================================================================

export const mockDefaultVariant: SettingVariant = {
  name: 'Default',
  settings: mockDefaultSettings,
};

export const mockCustomVariant: SettingVariant = {
  name: 'Sunday Service',
  settings: mockMultiLanguageSettings,
};

export const mockYouthServiceVariant: SettingVariant = {
  name: 'Youth Service',
  settings: {
    inputLanguage: 'en-GB',
    outputLanguages: ['de', 'es'],
    profanityOption: 'remove',
    stablePartialResultThreshold: '3',
    phraseList: 'worship;praise;youth;passion',
    presentation: {
      font: 'Impact',
      fontSize: '2.5em',
      margin: '1em',
      color: '#00ff00',
      liveColor: '#88ff88',
      background: '#000000',
      mode: 'multi-window',
      showInputLanguage: false,
    },
  },
};

export const mockWeddingVariant: SettingVariant = {
  name: 'Wedding',
  settings: {
    inputLanguage: 'de-DE',
    outputLanguages: ['en', 'fr', 'it'],
    profanityOption: 'remove',
    stablePartialResultThreshold: '5',
    phraseList: 'Hochzeit;Ehe;Liebe;Segen',
    presentation: {
      font: 'Times New Roman',
      fontSize: '1.8em',
      margin: '2em',
      color: '#ffd700',
      liveColor: '#ccaa00',
      background: '#2c1810',
      mode: 'split',
      showInputLanguage: true,
    },
  },
};

export const mockConferenceVariant: SettingVariant = {
  name: 'Conference',
  settings: mockFiveLanguageSettings,
};

// ============================================================================
// User Fixtures
// ============================================================================

export const mockUser = {
  id: 123,
  email: 'test@example.com',
  name: 'Test User',
};

export const mockUser2 = {
  id: 456,
  email: 'pastor@example.com',
  name: 'Pastor Smith',
};

export const mockUser3 = {
  id: 789,
  email: 'translator@example.com',
  name: 'Translation Team',
};

// ============================================================================
// Session Fixtures
// ============================================================================

export const mockCompletedSession: TranslationSession = {
  userId: mockUser.id,
  userEmail: mockUser.email,
  userName: mockUser.name,
  startTime: '2024-01-15T10:00:00.000Z',
  endTime: '2024-01-15T11:30:00.000Z',
  durationMinutes: 90,
  inputLanguage: 'de-DE',
  outputLanguages: ['en'],
  mode: 'presentation',
  status: 'completed',
};

export const mockRunningSession: TranslationSession = {
  userId: mockUser.id,
  userEmail: mockUser.email,
  userName: mockUser.name,
  startTime: '2024-01-15T10:00:00.000Z',
  lastHeartbeat: '2024-01-15T10:30:00.000Z',
  inputLanguage: 'en-GB',
  outputLanguages: ['de', 'es'],
  mode: 'test',
  status: 'running',
};

export const mockPausedSession: TranslationSession = {
  userId: mockUser.id,
  userEmail: mockUser.email,
  userName: mockUser.name,
  startTime: '2024-01-15T10:00:00.000Z',
  lastHeartbeat: '2024-01-15T10:30:00.000Z',
  pausedAt: '2024-01-15T10:25:00.000Z',
  pausedDurationMinutes: 10,
  inputLanguage: 'de-DE',
  outputLanguages: ['en'],
  mode: 'presentation',
  status: 'paused',
};

export const mockAbandonedSession: TranslationSession = {
  userId: mockUser.id,
  userEmail: mockUser.email,
  userName: mockUser.name,
  startTime: '2024-01-15T10:00:00.000Z',
  lastHeartbeat: '2024-01-15T10:05:00.000Z',
  inputLanguage: 'de-DE',
  outputLanguages: ['en'],
  mode: 'presentation',
  status: 'running',
};

export const mockShortSession: TranslationSession = {
  userId: mockUser2.id,
  userEmail: mockUser2.email,
  userName: mockUser2.name,
  startTime: '2024-01-16T09:00:00.000Z',
  endTime: '2024-01-16T09:15:00.000Z',
  durationMinutes: 15,
  inputLanguage: 'en-US',
  outputLanguages: ['es'],
  mode: 'test',
  status: 'completed',
};

export const mockLongSession: TranslationSession = {
  userId: mockUser2.id,
  userEmail: mockUser2.email,
  userName: mockUser2.name,
  startTime: '2024-01-17T08:00:00.000Z',
  endTime: '2024-01-17T11:30:00.000Z',
  durationMinutes: 210,
  inputLanguage: 'en-GB',
  outputLanguages: ['de', 'es', 'fr'],
  mode: 'presentation',
  status: 'completed',
};

export const mockMultiLanguageSession: TranslationSession = {
  userId: mockUser3.id,
  userEmail: mockUser3.email,
  userName: mockUser3.name,
  startTime: '2024-01-18T10:00:00.000Z',
  endTime: '2024-01-18T11:00:00.000Z',
  durationMinutes: 60,
  inputLanguage: 'en-US',
  outputLanguages: ['de', 'es', 'fr', 'it', 'pt'],
  mode: 'presentation',
  status: 'completed',
};

export const mockSessionWithMultiplePauses: TranslationSession = {
  userId: mockUser.id,
  userEmail: mockUser.email,
  userName: mockUser.name,
  startTime: '2024-01-19T10:00:00.000Z',
  endTime: '2024-01-19T12:00:00.000Z',
  durationMinutes: 120,
  pausedDurationMinutes: 30,
  inputLanguage: 'de-DE',
  outputLanguages: ['en', 'fr'],
  mode: 'presentation',
  status: 'completed',
};

// Legacy session with old outputLanguage field
export const mockLegacySession: TranslationSession = {
  userId: mockUser.id,
  userEmail: mockUser.email,
  userName: mockUser.name,
  startTime: '2024-01-15T10:00:00.000Z',
  endTime: '2024-01-15T11:00:00.000Z',
  durationMinutes: 60,
  inputLanguage: 'de-DE',
  outputLanguage: 'en', // Old format
  mode: 'presentation',
  status: 'completed',
};

// ============================================================================
// Legacy Settings Fixtures (for migration tests)
// ============================================================================

export const mockLegacySettingsWithObjectLanguages = {
  inputLanguage: { name: 'German', code: 'de-DE' },
  outputLanguage: { name: 'English', code: 'en' },
  profanityOption: 'raw',
  stablePartialResultThreshold: '5',
  phraseList: '',
  presentation: {
    font: 'Arial',
    fontSize: '2em',
    margin: '1em 2em',
    color: 'white',
    liveColor: '#999',
    background: 'black',
  },
};

export const mockLegacySettingsWithSingleOutput = {
  inputLanguage: 'de-DE',
  outputLanguage: 'en',
  profanityOption: 'raw',
  stablePartialResultThreshold: '5',
  phraseList: '',
  presentation: {
    font: 'Arial',
    fontSize: '2em',
    margin: '1em 2em',
    color: 'white',
    liveColor: '#999',
    background: 'black',
  },
};

// ============================================================================
// Invalid/Corrupt Data Fixtures (for error handling tests)
// ============================================================================

export const mockCorruptSession = {
  userId: 'not-a-number', // Invalid type
  startTime: 'invalid-date',
  inputLanguage: null,
  mode: 'invalid-mode',
};

export const mockIncompleteSettings = {
  inputLanguage: 'de-DE',
  // Missing outputLanguages
  profanityOption: 'raw',
};

export const mockSettingsWithInvalidLanguages = {
  inputLanguage: 'xx-XX', // Non-existent language
  outputLanguages: ['zz', 'yy'], // Non-existent languages
  profanityOption: 'raw',
  stablePartialResultThreshold: '5',
  phraseList: '',
  presentation: mockDefaultSettings.presentation,
};

// ============================================================================
// Fixture Generators
// ============================================================================

/**
 * Generate a session with custom parameters
 */
export function generateSession(
  overrides: Partial<TranslationSession> = {},
): TranslationSession {
  return {
    userId: mockUser.id,
    userEmail: mockUser.email,
    userName: mockUser.name,
    startTime: new Date().toISOString(),
    endTime: new Date(Date.now() + 3600000).toISOString(),
    durationMinutes: 60,
    inputLanguage: 'de-DE',
    outputLanguages: ['en'],
    mode: 'presentation',
    status: 'completed',
    ...overrides,
  };
}

/**
 * Generate multiple sessions with date range
 */
export function generateSessions(
  count: number,
  options: {
    startDate?: Date;
    endDate?: Date;
    users?: Array<typeof mockUser>;
    modes?: Array<'presentation' | 'test'>;
    inputLanguages?: string[];
    outputLanguages?: string[][];
  } = {},
): TranslationSession[] {
  const {
    startDate = new Date('2024-01-01'),
    endDate = new Date('2024-12-31'),
    users = [mockUser, mockUser2, mockUser3],
    modes = ['presentation', 'test'],
    inputLanguages = ['de-DE', 'en-GB', 'en-US'],
    outputLanguages = [['en'], ['de', 'es'], ['fr'], ['de', 'es', 'fr']],
  } = options;

  const sessions: TranslationSession[] = [];
  const timeRange = endDate.getTime() - startDate.getTime();

  for (let i = 0; i < count; i++) {
    const user = users[i % users.length];
    const mode = modes[i % modes.length];
    const inputLanguage = inputLanguages[i % inputLanguages.length];
    const outputLangs = outputLanguages[i % outputLanguages.length];

    const sessionStart = new Date(
      startDate.getTime() + Math.random() * timeRange,
    );
    const durationMinutes = 15 + Math.floor(Math.random() * 180); // 15-195 minutes
    const sessionEnd = new Date(
      sessionStart.getTime() + durationMinutes * 60000,
    );

    sessions.push({
      userId: user.id,
      userEmail: user.email,
      userName: user.name,
      startTime: sessionStart.toISOString(),
      endTime: sessionEnd.toISOString(),
      durationMinutes,
      inputLanguage,
      outputLanguages: outputLangs,
      mode,
      status: 'completed',
    });
  }

  return sessions.sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  );
}

/**
 * Generate a variant with custom settings
 */
export function generateVariant(
  name: string,
  settingsOverrides: Partial<TranslatorSettings> = {},
): SettingVariant {
  return {
    name,
    settings: {
      ...mockDefaultSettings,
      ...settingsOverrides,
    },
  };
}

/**
 * Generate multiple variants
 */
export function generateVariants(count: number): SettingVariant[] {
  const variants: SettingVariant[] = [];
  const baseNames = [
    'Sunday Morning',
    'Evening Service',
    'Youth Service',
    'Small Group',
    'Conference',
    'Wedding',
    'Funeral',
    'Bible Study',
    'Prayer Meeting',
    'Special Event',
  ];

  for (let i = 0; i < count; i++) {
    const name =
      baseNames[i % baseNames.length] +
      (i >= baseNames.length ? ` ${Math.floor(i / baseNames.length) + 1}` : '');
    variants.push(generateVariant(name));
  }

  return variants;
}

/**
 * Generate realistic phrase lists
 */
export const PHRASE_LISTS = {
  church:
    'church;worship;sermon;prayer;blessing;faith;grace;God;Jesus;Holy Spirit',
  wedding: 'wedding;marriage;vows;ceremony;bride;groom;love;commitment;forever',
  conference:
    'presentation;speaker;workshop;session;networking;breakout;keynote',
  youth: 'youth;young people;passion;energy;worship;praise;contemporary',
  funeral:
    'memorial;remembrance;celebration of life;comfort;peace;eternal life',
};

/**
 * Generate a realistic session report dataset
 */
export function generateReportDataset(): TranslationSession[] {
  const now = new Date();
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  return generateSessions(100, {
    startDate: threeMonthsAgo,
    endDate: now,
  });
}
