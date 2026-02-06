export type ApiSettings = {
  azureApiKey: string;
  azureRegion: string;
};

export type OperatorSecret = {
  secret: string;
};

export type ReaderConfig = {
  enabled: boolean;
  authFunctionUrl: string;
  readerSecret: string;
};

export type TranslatorSettings = {
  // Translation Options
  inputLanguage: string; // Language code (e.g., 'de-DE')
  outputLanguages: string[]; // Array of language codes (e.g., ['en', 'es'])
  profanityOption: 'raw' | 'remove' | 'mask';
  stablePartialResultThreshold: string;
  phraseList: string;

  // Presentation Options
  presentation: {
    font: string;
    fontSize: string;
    margin: string;
    color: string;
    liveColor: string;
    background: string;
    mode: 'split' | 'multi-window'; // Split-screen or multiple windows
    showInputLanguage: boolean; // Show input language transcription in presentation
  };

  // Session Options (WebPubSub)
  session?: {
    displayName?: string; // Optional user-provided session name (auto-generated if empty)
    maxClients?: number; // Optional max client count (undefined = unlimited)
    hidden: boolean; // Whether to hide this session from the session overview
  };

  // Output mode enabled states (track which modes are active per variant)
  outputModes?: {
    presentationEnabled: boolean;
    streamedSessionEnabled: boolean;
  };
};

export type SettingVariant = {
  name: string;
  settings: TranslatorSettings;
};

export type UsageStats = {
  userId: number;
  userEmail: string;
  userName: string;
  totalMinutes: number;
  activeMinutes: number;
  pausedMinutes: number;
  sessionCount: number;
  lastUsed: string;
  sessions: { date: string; activeMinutes: number; pausedMinutes: number }[];
};
