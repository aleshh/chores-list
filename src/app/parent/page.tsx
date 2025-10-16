"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { data } from "@/lib/data";
import { X } from "lucide-react";
import Sortable from "sortablejs";

// Always require PIN entry per visit

type Chore = { id: string; title: string; type: "daily" | "weekly"; child_id: string; active: boolean; position: number; day_part?: 'morning'|'evening'|null };
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

  // Removed programmatic focus to avoid iPad keyboard issues

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
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="one-time-code"
          enterKeyHint="done"
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
  const listsRef = useRef<Record<string, HTMLElement | null>>({});
  const sortables = useRef<Record<string, Sortable | null>>({});

  const byKid = useMemo(() => {
    const map: Record<string, { daily: Chore[]; weekly: Chore[]; morning: Chore[]; evening: Chore[]; unspecified: Chore[] }> = {} as any;
    for (const k of KIDS) map[k.id] = { daily: [], weekly: [], morning: [], evening: [], unspecified: [] } as any;
    for (const c of chores) {
      const bucket = map[c.child_id];
      if (!bucket) continue;
      if (c.type === 'daily') {
        bucket.daily.push(c);
        const part = (c.day_part as any) || 'unspecified';
        (bucket as any)[part].push(c);
      } else {
        bucket.weekly.push(c);
      }
    }
    for (const k of KIDS) {
      const b = map[k.id];
      b.daily.sort((a,b)=>a.position-b.position);
      b.weekly.sort((a,b)=>a.position-b.position);
      b.morning.sort((a,b)=>a.position-b.position);
      b.evening.sort((a,b)=>a.position-b.position);
      b.unspecified.sort((a,b)=>a.position-b.position);
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

  function applyNewOrder(kid: string, type: "daily"|"weekly", orderedIds: string[]) {
    const list = chores.filter(c => c.child_id === kid && c.type === type).sort((a,b)=>a.position-b.position);
    const idToChore = new Map(list.map(c => [c.id, c] as const));
    const newList = orderedIds.map((id, idx) => ({ ...(idToChore.get(id) as any), position: idx + 1 }));
    setChores(prev => prev.map(c => (c.child_id===kid && c.type===type) ? (newList.find(n=>n.id===c.id) || c) : c));
    (async () => {
      for (const u of newList) {
        try { await data.updateChore(u.id, { position: u.position }); } catch {}
      }
      setStatus("Order saved");
    })();
  }

  async function applyNewDailyOrder(kid: string, morningIds: string[], eveningIds: string[], unspecifiedIds: string[]) {
    // assign positions within each part starting at 1
    const updates: { id: string; position: number; day_part: 'morning'|'evening'|null }[] = [];
    morningIds.forEach((id, idx) => updates.push({ id, position: idx + 1, day_part: 'morning' }));
    eveningIds.forEach((id, idx) => updates.push({ id, position: idx + 1, day_part: 'evening' }));
    unspecifiedIds.forEach((id, idx) => updates.push({ id, position: idx + 1, day_part: null }));
    setChores(prev => prev.map(c => {
      if (c.child_id!==kid || c.type!== 'daily') return c;
      const u = updates.find(x => x.id === c.id);
      return u ? { ...c, position: u.position, day_part: u.day_part } : c;
    }));
    for (const u of updates) {
      try { await data.updateChore(u.id, { position: u.position, day_part: u.day_part }); } catch {}
    }
    setStatus("Order saved");
  }

  useEffect(() => {
    // Initialize Sortable on each list container; supports touch (iPad) and mouse
    const keys = Object.keys(listsRef.current);
    for (const key of keys) {
      const el = listsRef.current[key];
      if (!el || sortables.current[key]) continue;
      const [kid, type] = key.split("::");
      const isDaily = type.startsWith('daily');
      sortables.current[key] = Sortable.create(el, {
        animation: 0,
        ghostClass: "dragOver",
        handle: undefined,
        draggable: ".item",
        forceFallback: true, // improve iOS Safari behavior
        fallbackOnBody: true,
        removeCloneOnHide: false,
        direction: 'vertical',
        fallbackTolerance: 3,
        group: isDaily ? { name: `${kid}-daily`, pull: true, put: true } : undefined,
        onEnd: (evt: any) => {
          const run = () => {
            if (isDaily) {
              // Capture intended lists before restoring DOM, so we keep the target placement
              const mEl = listsRef.current[`${kid}::daily_morning`];
              const eEl = listsRef.current[`${kid}::daily_evening`];
              const uEl = listsRef.current[`${kid}::daily_unspecified`];
              const morningIdsNow = mEl ? Array.from(mEl.children).map((ch: any) => ch?.dataset?.id).filter(Boolean) as string[] : [];
              const eveningIdsNow = eEl ? Array.from(eEl.children).map((ch: any) => ch?.dataset?.id).filter(Boolean) as string[] : [];
              const unspecifiedIdsNow = uEl ? Array.from(uEl.children).map((ch: any) => ch?.dataset?.id).filter(Boolean) as string[] : [];

              // Restore DOM to original to avoid React/Sorable conflict; React will own the move
              try {
                if (evt && evt.from && evt.to && evt.from !== evt.to && evt.item) {
                  const fromEl: HTMLElement = evt.from;
                  const itemEl: HTMLElement = evt.item;
                  fromEl.appendChild(itemEl);
                }
              } catch {}

              // Defer state update slightly (after Sortable cleanup)
              setTimeout(() => {
                applyNewDailyOrder(kid, morningIdsNow, eveningIdsNow, unspecifiedIdsNow);
              }, 0);
            } else {
              // Weekly: single list reorder
              const ids = Array.from(el.children).map((ch: any) => ch?.dataset?.id).filter(Boolean) as string[];
              setTimeout(() => applyNewOrder(kid, type as any, ids), 0);
            }
          };
          // Let Sortable finish its own cleanup first
          if (typeof window !== 'undefined' && window.requestAnimationFrame) {
            requestAnimationFrame(run);
          } else {
            setTimeout(run, 16);
          }
        }
      });
    }
    return () => {
      for (const key of Object.keys(sortables.current)) {
        sortables.current[key]?.destroy();
        sortables.current[key] = null;
      }
    };
  }, [byKid]);

  async function add(kid: string, type: "daily" | "weekly") {
    const title = prompt("Chore title?");
    if (!title) return;
    const position = (chores.filter(c => c.child_id === kid && c.type === type).sort((a,b)=>a.position-b.position).at(-1)?.position ?? 0) + 1;
    const payload: any = { title, type, child_id: kid, position };
    if (type === 'daily') payload.day_part = 'morning';
    try { await data.addChore(payload); }
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
            <div style={{ marginTop: 10 }}>Daily — Morning</div>
            <div className="list" ref={(el) => { listsRef.current[`${k.id}::daily_morning`] = el; }}>
              {(byKid[k.id]?.morning ?? []).map(c => (
                <div key={c.id} data-id={c.id}
                     className={`item`} style={{ gap: 8, cursor: 'grab' }}>
                  <span style={{ flex: 1 }}>{c.title}</span>
                  <button className="btn" onClick={() => edit(c)}>Edit</button>
                  <button className="btn secondary" onClick={() => remove(c)}>Remove</button>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 10 }}>Daily — Evening</div>
            <div className="list" ref={(el) => { listsRef.current[`${k.id}::daily_evening`] = el; }}>
              {(byKid[k.id]?.evening ?? []).map(c => (
                <div key={c.id} data-id={c.id}
                     className={`item`} style={{ gap: 8, cursor: 'grab' }}>
                  <span style={{ flex: 1 }}>{c.title}</span>
                  <button className="btn" onClick={() => edit(c)}>Edit</button>
                  <button className="btn secondary" onClick={() => remove(c)}>Remove</button>
                </div>
              ))}
            </div>
            {(byKid[k.id]?.unspecified?.length ?? 0) > 0 && (
              <>
                <div style={{ marginTop: 10 }}>Daily — Unspecified</div>
                <div className="list" ref={(el) => { listsRef.current[`${k.id}::daily_unspecified`] = el; }}>
                  {(byKid[k.id]?.unspecified ?? []).map(c => (
                    <div key={c.id} data-id={c.id}
                         className={`item`} style={{ gap: 8, cursor: 'grab' }}>
                      <span style={{ flex: 1 }}>{c.title}</span>
                      <button className="btn" onClick={() => edit(c)}>Edit</button>
                      <button className="btn secondary" onClick={() => remove(c)}>Remove</button>
                    </div>
                  ))}
                </div>
              </>
            )}
            <button className="btn" style={{ marginTop: 8 }} onClick={() => add(k.id, "daily")}>+ Add daily</button>
            <div style={{ marginTop: 16 }}>Weekly</div>
            <div className="list" ref={(el) => { listsRef.current[`${k.id}::weekly`] = el; }}>
              {(byKid[k.id]?.weekly ?? []).map(c => (
                <div key={c.id} data-id={c.id}
                     className={`item`} style={{ gap: 8, cursor: 'grab' }}>
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
