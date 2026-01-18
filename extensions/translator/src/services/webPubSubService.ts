import { WebPubSubClient } from '@azure/web-pubsub-client';

type WebPubSubValidationConfig = {
  authFunctionUrl: string;
  operatorSecret: string;
  readerSecret: string;
};

export type WebPubSubAccessConfig = {
  authFunctionUrl: string;
  operatorSecret: string;
};

export type WebPubSubReaderAccessConfig = {
  authFunctionUrl: string;
  readerSecret: string;
};

export class WebPubSubService {
  private clients = new Map<string, WebPubSubClient>();

  async validateConfig(
    config: WebPubSubValidationConfig,
  ): Promise<{ valid: boolean; error?: string }> {
    const { authFunctionUrl, operatorSecret, readerSecret } = config;

    // Validate URL format
    try {
      new URL(authFunctionUrl);
    } catch {
      return { valid: false, error: 'Invalid Auth Function URL format' };
    }

    // Test with a validation room ID
    const testRoomId = `validation-${Date.now()}`;

    try {
      // Test operator secret
      const operatorResponse = await fetch(authFunctionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: operatorSecret,
          roomId: testRoomId,
          userId: 'validation-operator',
        }),
      });

      if (!operatorResponse.ok) {
        const errorData = await operatorResponse.json().catch(() => ({}));
        return {
          valid: false,
          error: `Operator secret validation failed: ${
            errorData.error || operatorResponse.statusText
          }`,
        };
      }

      const operatorData = await operatorResponse.json();
      if (!operatorData.url || operatorData.role !== 'operator') {
        return {
          valid: false,
          error: 'Invalid operator token response from Azure function',
        };
      }

      // Test reader secret
      const readerResponse = await fetch(authFunctionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: readerSecret,
          roomId: testRoomId,
          userId: 'validation-reader',
        }),
      });

      if (!readerResponse.ok) {
        const errorData = await readerResponse.json().catch(() => ({}));
        return {
          valid: false,
          error: `Reader secret validation failed: ${
            errorData.error || readerResponse.statusText
          }`,
        };
      }

      const readerData = await readerResponse.json();
      if (!readerData.url || readerData.role !== 'reader') {
        return {
          valid: false,
          error: 'Invalid reader token response from Azure function',
        };
      }

      return { valid: true };
    } catch (e: any) {
      return {
        valid: false,
        error: `Network error: ${e.message || 'Failed to connect to Azure function'}`,
      };
    }
  }

  async getOperatorUrl(
    config: WebPubSubAccessConfig,
    roomId: string,
    userId: string,
  ): Promise<string> {
    const { authFunctionUrl, operatorSecret } = config;

    if (!authFunctionUrl) {
      throw new Error('WebPubSub auth function URL is missing');
    }
    if (!operatorSecret) {
      throw new Error('WebPubSub operator secret is missing');
    }

    const response = await fetch(authFunctionUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: operatorSecret,
        roomId,
        userId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error ||
          response.statusText ||
          'Failed to get operator token',
      );
    }

    const data = await response.json();
    if (!data?.url || data?.role !== 'operator') {
      throw new Error('Invalid operator token response from Azure function');
    }

    return data.url as string;
  }

  async getReaderUrl(
    config: WebPubSubReaderAccessConfig,
    roomId: string,
    userId: string,
  ): Promise<string> {
    const { authFunctionUrl, readerSecret } = config;

    if (!authFunctionUrl) {
      throw new Error('WebPubSub auth function URL is missing');
    }
    if (!readerSecret) {
      throw new Error('WebPubSub reader secret is missing');
    }

    const response = await fetch(authFunctionUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: readerSecret,
        roomId,
        userId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || response.statusText || 'Failed to get reader token',
      );
    }

    const data = await response.json();
    if (!data?.url || data?.role !== 'reader') {
      throw new Error('Invalid reader token response from Azure function');
    }

    return data.url as string;
  }

  async openRoom(
    roomId: string,
    userId: number,
    config: WebPubSubAccessConfig,
  ): Promise<void> {
    if (this.clients.has(roomId)) return;

    const accessUrl = await this.getOperatorUrl(
      config,
      roomId,
      `operator-${userId}`,
    );

    const client = new WebPubSubClient({
      getClientAccessUrl: async () => accessUrl,
    });

    await client.start();
    await client.joinGroup(roomId);
    this.clients.set(roomId, client);
  }

  async openReaderRoom(
    roomId: string,
    userId: string,
    config: WebPubSubReaderAccessConfig,
  ): Promise<WebPubSubClient> {
    const accessUrl = await this.getReaderUrl(config, roomId, userId);

    const client = new WebPubSubClient({
      getClientAccessUrl: async () => accessUrl,
    });

    await client.start();
    await client.joinGroup(roomId);

    return client;
  }

  async closeRoom(
    roomId: string,
    options: { notify?: boolean } = { notify: true },
  ): Promise<void> {
    const client = this.clients.get(roomId);
    if (!client) return;

    if (options.notify) {
      try {
        await client.sendToGroup(
          roomId,
          {
            type: 'session-ended',
            payload: {
              message: 'The operator has ended this session',
              timestamp: new Date().toISOString(),
            },
          },
          'json',
        );
      } catch (e) {
        console.warn('Failed to send session-ended message (non-critical):', e);
      }
    }

    try {
      client.stop();
    } catch (e) {
      console.warn('Failed to stop WebPubSub client (non-critical):', e);
    }

    this.clients.delete(roomId);
  }

  async sendToRoom(
    roomId: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const client = this.clients.get(roomId);
    if (!client) return;

    try {
      await client.sendToGroup(roomId, payload, 'json');
    } catch (e) {
      console.warn('Failed to send WebPubSub message (non-critical):', e);
    }
  }
}
