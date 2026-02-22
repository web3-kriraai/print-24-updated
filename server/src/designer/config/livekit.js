import { AccessToken, RoomServiceClient } from "livekit-server-sdk";

let roomServiceInstance = null;

/**
 * Lazily initializes the LiveKit RoomServiceClient.
 * This ensures process.env is populated before the client is created.
 */
export const getRoomService = () => {
  if (!roomServiceInstance) {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitHost = process.env.LIVEKIT_URL || process.env.LIVEKIT_WS_URL;

    if (!livekitHost) {
      console.warn("[LiveKit] Warning: LIVEKIT_URL is not defined in environment variables");
    }

    roomServiceInstance = new RoomServiceClient(
      livekitHost || "",
      apiKey,
      apiSecret
    );
  }
  return roomServiceInstance;
};

export async function generateToken(identity, room) {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  const at = new AccessToken(apiKey, apiSecret, { identity });

  at.addGrant({
    roomJoin: true,
    room,
    canPublish: true,
    canSubscribe: true,
  });

  return await at.toJwt();
}
