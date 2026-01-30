import { useEffect, useMemo, useRef, useState } from "react";
import type PubNub from "pubnub";

export type ConnectionState = "connecting" | "connected" | "disconnected";

export function usePresence(pn: PubNub | null, presenceChannel: string) {
  const [online, setOnline] = useState<Set<string>>(new Set());
  const [conn, setConn] = useState<ConnectionState>("connecting");
  const onlineRef = useRef<Set<string>>(new Set());

  // keep a stable Set instance for renders
  const onlineList = useMemo(() => Array.from(online).sort(), [online]);

  useEffect(() => {
    if (!pn || !presenceChannel) return;

    const listener = {
      status: (s: any) => {
        // Common categories: PNConnectedCategory, PNNetworkDownCategory, PNReconnectedCategory, etc.
        if (
          s.category === "PNConnectedCategory" ||
          s.category === "PNReconnectedCategory"
        ) {
          setConn("connected");
        } else if (s.category === "PNNetworkDownCategory") {
          setConn("disconnected");
        }
      },
      presence: (e: any) => {
        if (e.channel !== presenceChannel) return;
        const next = new Set(onlineRef.current);

        if (e.action === "join" || e.action === "state-change")
          next.add(e.uuid);
        if (e.action === "leave" || e.action === "timeout") next.delete(e.uuid);

        onlineRef.current = next;
        setOnline(next);
      },
    };

    pn.addListener(listener);

    // Subscribe to presence channel WITH presence events.
    pn.subscribe({ channels: [presenceChannel], withPresence: true });

    // Initial online snapshot
    (async () => {
      try {
        const here = await (pn as any).hereNow({
          channels: [presenceChannel],
          includeUUIDs: true,
        });
        const uuids: string[] =
          here?.channels?.[presenceChannel]?.occupants?.map(
            (o: any) => o.uuid,
          ) ?? [];
        const next = new Set(uuids);
        onlineRef.current = next;
        setOnline(next);
      } catch {
        // If Presence isn't enabled, this will fail; the UI will still work but show unknown presence.
      }
    })();

    return () => {
      pn.unsubscribe({ channels: [presenceChannel] });
      pn.removeListener(listener);
    };
  }, [pn, presenceChannel]);

  return { onlineSet: online, onlineList, connectionState: conn };
}
