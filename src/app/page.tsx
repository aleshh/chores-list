"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { data } from "@/lib/data";
import { CircularProgress } from "@/components/CircularProgress";
import { AuthGate } from "@/components/AuthGate";
import { Confetti } from "@/components/Confetti";
import { Sparkle } from "@/components/Sparkle";
import { endOfToday, endOfWeek, startOfToday, startOfWeek } from "@/lib/dates";
import { randomReward } from "@/lib/rewards";

type Chore = { id: string; title: string; type: "daily" | "weekly"; child_id: string; active: boolean; position: number };

const KIDS = [
  { id: "astrid", name: "Astrid" },
  { id: "emilia", name: "Emilia" }
] as const;

type DoneMap = Record<string, boolean>; // chore_id => done (for today or week)

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
  const [weekMap, setWeekMap] = useState<DoneMap>({});
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
      const w: DoneMap = {};
      (rows || []).forEach((row: any) => {
        const d = new Date(row.done_at);
        const id = row.chore_id as string;
        if (d >= todayStart && d <= todayEnd) t[id] = true;
        w[id] = true;
      });
      setTodayMap(t);
      setWeekMap(w);
      } catch (e: any) { setError(e?.message || String(e)); }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chores.map(c => c.id).join(",")]);
  return { todayMap, setTodayMap, weekMap, setWeekMap, error };
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
  const { todayMap, setTodayMap, weekMap, setWeekMap } = useDoneMap(chores);
  const [writeError, setWriteError] = useState<string | null>(null);
  const [sparkles, setSparkles] = useState<{ id: string; x: number; y: number; emoji: string }[]>([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const confettiShownRef = useRef(false);

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
    return KIDS.map(k => {
      const daily = byKid[k.id]?.daily ?? [];
      const weekly = byKid[k.id]?.weekly ?? [];
      const dayDone = daily.filter(c => todayMap[c.id]).length;
      const weekDoneDaily = daily.filter(c => weekMap[c.id]).length; // any day this week
      const weekDoneWeekly = weekly.filter(c => weekMap[c.id]).length; // once this week
      const dayPct = daily.length === 0 ? 0 : dayDone / daily.length;
      const denom = daily.length * 7 + weekly.length * 2;
      const numer = weekDoneDaily + weekDoneWeekly * 2;
      const weekPct = denom === 0 ? 0 : numer / denom;
      return { id: k.id, name: k.name, dayPct, weekPct };
    });
  }, [byKid, todayMap, weekMap]);

  useEffect(() => {
    // Fire confetti if anyone hits 100% weekly
    const anyDone = summary.some(s => s.weekPct >= 1);
    if (anyDone && !confettiShownRef.current) {
      confettiShownRef.current = true;
      setShowConfetti(true);
      const t = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(t);
    }
  }, [summary]);

  async function toggle(chore: Chore, e: React.MouseEvent) {
    setWriteError(null);
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
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
      setWeekMap(m => ({ ...m, [chore.id]: false }));
    } else {
      await data.insertCheckoff(chore.id, now);
      const reward = randomReward();
      setSparkles(s => [...s, { id: `${Date.now()}-${Math.random()}`, x, y, emoji: reward }]);
      if (isDaily) setTodayMap(m => ({ ...m, [chore.id]: true }));
      setWeekMap(m => ({ ...m, [chore.id]: true }));
    }
    } catch (e: any) { setWriteError(e?.message || String(e)); }
  }

  if (loading) return <div className="container">Loading…</div>;
  if (error) return <div className="container">Error: {String(error)}</div>;

  return (
    <div className="container">
      <div className="row" style={{ position: "relative" }}>
        {KIDS.map(k => {
          const kidChores = byKid[k.id];
          const sum = summary.find(s => s.id === k.id)!;
          const weeklyDone = sum.weekPct >= 1;
          return (
            <div key={k.id} className="col">
              <div className="heading">
                <div className="big">{k.name}</div>
                <div className="progressWrap">
                  <CircularProgress size={84} value={sum.dayPct} />
                  {weeklyDone ? (
                    <div style={{ fontSize: 42 }} title="Weekly complete!">🏆</div>
                  ) : (
                    <CircularProgress size={84} value={sum.weekPct} />
                  )}
                </div>
              </div>

              <div style={{ marginTop: 8, fontWeight: 700 }}>Daily</div>
              <div className="list">
                {kidChores.daily.map(c => (
                  <button key={c.id} className={`item btn secondary ${todayMap[c.id] ? "done" : ""}`} onClick={(e) => toggle(c, e)}>
                    <span>{c.title}</span>
                    <span>{todayMap[c.id] ? "✔︎" : "○"}</span>
                  </button>
                ))}
                {kidChores.daily.length === 0 && <div className="muted">No daily chores yet</div>}
              </div>

              <div style={{ marginTop: 14, fontWeight: 700 }}>Weekly</div>
              <div className="list">
                {kidChores.weekly.map(c => (
                  <button key={c.id} className={`item btn secondary ${weekMap[c.id] ? "done" : ""}`} onClick={(e) => toggle(c, e)}>
                    <span>{c.title}</span>
                    <span>{weekMap[c.id] ? "✔︎" : "○"}</span>
                  </button>
                ))}
                {kidChores.weekly.length === 0 && <div className="muted">No weekly chores yet</div>}
              </div>
            </div>
          );
        })}
        {sparkles.map(s => (
          <Sparkle key={s.id} x={s.x} y={s.y} emoji={s.emoji} />
        ))}
        <Confetti show={showConfetti} />
      </div>
      {writeError && <div style={{ marginTop: 12, color: "#fff" }}>Couldn’t save: {writeError}</div>}
    </div>
  );
}
