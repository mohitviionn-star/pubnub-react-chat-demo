import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import type { DemoUser, LoginResponse } from "../types";

export default function Login(props: {
  onLoggedIn: (resp: LoginResponse) => void;
}) {
  const [users, setUsers] = useState<DemoUser[]>([]);
  const [selected, setSelected] = useState<string>("alice");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    api.get("/users")
      .then((r) => setUsers(r.data.users))
      .catch(() => setErr("Failed to load users from server"));
  }, []);

  const selectedUser = useMemo(
    () => users.find((u) => u.id === selected) || null,
    [users, selected]
  );

  const login = async () => {
    setErr("");
    setLoading(true);
    try {
      const r = await api.post<LoginResponse>("/auth/login", { userId: selected });
      props.onLoggedIn(r.data);
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="card" style={{ padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center" }}>
          <div>
            <p className="h1">PubNub Chat Demo</p>
            <p className="muted" style={{ margin: "6px 0 0" }}>
              Choose a demo user and open the app in <b>two browser tabs</b> to chat in real time.
            </p>
          </div>
          <div className="badge">
            <span className="dot bad" />
            <span className="small">Not connected</span>
          </div>
        </div>

        <div className="hr" />

        <div className="row" style={{ alignItems: "end" }}>
          <div className="col" style={{ flex: 1 }}>
            <label className="small muted">Demo user</label>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 12px",
                borderRadius: 12,
                border: "1px solid var(--border)",
                background: "rgba(255,255,255,.04)",
                color: "var(--text)",
                outline: "none",
              }}
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.id})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={login}
            disabled={!selectedUser || loading}
            style={{
              padding: "12px 16px",
              borderRadius: 12,
              border: "1px solid rgba(110,231,255,.35)",
              background: "linear-gradient(90deg, rgba(110,231,255,.30), rgba(168,85,247,.24))",
              color: "var(--text)",
              cursor: loading ? "wait" : "pointer",
            }}
          >
            {loading ? "Signing in…" : "Enter"}
          </button>
        </div>

        {err ? <p style={{ color: "var(--bad)", marginTop: 12 }}>{err}</p> : null}

        <p className="muted small" style={{ marginTop: 14 }}>
          Tip: run server on <code>5050</code> and client on <code>5173</code>.
        </p>
      </div>
    </div>
  );
}
