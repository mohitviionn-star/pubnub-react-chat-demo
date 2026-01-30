import type { DemoUser } from "../types";

function getInitials(name: string, id: string): string {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  return id.slice(0, 2).toUpperCase();
}

export default function UserList(props: {
  users: DemoUser[];
  meId: string;
  onlineSet: Set<string>;
  activeId: string | null;
  onSelect: (u: DemoUser) => void;
}) {
  const { users, meId, onlineSet, activeId } = props;
  const others = users.filter((u) => u.id !== meId);

  return (
    <div className="card sidebar">
      <div className="topbar">
        <div>
          <div className="h1" style={{ fontSize: 18, marginBottom: 2 }}>Users</div>
          <div className="small muted">Click to start chat</div>
        </div>
        <div className="pill">{others.length} available</div>
      </div>
      <div className="body">
        {others.map((u) => {
          const online = onlineSet.has(u.id);
          return (
            <div
              key={u.id}
              className={"user" + (activeId === u.id ? " active" : "")}
              onClick={() => props.onSelect(u)}
              onKeyDown={(e) => e.key === "Enter" && props.onSelect(u)}
              role="button"
              tabIndex={0}
            >
              <div className="user-avatar">{getInitials(u.name, u.id)}</div>
              <div className="meta">
                <div className="name">{u.name}</div>
                <div className="sub">{u.id}</div>
              </div>
              <span className="pill">
                <span className={"dot " + (online ? "good" : "bad")} />
                {online ? "Online" : "Offline"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
