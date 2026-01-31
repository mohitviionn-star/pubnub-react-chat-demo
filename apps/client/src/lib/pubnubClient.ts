import PubNub from "pubnub";

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
    restore: true,
    heartbeatInterval: 10,
    presenceTimeout: 60,
  });

  pn.setToken(args.token);

  return pn;
}
