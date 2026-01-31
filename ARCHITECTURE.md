# Pub/Sub Architecture (PubNub)

This document describes how this project uses **Publish/Subscribe (Pub/Sub)** via PubNub for real-time chat.

---

## Overview

In a **Pub/Sub** model:

- **Publishers** send messages to a **channel** without knowing who will receive them.
- **Subscribers** listen to one or more channels and receive messages in real time.
- The **broker** (PubNub) routes messages from publishers to all subscribers on that channel.

This app uses **PubNub** as the broker. The React client both **publishes** (sends messages, typing signals) and **subscribes** (receives messages, presence, signals) on channels determined by the backend and channel naming rules.

---

## Channels

| Channel pattern | Purpose | Who subscribes |
|-----------------|---------|-----------------|
| `dm.<userIdA>--<userIdB>` | 1:1 chat messages and typing signals | User A and User B (ids sorted so both use the same channel name) |
| `presence.global` | Global presence (online/offline) | All logged-in users |

Channel names are **deterministic**: for Alice and Bob, both use `dm.alice--bob` (sorted alphabetically). That way both peers subscribe to the same channel and see each other’s messages and typing.

---

## Publish

The client **publishes** in two ways:

1. **Messages** (chat text)  
   - Method: `pubnub.publish({ channel, message, storeInHistory: true })`  
   - Payload: `{ id, text, senderId, senderName, createdAt }`  
   - Stored in history when Message Persistence is enabled.

2. **Signals** (typing indicator)  
   - Method: `pubnub.signal({ channel, message })`  
   - Payload: string `t:<userId>:<1|0>` (typing on/off).  
   - Not stored in history; low latency, minimal footprint.

The server **does not** publish chat messages. It only issues **tokens** so clients can publish/subscribe to allowed channels.

---

## Subscribe

The client **subscribes** to:

1. **DM channel** (`dm.<me>--<peer>`) when a conversation is selected:  
   - Listener: `message` → new chat messages.  
   - Listener: `signal` → typing updates.  
   - On subscribe, the app also **fetches history** (`fetchMessages`) and merges it with real-time messages so nothing is lost.

2. **Presence channel** (`presence.global`):  
   - Listener: `presence` (join/leave/timeout) → used to build an “online set” for the user list.  
   - Subscription uses `withPresence: true` so presence events are delivered.

---

## Data Flow (high level)

```
[User A] --(1)--> Backend API (/auth/login)
                    |
                    v
              Backend issues PubNub token (PAM v3)
                    |
                    v
[User A] <--(2)--- Token + subscribeKey, publishKey

[User A] --(3)--> PubNub: subscribe(dm.alice--bob)
[User B] --(3)--> PubNub: subscribe(dm.alice--bob)

[User A] --(4)--> PubNub: publish(dm.alice--bob, message)
                    |
                    v
            PubNub delivers to all subscribers
                    |
[User B] <--(5)--- message event in listener
```

Steps 3–5 are **pure Pub/Sub**: no backend in the path for real-time delivery.

---

## Security (tokens)

- The **Secret Key** stays on the server and is never sent to the client.
- The backend issues **short-lived PAM v3 tokens** per user. Each token allows:
  - Read + write on DM channels that include that user’s id.
  - Read + join on the presence channel.
- The client uses this token via `pubnub.setToken(token)`. PubNub enforces permissions; clients cannot subscribe or publish to channels they are not allowed to use.

---

## Relevant code

| Concern | Location |
|--------|----------|
| Channel naming | `apps/client/src/lib/channels.ts` (`dmChannel`, `typingSignal`) |
| PubNub client init | `apps/client/src/lib/pubnubClient.ts` |
| Subscribe + message/signal listeners | `apps/client/src/hooks/useDmChat.ts` |
| Presence subscribe + listener | `apps/client/src/hooks/usePresence.ts` |
| Token grant | `apps/server/src/index.js` (`issueTokenForUser`) |

This architecture demonstrates a **real-time Pub/Sub** system using PubNub with clear separation between backend (auth + tokens) and client (publish/subscribe).
