export type DemoUser = { id: string; name: string };

export type LoginResponse = {
  user: DemoUser;
  pubnub: {
    publishKey: string;
    subscribeKey: string;
    token: string;
    presenceChannel: string;
    tokenTtlMinutes: number;
  };
};

export type ChatMessage = {
  id: string;
  text: string;
  senderId: string;
  senderName?: string;
  createdAt: number; // ms
  timetoken?: string;
};
