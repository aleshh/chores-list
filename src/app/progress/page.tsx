"use client";
import { useEffect, useMemo, useState } from "react";
import { data } from "@/lib/data";
import { AuthGate } from "@/components/AuthGate";
import { endOfWeek, startOfWeek } from "@/lib/dates";
import { X } from "lucide-react";

type Chore = { id: string; type: "daily" | "weekly"; child_id: string; title: string };
const KIDS = [
  { id: "astrid", name: "Astrid" },
  { id: "emilia", name: "Emilia" }
] as const;

type WeekRow = { weekStart: Date; weekEnd: Date; pctByKid: Record<string, number> };

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
        const we = endOfWeek(ws);
        weeks.push({ weekStart: ws, weekEnd: we, pctByKid: {} as any });
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
            let dailyNumer = 0;
            for (const c of daily) {
              const days = new Set<number>();
              for (const r of weekRows) {
                if (r.chore_id !== c.id) continue;
                const d = new Date(r.done_at);
                const dStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                const idx = Math.floor((dStart.getTime() - new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime()) / 86400000);
                if (idx >= 0 && idx < 7) days.add(idx);
              }
              dailyNumer += Math.min(7, days.size);
            }
            let weeklyNumer = 0;
            for (const c of weekly) {
              const any = weekRows.some((r: any) => r.chore_id === c.id);
              if (any) weeklyNumer += 2;
            }
            const numer = dailyNumer + weeklyNumer;
            pctByKid[kid.id] = denom === 0 ? 0 : numer / denom;
          }
          return { ...w, pctByKid };
        });
      });
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function renderTiles(pcts: number[]) {
    return (
      <div className="tilesRow">
        {pcts.map((p, idx) => (
          <div key={idx} className="tile">
            <div className={`score ${p>=trophy? 'big':''}`}>{p>=trophy? '🏆' : p>=apple? '🍎' : `${Math.round(p*100)}%`}</div>
            <div className="date">{formatRange(rows[idx].weekStart, rows[idx].weekEnd)}</div>
          </div>
        ))}
      </div>
    );
  }

  function formatRange(a: Date, b: Date) {
    const f = (d: Date) => `${d.getMonth()+1}/${d.getDate()}`;
    return `${f(a)}–${f(b)}`;
  }

  const astridPcts = rows.map(r => r.pctByKid["astrid"] ?? 0);
  const emiliaPcts = rows.map(r => r.pctByKid["emilia"] ?? 0);

  return (
    <div className="container">
      <div className="topbar">
        <a href="/" style={{ color: 'inherit' }}><h1>Chores list</h1></a>
        <div className="actions">
          <a className="iconBtn" href="/" title="Close" aria-label="Close"><X color="#fff" size={22} /></a>
        </div>
      </div>
      <p className="muted">Last 8 weeks. Trophy ≥ {Math.round(trophy*100)}%, Apple ≥ {Math.round(apple*100)}%.</p>
      <div className="row" style={{ marginTop: 10 }}>
        <div className="col">
          <div className="big" style={{ marginBottom: 6 }}>Astrid</div>
          {rows.length ? renderTiles(astridPcts) : <div className="muted">No data yet</div>}
        </div>
        <div className="col">
          <div className="big" style={{ marginBottom: 6 }}>Emilia</div>
          {rows.length ? renderTiles(emiliaPcts) : <div className="muted">No data yet</div>}
        </div>
      </div>
    </div>
  );
}
