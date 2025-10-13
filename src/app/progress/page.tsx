"use client";
import { useEffect, useMemo, useState } from "react";
import { data } from "@/lib/data";
import { AuthGate } from "@/components/AuthGate";
import { endOfWeek, startOfWeek, weekNumber } from "@/lib/dates";

type Chore = { id: string; type: "daily" | "weekly"; child_id: string; title: string };
const KIDS = [
  { id: "astrid", name: "Astrid" },
  { id: "emilia", name: "Emilia" }
] as const;

type WeekRow = { weekStart: Date; label: string; pctByKid: Record<string, number> };

export default function ProgressPage() {
  return (
    <AuthGate>
      <Content />
    </AuthGate>
  );
}

function Content() {
  const [chores, setChores] = useState<Chore[]>([]);
  const [rows, setRows] = useState<WeekRow[]>([]);
  const [trophy, setTrophy] = useState(0.95);
  const [apple, setApple] = useState(0.85);

  useEffect(() => {
    (async () => {
      const ch = await data.getActiveChores();
      setChores(ch as any);
      const s = await data.getSettings();
      if (s) { setTrophy(s.trophy_threshold ?? 0.95); setApple(s.apple_threshold ?? 0.85); }
      // last 8 weeks
      const end = endOfWeek(new Date());
      const weeks: WeekRow[] = [];
      for (let i = 1; i <= 8; i++) {
        const ws = new Date(startOfWeek(end));
        ws.setDate(ws.getDate() - i * 7);
        const label = `${ws.getMonth() + 1}/${ws.getDate()} (W${weekNumber(ws)})`;
        weeks.push({ weekStart: ws, label, pctByKid: {} as any });
      }
      const earliest = weeks[weeks.length - 1].weekStart;
      const allCheckoffs = await data.getCheckoffsInRange(earliest, end);
      setRows(() => {
        return weeks.map(w => {
          const start = startOfWeek(w.weekStart);
          const endW = endOfWeek(w.weekStart);
          const pctByKid: Record<string, number> = {} as any;
          for (const kid of KIDS) {
            const kidChores = ch.filter(c => c.child_id === kid.id);
            const daily = kidChores.filter(c => c.type === "daily");
            const weekly = kidChores.filter(c => c.type === "weekly");
            const denom = daily.length * 7 + weekly.length * 2;
            const weekRows = (allCheckoffs ?? []).filter((r: any) => {
              const d = new Date(r.done_at);
              return d >= start && d <= endW;
            });
            const weekDaily = new Set<string>();
            const weekWeekly = new Set<string>();
            for (const r of weekRows) {
              const chore = kidChores.find(c => c.id === r.chore_id);
              if (!chore) continue;
              if (chore.type === "daily") weekDaily.add(chore.id);
              else weekWeekly.add(chore.id);
            }
            const numer = weekDaily.size + weekWeekly.size * 2;
            pctByKid[kid.id] = denom === 0 ? 0 : numer / denom;
          }
          return { ...w, pctByKid };
        });
      });
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const grid = useMemo(() => rows.map(r => ({
    label: r.label,
    astrid: r.pctByKid["astrid"] ?? 0,
    emilia: r.pctByKid["emilia"] ?? 0
  })), [rows]);

  function badge(p: number) {
    if (p >= trophy) return "🏆";
    if (p >= apple) return "🍎";
    return "";
  }

  return (
    <div className="container">
      <h1 className="big">Weekly Progress</h1>
      <p className="muted">Last 8 weeks. Trophy ≥ {Math.round(trophy*100)}%, Apple ≥ {Math.round(apple*100)}%.</p>
      <div className="grid" style={{ marginTop: 12 }}>
        {grid.map((g, i) => (
          <div key={i} className="item" style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 10 }}>
            <div>{g.label}</div>
            <div title={`${Math.round(g.astrid*100)}%`}>Astrid {badge(g.astrid)}</div>
            <div title={`${Math.round(g.emilia*100)}%`}>Emilia {badge(g.emilia)}</div>
          </div>
        ))}
        {grid.length === 0 && <div className="muted">No data yet</div>}
      </div>
    </div>
  );
}
