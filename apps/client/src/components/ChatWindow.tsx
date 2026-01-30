import { useEffect, useMemo, useRef, useState } from "react";
import type { ChatMessage, DemoUser } from "../types";

export default function ChatWindow(props: {
  me: DemoUser;
  peer: DemoUser | null;
  title: string;
  messages: ChatMessage[];
  peerTyping: boolean;
  onSend: (text: string) => void;
  onTyping: (on: boolean) => void;
}) {
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);
  const lastTypingSentRef = useRef<number>(0);

  const canSend = useMemo(() => text.trim().length > 0 && !!props.peer, [text, props.peer]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [props.messages.length]);

  const sendNow = () => {
    if (!canSend) return;
    props.onSend(text);
    setText("");
    props.onTyping(false);
  };

  const onChange = (v: string) => {
    setText(v);

    // Very small typing debounce to keep signals low
    const now = Date.now();
    const shouldSend = now - lastTypingSentRef.current > 900;
    if (props.peer && shouldSend) {
      lastTypingSentRef.current = now;
      props.onTyping(v.trim().length > 0);
    }
    if (!v.trim()) props.onTyping(false);
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendNow();
    }
  };

  return (
    <div className="card chat">
      <div className="topbar">
        <div>
          <div style={{ fontWeight: 900 }}>{props.title}</div>
          <div className="small muted">
            {props.peer
              ? props.peerTyping
                ? `${props.peer.name} is typing…`
                : `Real-time DM channel`
              : "Pick a user from the left"}
          </div>
        </div>
        <div className="pill">
          <span className="dot good" />
          Live
        </div>
      </div>

      <div className="messages" ref={listRef}>
        {!props.peer ? (
          <div className="center" style={{ height: "100%" }}>
            <div className="muted">Select a user to start messaging.</div>
          </div>
        ) : props.messages.length === 0 ? (
          <div className="center" style={{ height: "100%" }}>
            <div className="muted">No messages yet. Say hi 👋</div>
          </div>
        ) : (
          props.messages.map((m) => (
            <div className="msgrow" key={m.id}>
              <div className={"msg" + (m.senderId === props.me.id ? " me" : "")}>
                <div className="t">{m.text}</div>
                <div className="meta">
                  <span>{m.senderId === props.me.id ? "You" : m.senderName || m.senderId}</span>
                  <span>•</span>
                  <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="inputbar">
        <input
          value={text}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={!props.peer}
          placeholder={props.peer ? "Type a message and press Enter…" : "Select a user to enable chat"}
        />
        <button onClick={sendNow} disabled={!canSend}>
          Send
        </button>
      </div>
    </div>
  );
}
