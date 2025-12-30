const { app } = require('@azure/functions');
const { WebPubSubServiceClient } = require('@azure/web-pubsub');
const crypto = require('crypto');

const OPERATOR_SECRET = process.env.OPERATOR_SECRET;
const READER_SECRET = process.env.READER_SECRET;
const CONNECTION_STRING = process.env.WEBPUBSUB_CONNECTION_STRING;
const HUB_NAME = 'translator';

/**
 * Timing-safe comparison of secrets to prevent timing attacks
 */
function timingSafeCompare(a, b) {
  if (!a || !b) return false;

  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  // If lengths differ, still perform comparison to prevent timing leaks
  if (bufA.length !== bufB.length) {
    // Compare against a dummy buffer of the same length as input
    const dummyBuf = Buffer.alloc(bufA.length);
    crypto.timingSafeEqual(bufA, dummyBuf);
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}

app.http('webpubsub-access', {
  methods: ['POST'],
  authLevel: 'anonymous',
  handler: async (request, context) => {
    try {
      const body = await request.json();
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
      let tokenResponse;

      if (timingSafeCompare(secret, OPERATOR_SECRET)) {
        // Operator: can create addrooms, send messages, and read
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
      } else if (timingSafeCompare(secret, READER_SECRET)) {
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
