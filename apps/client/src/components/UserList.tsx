import type { DemoUser } from "../types";

export default function UserList(props: {
  users: DemoUser[];
  meId: string;
  onlineSet: Set<string>;
  activeId: string | null;
  onSelect: (u: DemoUser) => void;
}) {
  const { users, meId, onlineSet, activeId } = props;

  return (
    <div className="card sidebar">
      <div className="topbar">
        <div>
          <div style={{ fontWeight: 800 }}>Users</div>
          <div className="small muted">Click to start chat</div>
        </div>
        <div className="pill">{users.length - 1} available</div>
      </div>
      <div className="body">
        {users
          .filter((u) => u.id !== meId)
          .map((u) => {
            const online = onlineSet.has(u.id);
            return (
              <div
                key={u.id}
                className={"user" + (activeId === u.id ? " active" : "")}
                onClick={() => props.onSelect(u)}
                role="button"
                tabIndex={0}
              >
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
