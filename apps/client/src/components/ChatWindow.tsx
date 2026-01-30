import { useEffect, useMemo, useRef, useState } from "react";
import type { ChatMessage, DemoUser } from "../types";

function getInitials(name: string, fallbackId: string): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  return fallbackId.slice(0, 2).toUpperCase();
}

function formatDateKey(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Today";
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

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

  // Build list with date separators
  const messageBlocks = useMemo(() => {
    const out: { type: "date"; key: string; label: string } | { type: "msg"; msg: ChatMessage }[] = [];
    let lastDateKey = "";
    for (const m of props.messages) {
      const dateKey = formatDateKey(m.createdAt);
      if (dateKey !== lastDateKey) {
        lastDateKey = dateKey;
        out.push({ type: "date", key: `date-${dateKey}-${m.createdAt}`, label: dateKey });
      }
      out.push({ type: "msg", msg: m });
    }
    return out;
  }, [props.messages]);

  return (
    <div className="card chat">
      <div className="topbar">
        <div>
          <div className="h1" style={{ fontSize: 18, marginBottom: 2 }}>
            {props.title}
          </div>
          <div className="small muted">
            {props.peer
              ? props.peerTyping
                ? `${props.peer.name} is typing…`
                : "Real-time DM"
              : "Pick a user to start"}
          </div>
        </div>
        <div className="pill">
          <span className="dot good" />
          Live
        </div>
      </div>

      <div className="messages" ref={listRef}>
        {!props.peer ? (
          <div className="empty-state">
            <div className="empty-icon">💬</div>
            <div className="empty-title">Select a conversation</div>
            <div className="empty-desc">Choose a user from the list to start messaging.</div>
          </div>
        ) : props.messages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👋</div>
            <div className="empty-title">No messages yet</div>
            <div className="empty-desc">Say hi and start the conversation!</div>
          </div>
        ) : (
          <>
            {props.peerTyping && (
              <div className="msg-row">
                <div className="msg-avatar">{getInitials(props.peer.name, props.peer.id)}</div>
                <div className="typing-indicator">
                  <div className="typing-dots">
                    <span />
                    <span />
                    <span />
                  </div>
                  <span>{props.peer.name} is typing</span>
                </div>
              </div>
            )}
            {messageBlocks.map((block) =>
              block.type === "date" ? (
                <div key={block.key} className="date-sep">
                  <span>{block.label}</span>
                </div>
              ) : (
                <div
                  key={block.msg.id}
                  className={"msg-row" + (block.msg.senderId === props.me.id ? " me" : "")}
                >
                  <div className="msg-avatar">
                    {block.msg.senderId === props.me.id
                      ? getInitials(props.me.name, props.me.id)
                      : getInitials(block.msg.senderName ?? "", block.msg.senderId)}
                  </div>
                  <div className="msg-bubble">
                    <div className="msg-text">{block.msg.text}</div>
                    <div className="msg-meta">
                      <span className="sender">
                        {block.msg.senderId === props.me.id ? "You" : block.msg.senderName || block.msg.senderId}
                      </span>
                      <span>
                        {new Date(block.msg.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              )
            )}
          </>
        )}
      </div>

      <div className="inputbar">
        <input
          value={text}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={!props.peer}
          placeholder={props.peer ? "Type a message…" : "Select a user to enable chat"}
        />
        <button onClick={sendNow} disabled={!canSend}>
          Send
        </button>
      </div>
    </div>
  );
}
