import { useEffect, useMemo, useState } from "react";
import PubNub from "pubnub";
import Login from "./components/Login";
import UserList from "./components/UserList";
import ChatWindow from "./components/ChatWindow";
import { api } from "./api";
import type { DemoUser, LoginResponse } from "./types";
import { createPubNubClient } from "./lib/pubnubClient";
import { dmChannel } from "./lib/channels";
import { usePresence } from "./hooks/usePresence";
import { useDmChat } from "./hooks/useDmChat";

type Session = {
  me: DemoUser;
  pubnub: LoginResponse["pubnub"];
};

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [users, setUsers] = useState<DemoUser[]>([]);
  const [peer, setPeer] = useState<DemoUser | null>(null);
  const [pn, setPn] = useState<PubNub | null>(null);
  const [err, setErr] = useState<string>("");

  // Load demo users
  useEffect(() => {
    api
      .get("/users")
      .then((r) => setUsers(r.data.users))
      .catch(() => setErr("Failed to load users"));
  }, []);

  // Create PubNub client when logged in
  useEffect(() => {
    if (!session) return;

    const client = createPubNubClient({
      publishKey: session.pubnub.publishKey,
      subscribeKey: session.pubnub.subscribeKey,
      userId: session.me.id,
      token: session.pubnub.token,
    });

    setPn(client);

    return () => {
      try {
        client.unsubscribeAll();
        client.stop?.();
      } catch {}
      setPn(null);
    };
  }, [session]);

  // ✅ IMPORTANT: Hooks must be called on EVERY render
  const me = session?.me ?? null;
  const presenceChannel = session?.pubnub.presenceChannel ?? "";

  const { onlineSet, connectionState } = usePresence(pn, presenceChannel);

  const channel = useMemo(() => {
    if (!me || !peer) return null;
    return dmChannel(me.id, peer.id);
  }, [me?.id, peer?.id]);

  const { messages, send, title, peerTyping, setTyping } = useDmChat({
    pn,
    me,
    peer,
    channel,
  });

  // ✅ Now it's safe to conditionally render UI
  if (!session) {
    return (
      <Login
        onLoggedIn={(resp: LoginResponse) => {
          setErr("");
          setPeer(null);
          setSession({ me: resp.user, pubnub: resp.pubnub });
        }}
      />
    );
  }

  return (
    <div className="container">
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="topbar">
          <div>
            <div className="h1" style={{ marginBottom: 2 }}>PubNub Chat Demo</div>
            <div className="small muted">
              Signed in as <b>{session.me.name}</b> ({session.me.id})
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div className="badge">
              <span
                className={
                  "dot " + (connectionState === "connected" ? "good" : "bad")
                }
              />
              <span className="small">
                {connectionState === "connected"
                  ? "Connected"
                  : connectionState === "connecting"
                    ? "Connecting"
                    : "Offline"}
              </span>
            </div>

            <button
              onClick={() => {
                setPeer(null);
                setSession(null);
              }}
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "rgba(255,255,255,.04)",
                color: "var(--text)",
                cursor: "pointer",
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      </div>

      {err ? (
        <div
          className="card"
          style={{
            padding: 14,
            borderColor: "rgba(251,113,133,.35)",
            marginBottom: 16,
          }}
        >
          <div style={{ color: "var(--bad)" }}>{err}</div>
        </div>
      ) : null}

      <div className="row">
        <UserList
          users={users}
          meId={session.me.id}
          onlineSet={onlineSet}
          activeId={peer?.id ?? null}
          onSelect={(u) => setPeer(u)}
        />

        <ChatWindow
          me={session.me}
          peer={peer}
          title={title}
          messages={messages}
          peerTyping={peerTyping}
          onSend={send}
          onTyping={setTyping}
        />
      </div>

      <p className="muted small" style={{ marginTop: 14 }}>
        Open in <b>two tabs</b> with two different users to test real-time chat.
      </p>
    </div>
  );
}
