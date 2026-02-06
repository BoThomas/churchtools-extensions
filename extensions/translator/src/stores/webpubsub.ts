import { defineStore } from 'pinia';
import { ref } from 'vue';
import type {
  StreamedSessionMessage,
  StreamedSessionMetadata,
} from '../types/streamedSession';
import { WebPubSubService } from '../services/webPubSubService';
import { useSettingsStore } from './settings';
import {
  ensureTranslatorPersistance,
  getStreamedSessionsCategory,
} from '../services/translatorPersistance';

export const useWebPubSubStore = defineStore('webpubsub', () => {
  const webPubSubService = new WebPubSubService();

  // Error handling
  const error = ref<string | null>(null);

  async function ensureStreamedSessionsCategory() {
    await ensureTranslatorPersistance();
  }

  /**
   * Open a WebPubSub room as operator (creates room on demand)
   */
  async function openRoom(roomId: string, userId: number) {
    const settingsStore = useSettingsStore();

    await webPubSubService.openRoom(roomId, userId, {
      authFunctionUrl: settingsStore.readerConfig.authFunctionUrl,
      operatorSecret: settingsStore.operatorSecret.secret,
    });
  }

  /**
   * Close a WebPubSub room connection (disconnect operator)
   */
  async function closeRoom(roomId: string) {
    await webPubSubService.closeRoom(roomId);
  }

  async function closeReader(client: unknown) {
    const readerClient = client as { stop?: () => void } | null;
    try {
      readerClient?.stop?.();
    } catch (e) {
      console.warn('Failed to stop reader client (non-critical):', e);
    }
  }

  async function openReaderRoom(
    roomId: string,
    userId: string,
    onMessage: (message: StreamedSessionMessage) => void,
  ): Promise<unknown> {
    const settingsStore = useSettingsStore();

    const client = await webPubSubService.openReaderRoom(roomId, userId, {
      authFunctionUrl: settingsStore.readerConfig.authFunctionUrl,
      readerSecret: settingsStore.readerConfig.readerSecret,
    });

    client.on('group-message', (event) => {
      const message = event.message;
      const rawData = message.data;
      const rawType = message.dataType;

      if (rawType === 'json' && rawData) {
        onMessage(rawData as StreamedSessionMessage);
        return;
      }

      try {
        const parsed = JSON.parse(String(rawData)) as StreamedSessionMessage;
        onMessage(parsed);
      } catch {
        onMessage({
          type: 'system',
          payload: {
            message: String(rawData ?? ''),
            timestamp: new Date().toISOString(),
          },
        });
      }
    });

    return client as unknown;
  }

  /**
   * Get active sessions available for reader discovery
   * Reads from streamed-sessions category (reader-accessible)
   */
  async function getDiscoverableSessions(): Promise<StreamedSessionMetadata[]> {
    try {
      await ensureStreamedSessionsCategory();
      const streamedSessionsCategory = await getStreamedSessionsCategory();
      if (!streamedSessionsCategory) return [];

      const sessions =
        await streamedSessionsCategory.list<StreamedSessionMetadata>();

      // Return all sessions in this category
      // They're already filtered (only active, non-hidden sessions are added)
      return sessions.map((s) => s.value);
    } catch (e: any) {
      console.error('Failed to fetch discoverable sessions:', e);
      return [];
    }
  }

  async function sendToRoom(roomId: string, payload: Record<string, unknown>) {
    await webPubSubService.sendToRoom(roomId, payload);
  }

  return {
    // State
    error,

    // Actions
    openRoom,
    closeRoom,
    openReaderRoom,
    closeReader,
    sendToRoom,
    getDiscoverableSessions,
  };
});
