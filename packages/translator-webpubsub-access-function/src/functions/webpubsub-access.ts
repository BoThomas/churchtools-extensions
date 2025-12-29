import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from '@azure/functions';
import { WebPubSubServiceClient } from '@azure/web-pubsub';

interface TokenRequest {
  secret: string;
  roomId: string;
  userId?: string;
}

interface TokenResponse {
  url: string;
  role: 'operator' | 'reader';
  roomId: string;
}

const OPERATOR_SECRET = process.env.OPERATOR_SECRET!;
const READER_SECRET = process.env.READER_SECRET!;
const CONNECTION_STRING = process.env.WEBPUBSUB_CONNECTION_STRING!;
const HUB_NAME = 'translator';

app.http('webpubsub-access', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: async (
    request: HttpRequest,
    context: InvocationContext,
  ): Promise<HttpResponseInit> => {
    try {
      const body = (await request.json()) as TokenRequest;
      const { secret, roomId, userId } = body;

      if (!secret || !roomId) {
        return {
          status: 400,
          jsonBody: { error: 'Missing required fields: secret, roomId' },
        };
      }

      // Validate room ID format
      if (!/^[a-zA-Z0-9_-]+$/.test(roomId)) {
        return {
          status: 400,
          jsonBody: { error: 'Invalid roomId format' },
        };
      }

      const client = new WebPubSubServiceClient(CONNECTION_STRING, HUB_NAME);
      let tokenResponse: TokenResponse;

      if (secret === OPERATOR_SECRET) {
        // Operator: can create rooms, send messages, and read
        const token = await client.getClientAccessToken({
          userId: userId || `operator_${Date.now()}`,
          roles: [
            `webpubsub.joinLeaveGroup.${roomId}`,
            `webpubsub.sendToGroup.${roomId}`,
          ],
          groups: [roomId],
        });

        tokenResponse = {
          url: token.url,
          role: 'operator',
          roomId,
        };

        context.log(`Granted operator access for room: ${roomId}`);
      } else if (secret === READER_SECRET) {
        // Reader: can only join and read from a specific room
        const token = await client.getClientAccessToken({
          userId: userId || `reader_${Date.now()}`,
          roles: [`webpubsub.joinLeaveGroup.${roomId}`],
          groups: [roomId],
        });

        tokenResponse = {
          url: token.url,
          role: 'reader',
          roomId,
        };

        context.log(`Granted reader access for room: ${roomId}`);
      } else {
        context.warn('Invalid secret provided');
        return {
          status: 401,
          jsonBody: { error: 'Invalid secret' },
        };
      }

      return {
        status: 200,
        jsonBody: tokenResponse,
      };
    } catch (error) {
      context.error('Error granting access:', error);
      return {
        status: 500,
        jsonBody: { error: 'Internal server error' },
      };
    }
  },
});
