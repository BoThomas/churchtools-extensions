import { LoremIpsum } from 'lorem-ipsum';
import type { StreamedSessionMessage } from '../types/streamedSession';
import type { LanguageConfig } from '../types/language';
import { useWebPubSubStore } from '../stores/webpubsub';
import {
  ensureTranslatorPersistance,
  getStreamedSessionsCategory,
} from '../services/translatorPersistance';

const lorem = new LoremIpsum({
  sentencesPerParagraph: {
    max: 5,
    min: 1,
  },
  wordsPerSentence: {
    max: 20,
    min: 4,
  },
});

let testSessionInterval: ReturnType<typeof setInterval> | null = null;
let currentRoomId: string | null = null;
let currentSessionId: number | null = null;
let currentParagraphCounters: Record<string, number> = {};
let isPaused = false;
let showLive = true;

export function useTestSession() {
  const webPubSubStore = useWebPubSubStore();

  async function startTestSession(
    operatorLanguages: LanguageConfig[],
    onMessage: (message: StreamedSessionMessage) => void,
    userName?: string,
  ): Promise<void> {
    stopTestSession();

    const roomId = crypto.randomUUID();
    currentRoomId = roomId;

    await ensureTranslatorPersistance();
    const streamedSessionsCategory = await getStreamedSessionsCategory();
    if (!streamedSessionsCategory) {
      throw new Error('Streamed sessions category not available');
    }

    const userId = Math.floor(Math.random() * 1000000);
    await webPubSubStore.openRoom(roomId, userId);

    const sessionId = Date.now();
    currentSessionId = sessionId;

    const displayName = `Test Session ${new Date().toLocaleTimeString()}`;

    const streamedMetadata = {
      sessionId,
      webPubSubRoomId: roomId,
      displayName,
      inputLanguage: operatorLanguages[0]?.code ?? 'en',
      outputLanguages: operatorLanguages.map((l) => l.code),
      operatorName: userName ?? 'Unknown Operator',
      startTime: new Date().toISOString(),
      lastHeartbeat: new Date().toISOString(),
      currentClients: 0,
      status: 'running' as const,
      isTestSession: true,
    };

    await streamedSessionsCategory.create(streamedMetadata);

    isPaused = false;
    showLive = true;
    testSessionInterval = setInterval(async () => {
      if (isPaused) return;

      if (showLive) {
        const liveTranslations: Record<string, string> = {};
        for (const lang of operatorLanguages) {
          liveTranslations[lang.code] = lorem.generateSentences(1);
        }

        const message: StreamedSessionMessage = {
          type: 'translation-live',
          payload: {
            translations: liveTranslations,
            isLive: true,
            timestamp: new Date().toISOString(),
          },
          sessionId,
        };

        await webPubSubStore.sendToRoom(roomId, message);
        onMessage(message);
      } else {
        const finalizedTranslations: Record<string, string> = {};
        for (const lang of operatorLanguages) {
          if (!currentParagraphCounters[lang.code]) {
            currentParagraphCounters[lang.code] = 0;
          }
          currentParagraphCounters[lang.code]++;
          finalizedTranslations[lang.code] =
            `${currentParagraphCounters[lang.code]}. ${lorem.generateParagraphs(1)}`;
        }

        const message: StreamedSessionMessage = {
          type: 'translation-final',
          payload: {
            translations: finalizedTranslations,
            isLive: false,
            timestamp: new Date().toISOString(),
          },
          sessionId,
        };

        await webPubSubStore.sendToRoom(roomId, message);
        onMessage(message);
      }
      showLive = !showLive;
    }, 800);
  }

  async function stopTestSession(): Promise<void> {
    if (testSessionInterval) {
      clearInterval(testSessionInterval);
      testSessionInterval = null;
    }

    currentParagraphCounters = {};
    isPaused = false;
    showLive = true;

    if (currentSessionId) {
      try {
        const streamedSessionsCategory = await getStreamedSessionsCategory();
        if (streamedSessionsCategory) {
          const sessions = await streamedSessionsCategory.list();
          const session = sessions.find(
            (s) => s.value.sessionId === currentSessionId,
          );
          if (session) {
            await streamedSessionsCategory.delete(session.id);
          }
        }
      } catch (e) {
        console.warn('Failed to delete streamed session:', e);
      }
    }

    if (currentRoomId) {
      try {
        await webPubSubStore.closeRoom(currentRoomId);
      } catch (e) {
        console.warn('Failed to close WebPubSub room:', e);
      }
      currentRoomId = null;
    }

    currentSessionId = null;
  }

  async function pauseTestSession(): Promise<void> {
    isPaused = true;

    if (currentSessionId) {
      try {
        const streamedSessionsCategory = await getStreamedSessionsCategory();
        if (streamedSessionsCategory) {
          const sessions = await streamedSessionsCategory.list();
          const session = sessions.find(
            (s) => s.value.sessionId === currentSessionId,
          );
          if (session) {
            await streamedSessionsCategory.update(session.id, {
              ...session.value,
              status: 'paused',
              lastHeartbeat: new Date().toISOString(),
            });
          }
        }
      } catch (e) {
        console.warn('Failed to pause streamed session:', e);
      }
    }
  }

  async function resumeTestSession(): Promise<void> {
    isPaused = false;

    if (currentSessionId) {
      try {
        const streamedSessionsCategory = await getStreamedSessionsCategory();
        if (streamedSessionsCategory) {
          const sessions = await streamedSessionsCategory.list();
          const session = sessions.find(
            (s) => s.value.sessionId === currentSessionId,
          );
          if (session) {
            await streamedSessionsCategory.update(session.id, {
              ...session.value,
              status: 'running',
              lastHeartbeat: new Date().toISOString(),
            });
          }
        }
      } catch (e) {
        console.warn('Failed to resume streamed session:', e);
      }
    }
  }

  function isTestSessionRunning(): boolean {
    return testSessionInterval !== null;
  }

  return {
    startTestSession,
    stopTestSession,
    pauseTestSession,
    resumeTestSession,
    isTestSessionRunning,
  };
}
