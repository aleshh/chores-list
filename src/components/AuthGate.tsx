"use client";
import React, { useEffect, useState } from "react";

async function checkAuth() {
  const res = await fetch("/api/login", { method: "GET" });
  return res.ok;
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { checkAuth().then(setAuthed).catch(() => setAuthed(false)); }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const resp = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pwd }) });
    if (resp.ok) setAuthed(true); else setError("Wrong password");
  }

  if (authed) return <>{children}</>;
  if (authed === null) return <div className="container">Loading…</div>;
  return (
    <div className="container" style={{ maxWidth: 520 }}>
      <h1 className="big">Welcome 👋</h1>
      <p className="muted">Enter the app password to continue.</p>
      <form onSubmit={onSubmit} style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input value={pwd} onChange={e => setPwd(e.target.value)} type="password" placeholder="Password"
               style={{ flex: 1, padding: 12, borderRadius: 12, border: 0 }} />
        <button className="btn" type="submit">Enter</button>
      </form>
      {error && <div style={{ marginTop: 8, color: "#fff" }}>{error}</div>}
    </div>
  );
}

