import { useEffect, useMemo, useRef, useState } from "react";
import type PubNub from "pubnub";
import { typingSignal } from "../lib/channels";
import type { ChatMessage, DemoUser } from "../types";

function nowMs() {
  return Date.now();
}

export function useDmChat(args: {
  pn: PubNub | null;
  me: DemoUser | null;
  peer: DemoUser | null;
  channel: string | null;
}) {
  const { pn, me, peer, channel } = args;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [peerTyping, setPeerTyping] = useState(false);

  // ✅ Dedupe set: prevents "optimistic + echo" double messages
  const idsRef = useRef<Set<string>>(new Set());

  const typingTimer = useRef<number | null>(null);

  const title = useMemo(() => {
    if (!peer) return "Select a user";
    return `Chat with ${peer.name}`;
  }, [peer]);

  // ✅ Reset when switching channel (changing peer)
  useEffect(() => {
    setMessages([]);
    setPeerTyping(false);
    idsRef.current = new Set();
  }, [channel]);

  useEffect(() => {
    if (!pn || !channel) return;

    let cancelled = false;

    const listener = {
      message: (e: any) => {
        if (e.channel !== channel) return;

        const msg = (e.message ?? {}) as any;

        const normalized: ChatMessage = {
          id: msg?.id ?? String(e.timetoken),
          text: msg?.text ?? "",
          senderId: msg?.senderId ?? e.publisher ?? "unknown",
          senderName: msg?.senderName,
          createdAt: msg?.createdAt ?? nowMs(),
          timetoken: String(e.timetoken),
        };

        // ✅ DEDUPE and keep chronological order
        setMessages((prev) => {
          const id = normalized.id;
          if (idsRef.current.has(id)) return prev;
          idsRef.current.add(id);
          const next = [...prev, normalized];
          return next.sort((a, b) => a.createdAt - b.createdAt);
        });
      },

      signal: (e: any) => {
        if (e.channel !== channel) return;
        const text = String(e.message || "");
        if (!peer) return;

        // typing signal format: t:<userId>:<0|1>
        const parts = text.split(":");
        if (parts.length === 3 && parts[0] === "t" && parts[1] === peer.id) {
          const on = parts[2] === "1";
          setPeerTyping(on);

          if (typingTimer.current) window.clearTimeout(typingTimer.current);
          if (on) {
            typingTimer.current = window.setTimeout(
              () => setPeerTyping(false),
              1800,
            );
          }
        }
      },
    };

    pn.addListener(listener);
    pn.subscribe({ channels: [channel], withPresence: false });

    // ✅ Load history (requires Message Persistence enabled)
    // Merge with current state so real-time messages that arrived during fetch are not lost.
    (async () => {
      try {
        const hist = await (pn as any).fetchMessages({
          channels: [channel],
          count: 50,
        });
        const items: any[] = hist?.channels?.[channel] ?? [];

        const loaded: ChatMessage[] = items.map((it: any) => {
          const m = it.message ?? {};
          return {
            id: m.id ?? String(it.timetoken),
            text: m.text ?? "",
            senderId: m.senderId ?? "unknown",
            senderName: m.senderName,
            createdAt: m.createdAt ?? nowMs(),
            timetoken: String(it.timetoken),
          };
        });

        // ✅ Dedupe-set fill from history too
        loaded.forEach((m) => idsRef.current.add(m.id));

        if (!cancelled) {
          // Merge history with current messages (don't overwrite — real-time may have arrived during fetch)
          setMessages((prev) => {
            const byId = new Map<string, ChatMessage>();
            [...prev, ...loaded].forEach((m) => byId.set(m.id, m));
            return [...byId.values()].sort((a, b) => a.createdAt - b.createdAt);
          });
        }
      } catch {
        if (!cancelled) {
          idsRef.current = new Set();
          setMessages([]);
        }
      }
    })();

    return () => {
      cancelled = true;
      pn.unsubscribe({ channels: [channel] });
      pn.removeListener(listener);
    };
  }, [pn, channel, peer?.id]);

  const send = async (text: string) => {
    if (!pn || !me || !channel) return;

    const trimmed = text.trim();
    if (!trimmed) return;

    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      text: trimmed,
      senderId: me.id,
      senderName: me.name,
      createdAt: nowMs(),
    };

    // ✅ add to dedupe BEFORE optimistic add,
    // so when PubNub echoes it back we ignore it.
    idsRef.current.add(msg.id);

    // Optimistic UI
    setMessages((prev) => [...prev, msg]);

    try {
      await (pn as any).publish({
        channel,
        message: msg,
        storeInHistory: true,
        customMessageType: "text",
      });
    } catch {
      // Optional: mark failed in UI.
      // For demo we keep it simple.
    }
  };

  const setTyping = async (on: boolean) => {
    if (!pn || !me || !channel) return;

    const payload = typingSignal(me.id, on);

    try {
      await (pn as any).signal({
        channel,
        message: payload,
        customMessageType: "typing",
      });
    } catch {
      // ignore
    }
  };

  return { messages, send, title, peerTyping, setTyping };
}
