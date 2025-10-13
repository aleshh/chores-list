"use client";
import { useEffect, useMemo, useState } from "react";
import { data } from "@/lib/data";

async function parentAuthed() { return (await fetch("/api/parent-login")).ok; }

type Chore = { id: string; title: string; type: "daily" | "weekly"; child_id: string; active: boolean; position: number };
const KIDS = [
  { id: "astrid", name: "Astrid" },
  { id: "emilia", name: "Emilia" }
] as const;

export default function ParentPage() {
  const [ok, setOk] = useState<boolean | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { parentAuthed().then(setOk).catch(() => setOk(false)); }, []);

  async function submitPin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/parent-login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin }) });
    if (res.ok) setOk(true); else setError("Wrong PIN");
  }

  if (ok === null) return <div className="container">Loading…</div>;
  if (!ok) return (
    <div className="container" style={{ maxWidth: 420 }}>
      <h1 className="big">Parent Access</h1>
      <p className="muted">Enter the 4-digit PIN to edit chores.</p>
      <form onSubmit={submitPin} style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input value={pin} onChange={e=>setPin(e.target.value)} inputMode="numeric" pattern="[0-9]*" maxLength={4}
               style={{ flex: 1, padding: 12, borderRadius: 12, border: 0 }} />
        <button className="btn" type="submit">Enter</button>
      </form>
      {error && <div style={{ marginTop: 8, color: "#fff" }}>{error}</div>}
    </div>
  );
  return <Editor />;
}

function Editor() {
  const [chores, setChores] = useState<Chore[]>([]);
  const [trophy, setTrophy] = useState(0.95);
  const [apple, setApple] = useState(0.85);
  const [status, setStatus] = useState<string | null>(null);

  const byKid = useMemo(() => {
    const map: Record<string, { daily: Chore[]; weekly: Chore[] }> = {} as any;
    for (const k of KIDS) map[k.id] = { daily: [], weekly: [] };
    for (const c of chores) {
      (map as any)[c.child_id][c.type].push(c);
    }
    return map;
  }, [chores]);

  async function load() {
    const ch = await data.getActiveChores();
    setChores((ch ?? []) as any);
    const s = await data.getSettings();
    if (s) { setTrophy(s.trophy_threshold ?? 0.95); setApple(s.apple_threshold ?? 0.85); }
  }

  useEffect(() => { load(); }, []);

  async function add(kid: string, type: "daily" | "weekly") {
    const title = prompt("Chore title?");
    if (!title) return;
    const position = (chores.filter(c => c.child_id === kid && c.type === type).sort((a,b)=>a.position-b.position).at(-1)?.position ?? 0) + 1;
    try { await data.addChore({ title, type, child_id: kid, position }); }
    catch (e: any) { return setStatus(`Error: ${e?.message || e}`); }
    setStatus("Added");
    load();
  }

  async function edit(chore: Chore) {
    const title = prompt("New title", chore.title);
    if (!title) return;
    try { await data.updateChore(chore.id, { title }); }
    catch (e: any) { return setStatus(`Error: ${e?.message || e}`); }
    setStatus("Saved");
    load();
  }

  async function remove(chore: Chore) {
    if (!confirm("Remove chore?")) return;
    try { await data.softDeleteChore(chore.id); }
    catch (e: any) { return setStatus(`Error: ${e?.message || e}`); }
    setStatus("Removed");
    load();
  }

  async function saveThresholds() {
    try { await data.saveSettings({ trophy_threshold: trophy, apple_threshold: apple }); }
    catch (e: any) { return setStatus(`Error: ${e?.message || e}`); }
    setStatus("Thresholds saved");
  }

  return (
    <div className="container">
      <h1 className="big">Edit Chores</h1>
      <div className="row">
        {KIDS.map(k => (
          <div key={k.id} className="col">
            <div className="heading"><div className="big">{k.name}</div></div>
            <div style={{ marginTop: 10, fontWeight: 700 }}>Daily</div>
            {(byKid[k.id]?.daily ?? []).map(c => (
              <div key={c.id} className="item" style={{ gap: 8 }}>
                <span style={{ flex: 1 }}>{c.title}</span>
                <button className="btn" onClick={() => edit(c)}>Edit</button>
                <button className="btn secondary" onClick={() => remove(c)}>Remove</button>
              </div>
            ))}
            <button className="btn" style={{ marginTop: 8 }} onClick={() => add(k.id, "daily")}>+ Add daily</button>
            <div style={{ marginTop: 16, fontWeight: 700 }}>Weekly</div>
            {(byKid[k.id]?.weekly ?? []).map(c => (
              <div key={c.id} className="item" style={{ gap: 8 }}>
                <span style={{ flex: 1 }}>{c.title}</span>
                <button className="btn" onClick={() => edit(c)}>Edit</button>
                <button className="btn secondary" onClick={() => remove(c)}>Remove</button>
              </div>
            ))}
            <button className="btn" style={{ marginTop: 8 }} onClick={() => add(k.id, "weekly")}>+ Add weekly</button>
          </div>
        ))}
      </div>

      <div className="col" style={{ marginTop: 16 }}>
        <div className="heading"><div className="big">Emoji thresholds</div></div>
        <div className="row" style={{ gap: 8, marginTop: 8 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            🏆
            <input type="number" min={0} max={1} step={0.01} value={trophy} onChange={e=>setTrophy(Number(e.target.value))}
                   style={{ width: 120, padding: 8, borderRadius: 10, border: 0 }} />
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            🍎
            <input type="number" min={0} max={1} step={0.01} value={apple} onChange={e=>setApple(Number(e.target.value))}
                   style={{ width: 120, padding: 8, borderRadius: 10, border: 0 }} />
          </label>
          <button className="btn" onClick={saveThresholds}>Save</button>
        </div>
      </div>

      {status && <div style={{ marginTop: 10 }} className="muted">{status}</div>}
    </div>
  );
}
