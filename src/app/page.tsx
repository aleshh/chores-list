"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { data } from "@/lib/data";
import { CircularProgress } from "@/components/CircularProgress";
import { AuthGate } from "@/components/AuthGate";
import { Confetti } from "@/components/Confetti";
import { endOfToday, endOfWeek, startOfToday, startOfWeek, weekKey } from "@/lib/dates";
import { randomReward } from "@/lib/rewards";
import { Calendar, Settings, Circle, Check } from "lucide-react";
// Show version from package.json next to title
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import pkg from "../../package.json";
const APP_VERSION: string = (pkg as any).version || "";
import Sparkle from "react-sparkle";

type Chore = { id: string; title: string; type: "daily" | "weekly"; child_id: string; active: boolean; position: number };

const KIDS = [
  { id: "astrid", name: "Astrid" },
  { id: "emilia", name: "Emilia" }
] as const;

type DoneMap = Record<string, boolean>; // chore_id => done (for today)
type CheckRow = { id: string; chore_id: string; done_at: string };

function useChores() {
  const [chores, setChores] = useState<Chore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let isMounted = true;
    (async () => {
      setLoading(true);
      try {
        const list = await data.getActiveChores();
        if (!isMounted) return;
        setChores(list);
      } catch (e: any) {
        if (!isMounted) return;
        setError(e?.message || String(e));
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, []);
  return { chores, loading, error };
}

function useDoneMap(chores: Chore[]) {
  const [todayMap, setTodayMap] = useState<DoneMap>({});
  const [weekRows, setWeekRows] = useState<CheckRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const todayStart = startOfToday();
  const todayEnd = endOfToday();
  const weekStart = startOfWeek();
  const weekEnd = endOfWeek();
  useEffect(() => {
    (async () => {
      if (chores.length === 0) return;
      const choreIds = chores.map(c => c.id);
      try {
        const rows = await data.getCheckoffsForChores(choreIds, weekStart, weekEnd);
        const t: DoneMap = {};
        (rows || []).forEach((row: any) => {
          const d = new Date(row.done_at);
          const id = row.chore_id as string;
          if (d >= todayStart && d <= todayEnd) t[id] = true;
        });
        setTodayMap(t);
        setWeekRows(rows as any);
      } catch (e: any) { setError(e?.message || String(e)); }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chores.map(c => c.id).join(",")]);
  return { todayMap, setTodayMap, weekRows, setWeekRows, error };
}

export default function HomePage() {
  return (
    <AuthGate>
      <HomeContent />
    </AuthGate>
  );
}

function HomeContent() {
  const { chores, loading, error } = useChores();
  const { todayMap, setTodayMap, weekRows, setWeekRows } = useDoneMap(chores);
  const [writeError, setWriteError] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const confettiShownRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [recent, setRecent] = useState<Record<string, boolean>>({}); // key: choreId+type
  
  // Dynamic font sizing to fit content
  useEffect(() => {
    function fit() {
      const root = containerRef.current;
      if (!root) return;
      const nav = document.querySelector('nav') as HTMLElement | null;
      const navH = nav?.offsetHeight ?? 0;
      const margin = 40;
      let fs = 28; const min = 14;
      for (let i = 0; i < 40; i++) {
        root.style.setProperty('--task-fs', fs + 'px');
        const avail = window.innerHeight - navH - margin;
        const used = root.scrollHeight;
        if (used <= avail || fs <= min) break;
        fs -= 1;
      }
    }
    fit();
    const onResize = () => fit();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [chores]);

  const byKid = useMemo(() => {
    const map: Record<string, { daily: Chore[]; weekly: Chore[] }> = {};
    for (const kid of KIDS) map[kid.id] = { daily: [], weekly: [] };
    for (const c of chores) {
      if (!(c.child_id in map)) continue;
      if (c.type === "daily") map[c.child_id].daily.push(c);
      else map[c.child_id].weekly.push(c);
    }
    return map;
  }, [chores]);

  const summary = useMemo(() => {
    const now = new Date();
    const weekStartNow = startOfWeek(now);
    return KIDS.map(k => {
      const daily = byKid[k.id]?.daily ?? [];
      const weekly = byKid[k.id]?.weekly ?? [];
      const dayDone = daily.filter(c => todayMap[c.id]).length;
      const dayPct = daily.length === 0 ? 0 : dayDone / daily.length;
      const denom = daily.length * 7 + weekly.length * 2;
      const rowsKid = weekRows.filter(r => (byKid[k.id].daily.concat(byKid[k.id].weekly)).some(c => c.id === r.chore_id));
      let dailyNumer = 0;
      for (const c of daily) {
        const set = new Set<number>();
        for (const r of rowsKid) {
          if (r.chore_id !== c.id) continue;
          const d = new Date(r.done_at);
          if (d > now) continue;
          const dStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
          const idx = Math.floor((dStart.getTime() - new Date(weekStartNow.getFullYear(), weekStartNow.getMonth(), weekStartNow.getDate()).getTime()) / 86400000);
          if (idx >= 0 && idx < 7) set.add(idx);
        }
        dailyNumer += Math.min(7, set.size);
      }
      let weeklyNumer = 0;
      for (const c of weekly) {
        const any = rowsKid.some(r => r.chore_id === c.id && new Date(r.done_at) <= now);
        if (any) weeklyNumer += 2;
      }
      const weekPct = denom === 0 ? 0 : (dailyNumer + weeklyNumer) / denom;
      return { id: k.id, name: k.name, dayPct, weekPct };
    });
  }, [byKid, todayMap, weekRows]);

  useEffect(() => {
    const wk = weekKey(new Date());
    for (const s of summary) {
      if (s.weekPct >= 1) {
        const key = `confetti_week_${s.id}`;
        const last = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
        if (last !== wk && !confettiShownRef.current) {
          confettiShownRef.current = true;
          setShowConfetti(true);
          const t = setTimeout(() => setShowConfetti(false), 3000);
          if (typeof window !== 'undefined') localStorage.setItem(key, wk);
          return () => clearTimeout(t);
        }
      }
    }
  }, [summary]);

  // refresh week rows after mutations
  async function refreshWeekRows() {
    const ids = chores.map(c => c.id);
    if (ids.length === 0) return;
    try {
      const rows = await data.getCheckoffsForChores(ids, startOfWeek(), endOfWeek());
      setWeekRows(rows as any);
    } catch {}
  }

  async function toggle(chore: Chore, e: React.MouseEvent) {
    setWriteError(null);
    const now = new Date();
    const isDaily = chore.type === "daily";
    const from = isDaily ? startOfToday() : startOfWeek();
    const to = isDaily ? endOfToday() : endOfWeek();
    try {
      const existing = await data.findCheckoffInRange(chore.id, from, to);
      if (existing) {
      // undo
      await data.deleteCheckoff(existing.id);
      if (isDaily) setTodayMap(m => ({ ...m, [chore.id]: false }));
      await refreshWeekRows();
    } else {
      await data.insertCheckoff(chore.id, now);
      const reward = randomReward();
      if (isDaily) setTodayMap(m => ({ ...m, [chore.id]: true }));
      await refreshWeekRows();
      // store emoji for this completion
      try {
        const key = isDaily ? `emoji_day_${now.toISOString().slice(0,10)}_${chore.id}` : `emoji_week_${weekKey(now)}_${chore.id}`;
        localStorage.setItem(key, reward);
      } catch {}
      // show checkmark briefly then fade to emoji
      const recentKey = `${chore.id}_${isDaily?"d":"w"}`;
      setRecent(r => ({ ...r, [recentKey]: true }));
      setTimeout(() => setRecent(r => ({ ...r, [recentKey]: false })), 1600);
    }
    } catch (e: any) { setWriteError(e?.message || String(e)); }
  }

  if (loading) return <div className="container">Loading…</div>;
  if (error) return <div className="container">Error: {String(error)}</div>;

  return (
    <div className="container" ref={containerRef}>
      <div className="topbar">
        <a href="/" style={{ color: 'inherit', display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <h1 className="appTitle">Chores list</h1>
          {APP_VERSION && <span className="muted" style={{ fontSize: 14 }}>v{APP_VERSION}</span>}
        </a>
        <div className="actions">
          <a className="iconBtn" href="/progress" title="Weekly status" aria-label="Weekly status"><Calendar color="#fff" size={22} /></a>
          <a className="iconBtn" href="/parent" title="Parent settings" aria-label="Parent settings"><Settings color="#fff" size={22} /></a>
        </div>
      </div>
      <div className="row" style={{ position: "relative" }}>
        {KIDS.map(k => {
          const kidChores = byKid[k.id];
          const sum = summary.find(s => s.id === k.id)!;
          const weeklyDone = sum.weekPct >= 1;
          return (
            <div key={k.id} className="col">
              <div className="heading">
                <div className="big kidName">{k.name}</div>
                <div className="progressWrap">
                  <CircularProgress size={84} value={sum.dayPct} />
                  {weeklyDone ? (
                    <div style={{ fontSize: 42 }} title="Weekly complete!">🏆</div>
                  ) : (
                    <CircularProgress size={84} value={sum.weekPct} />
                  )}
                </div>
              </div>

              <div style={{ marginTop: 8 }}>Daily</div>
              <div className="list">
                {kidChores.daily.map(c => {
                  const done = !!todayMap[c.id];
                  const rkey = `${c.id}_d`;
                  let emoji: string | null = null;
                  if (done) {
                    if (!recent[rkey]) {
                      const k = `emoji_day_${new Date().toISOString().slice(0,10)}_${c.id}`;
                      emoji = (typeof window !== 'undefined' ? localStorage.getItem(k) : null);
                    }
                  }
                  return (
                    <button key={c.id} className={`item btn secondary ${done ? "done" : ""} ${recent[rkey] ? 'striking' : ''}`} onClick={(e) => toggle(c, e)}>
                      <span className={`leftIcon ${emoji ? 'reward':''}`}>
                        {done ? (recent[rkey] ? <Check color="#fff" size={22} /> : (emoji || "✔︎")) : <Circle color="#fff" size={22} />}
                      </span>
                      <span className="taskText textWrap">
                        {c.title}
                      </span>
                      {recent[rkey] && (
                        <span className="sparkle-sweep" aria-hidden>
                          <span className="sparkle-band">
                            <Sparkle color={["#fff", "#fff", "#FFEB3B", "#FFE082"]} count={45} minSize={6} maxSize={14} overflowPx={14} fadeOutSpeed={18} newSparkleOnFadeOut flicker flickerSpeed="fastest" />
                          </span>
                          <span className="sparkle-band delay1">
                            <Sparkle color={["#fff", "#fff", "#FFEB3B", "#FFE082"]} count={45} minSize={6} maxSize={14} overflowPx={14} fadeOutSpeed={18} newSparkleOnFadeOut flicker flickerSpeed="fastest" />
                          </span>
                          <span className="sparkle-band delay2">
                            <Sparkle color={["#fff", "#fff", "#FFEB3B", "#FFE082"]} count={40} minSize={6} maxSize={14} overflowPx={14} fadeOutSpeed={18} newSparkleOnFadeOut flicker flickerSpeed="fastest" />
                          </span>
                          <span className="sparkle-band delay3">
                            <Sparkle color={["#fff", "#fff", "#FFEB3B", "#FFE082"]} count={36} minSize={6} maxSize={14} overflowPx={14} fadeOutSpeed={40} newSparkleOnFadeOut flicker flickerSpeed="fastest" />
                          </span>
                        </span>
                      )}
                    </button>
                  );
                })}
                {kidChores.daily.length === 0 && <div className="muted">No daily chores yet</div>}
              </div>

              <div style={{ marginTop: 14 }}>Weekly</div>
              <div className="list">
                {kidChores.weekly.map(c => {
                  const done = weekRows.some(r=>r.chore_id===c.id);
                  const rkey = `${c.id}_w`;
                  let emoji: string | null = null;
                  if (done) {
                    if (!recent[rkey]) {
                      const k = `emoji_week_${weekKey(new Date())}_${c.id}`;
                      emoji = (typeof window !== 'undefined' ? localStorage.getItem(k) : null);
                    }
                  }
                  return (
                    <button key={c.id} className={`item btn secondary ${done ? "done" : ""} ${recent[rkey] ? 'striking' : ''}`} onClick={(e) => toggle(c, e)}>
                      <span className={`leftIcon ${emoji ? 'reward':''}`}>
                        {done ? (recent[rkey] ? <Check color="#fff" size={22} /> : (emoji || "✔︎")) : <Circle color="#fff" size={22} />}
                      </span>
                      <span className="taskText textWrap">
                        {c.title}
                      </span>
                      {recent[rkey] && (
                        <span className="sparkle-sweep" aria-hidden>
                          <span className="sparkle-band">
                            <Sparkle color={["#fff", "#fff", "#FFEB3B", "#FFE082"]} count={45} minSize={6} maxSize={14} overflowPx={14} fadeOutSpeed={18} newSparkleOnFadeOut flicker flickerSpeed="fastest" />
                          </span>
                          <span className="sparkle-band delay1">
                            <Sparkle color={["#fff", "#fff", "#FFEB3B", "#FFE082"]} count={45} minSize={6} maxSize={14} overflowPx={14} fadeOutSpeed={18} newSparkleOnFadeOut flicker flickerSpeed="fastest" />
                          </span>
                          <span className="sparkle-band delay2">
                            <Sparkle color={["#fff", "#fff", "#FFEB3B", "#FFE082"]} count={40} minSize={6} maxSize={14} overflowPx={14} fadeOutSpeed={18} newSparkleOnFadeOut flicker flickerSpeed="fastest" />
                          </span>
                          <span className="sparkle-band delay3">
                            <Sparkle color={["#fff", "#fff", "#FFEB3B", "#FFE082"]} count={36} minSize={6} maxSize={14} overflowPx={14} fadeOutSpeed={40} newSparkleOnFadeOut flicker flickerSpeed="fastest" />
                          </span>
                        </span>
                      )}
                    </button>
                  );
                })}
                {kidChores.weekly.length === 0 && <div className="muted">No weekly chores yet</div>}
              </div>
            </div>
          );
        })}
        <Confetti show={showConfetti} />
      </div>
      {writeError && <div style={{ marginTop: 12, color: "#fff" }}>Couldn’t save: {writeError}</div>}
    </div>
  );
}
