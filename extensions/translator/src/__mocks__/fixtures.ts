import type {
  TranslatorSettings,
  ApiSettings,
  SettingVariant,
} from '../stores/translator';
import type { TranslationSession } from '../services/sessionLogger';

/**
 * Test fixtures for translator tests
 */

export const mockApiSettings: ApiSettings = {
  azureApiKey: 'test-key-12345',
  azureRegion: 'westeurope',
};

export const mockEmptyApiSettings: ApiSettings = {
  azureApiKey: '',
  azureRegion: '',
};

export const mockDefaultSettings: TranslatorSettings = {
  inputLanguage: 'de-DE',
  outputLanguages: ['en'],
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
    mode: 'split',
    showInputLanguage: false,
  },
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

export const mockDefaultVariant: SettingVariant = {
  name: 'Default',
  settings: mockDefaultSettings,
};

export const mockCustomVariant: SettingVariant = {
  name: 'Sunday Service',
  settings: mockMultiLanguageSettings,
};

// Legacy settings format (for migration tests)
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

// Session fixtures
export const mockUser = {
  id: 123,
  email: 'test@example.com',
  name: 'Test User',
};

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
  lastHeartbeat: '2024-01-15T10:05:00.000Z', // 20 minutes ago (assuming current time)
  inputLanguage: 'de-DE',
  outputLanguages: ['en'],
  mode: 'presentation',
  status: 'running',
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
