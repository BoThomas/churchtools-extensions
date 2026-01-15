import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { StreamedSessionMetadata } from '../types/streamedSession';
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

  return {
    // State
    error,

    // Actions
    openRoom,
    closeRoom,
    getDiscoverableSessions,
  };
});
