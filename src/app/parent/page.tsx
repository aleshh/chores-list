"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { data } from "@/lib/data";
import { X } from "lucide-react";

// Always require PIN entry per visit

type Chore = { id: string; title: string; type: "daily" | "weekly"; child_id: string; active: boolean; position: number };
const KIDS = [
  { id: "astrid", name: "Astrid" },
  { id: "emilia", name: "Emilia" }
] as const;

export default function ParentPage() {
  const [ok, setOk] = useState<boolean>(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submitPinValue(value: string) {
    if (value.length !== 4 || submitting) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/parent-login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin: value }) });
    if (res.ok) {
      setOk(true);
    } else if (res.status === 429) {
      const msg = await res.text();
      setError(msg || "Locked. Try again later.");
      // Briefly show lock message, then return to Home
      setTimeout(() => { window.location.href = "/"; }, 1500);
    } else {
      // Wrong PIN: go back to Home immediately
      window.location.href = "/";
    }
    setSubmitting(false);
  }

  async function submitPin(e: React.FormEvent) {
    e.preventDefault();
    await submitPinValue(pin);
  }

  useEffect(() => {
    if (!ok) {
      const t = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [ok]);

  if (!ok) return (
    <div className="container" style={{ maxWidth: 520 }}>
      <div className="topbar">
        <a href="/" style={{ color: 'inherit' }}><h1 className="appTitle">Chores list</h1></a>
        <div className="actions">
          <a className="iconBtn" href="/" title="Close" aria-label="Close"><X color="#fff" size={22} /></a>
        </div>
      </div>
      <h2 className="big">Parent Access</h2>
      <p className="muted">Enter the 4-digit PIN to edit chores.</p>
      <form onSubmit={submitPin} style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input
          ref={inputRef}
          autoFocus
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="one-time-code"
          value={pin}
          onChange={(e)=>{
            const v = e.target.value.replace(/\D/g, '').slice(0,4);
            setPin(v);
            setError(null);
            if (v.length === 4) submitPinValue(v);
          }}
          maxLength={4}
          style={{ flex: 1, padding: 12, borderRadius: 12, border: 0 }}
        />
        <button className="btn" type="submit" disabled={submitting}>Enter</button>
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
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const byKid = useMemo(() => {
    const map: Record<string, { daily: Chore[]; weekly: Chore[] }> = {} as any;
    for (const k of KIDS) map[k.id] = { daily: [], weekly: [] };
    for (const c of chores) {
      (map as any)[c.child_id][c.type].push(c);
    }
    // ensure lists display sorted by position
    for (const k of KIDS) {
      map[k.id].daily.sort((a,b)=>a.position-b.position);
      map[k.id].weekly.sort((a,b)=>a.position-b.position);
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

  function reorderLocal(kid: string, type: "daily"|"weekly", sourceId: string, targetId: string) {
    const list = chores.filter(c => c.child_id === kid && c.type === type).sort((a,b)=>a.position-b.position);
    const srcIndex = list.findIndex(c => c.id === sourceId);
    const tgtIndex = list.findIndex(c => c.id === targetId);
    if (srcIndex < 0 || tgtIndex < 0) return list;
    const [moved] = list.splice(srcIndex, 1);
    list.splice(tgtIndex, 0, moved);
    // reassign positions starting at 1
    const updates = list.map((c, idx) => ({ ...c, position: idx + 1 }));
    // reflect in state
    setChores(prev => {
      // update positions for affected group
      const replaced = prev.map(c => c.child_id===kid && c.type===type ? (updates.find(u=>u.id===c.id) || c) : c);
      // also keep array order aligned with positions so UI reflects immediately
      const others = replaced.filter(c => !(c.child_id===kid && c.type===type));
      const group = replaced.filter(c => c.child_id===kid && c.type===type).sort((a,b)=>a.position-b.position);
      return [...others, ...group];
    });
    // persist sequentially
    (async () => {
      for (const u of updates) {
        try { await data.updateChore(u.id, { position: u.position }); } catch {}
      }
      setStatus("Order saved");
    })();
    return updates;
  }

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
      <div className="topbar">
        <a href="/" style={{ color: 'inherit' }}><h1 className="appTitle">Chores list</h1></a>
        <div className="actions">
          <a className="iconBtn" href="/" title="Close" aria-label="Close"><X color="#fff" size={22} /></a>
        </div>
      </div>
      <h2 className="big">Edit Chores</h2>
      <div className="row">
        {KIDS.map(k => (
          <div key={k.id} className="col">
            <div className="heading"><div className="big kidName">{k.name}</div></div>
            <div style={{ marginTop: 10 }}>Daily</div>
            <div className="list">
              {(byKid[k.id]?.daily ?? []).map(c => (
                <div key={c.id}
                     className={`item ${dragOverId===c.id? 'dragOver':''}`} style={{ gap: 8, cursor: 'grab' }}
                     draggable
                     onDragStart={() => setDragId(c.id)}
                     onDragOver={(e) => { e.preventDefault(); if (dragOverId!==c.id) setDragOverId(c.id); }}
                     onDragLeave={() => setDragOverId(null)}
                     onDragEnd={() => { setDragId(null); setDragOverId(null); }}
                     onDrop={() => { if (dragId && dragId!==c.id) reorderLocal(k.id, 'daily', dragId, c.id); setDragId(null); setDragOverId(null); }}>
                  <span style={{ flex: 1 }}>{c.title}</span>
                  <button className="btn" onClick={() => edit(c)}>Edit</button>
                  <button className="btn secondary" onClick={() => remove(c)}>Remove</button>
                </div>
              ))}
            </div>
            <button className="btn" style={{ marginTop: 8 }} onClick={() => add(k.id, "daily")}>+ Add daily</button>
            <div style={{ marginTop: 16 }}>Weekly</div>
            <div className="list">
              {(byKid[k.id]?.weekly ?? []).map(c => (
                <div key={c.id}
                     className={`item ${dragOverId===c.id? 'dragOver':''}`} style={{ gap: 8, cursor: 'grab' }}
                     draggable
                     onDragStart={() => setDragId(c.id)}
                     onDragOver={(e) => { e.preventDefault(); if (dragOverId!==c.id) setDragOverId(c.id); }}
                     onDragLeave={() => setDragOverId(null)}
                     onDragEnd={() => { setDragId(null); setDragOverId(null); }}
                     onDrop={() => { if (dragId && dragId!==c.id) reorderLocal(k.id, 'weekly', dragId, c.id); setDragId(null); setDragOverId(null); }}>
                  <span style={{ flex: 1 }}>{c.title}</span>
                  <button className="btn" onClick={() => edit(c)}>Edit</button>
                  <button className="btn secondary" onClick={() => remove(c)}>Remove</button>
                </div>
              ))}
            </div>
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
