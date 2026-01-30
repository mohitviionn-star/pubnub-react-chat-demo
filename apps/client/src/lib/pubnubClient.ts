import PubNub from "pubnub";

/**
 * Create a browser PubNub client.
 * Uses `userId` (required by newer SDKs) and sets a PAM v3 token.
 */
export function createPubNubClient(args: {
  publishKey: string;
  subscribeKey: string;
  userId: string;
  token: string;
}) {
  const pn = new PubNub({
    publishKey: args.publishKey,
    subscribeKey: args.subscribeKey,
    userId: args.userId,
    ssl: true,
    restore: true, // attempt to catch up after reconnect
    heartbeatInterval: 10,
    presenceTimeout: 60,
  });

  // PAM v3: set a server-issued token on the client
  pn.setToken(args.token);

  return pn;
}
