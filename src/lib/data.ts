"use client";
import { supabase } from "@/lib/supabase";

export type Chore = { id: string; title: string; type: "daily" | "weekly"; child_id: string; active: boolean; position: number };
export type Checkoff = { id: string; chore_id: string; done_at: string };
export type Settings = { trophy_threshold: number; apple_threshold: number };

const MODE = (process.env.NEXT_PUBLIC_DATA_MODE || "supabase").toLowerCase();

function uuid() { if (typeof crypto !== "undefined" && (crypto as any).randomUUID) return (crypto as any).randomUUID(); return Math.random().toString(36).slice(2) + Date.now().toString(36); }

// Local storage helpers
function readLS<T>(key: string, fallback: T): T { if (typeof window === "undefined") return fallback; try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : fallback; } catch { return fallback; } }
function writeLS<T>(key: string, value: T) { if (typeof window === "undefined") return; try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }

const KEYS = { chores: "chores", checkoffs: "checkoffs", settings: "settings" } as const;

const Local = {
  async getActiveChores(): Promise<Chore[]> {
    const all = readLS<Chore[]>(KEYS.chores, []);
    return all.filter(c => c.active !== false).sort((a,b) => a.position - b.position);
  },
  async addChore(input: Pick<Chore, "title"|"type"|"child_id"|"position">): Promise<void> {
    const all = readLS<Chore[]>(KEYS.chores, []);
    const item: Chore = { id: uuid(), active: true, ...input } as Chore;
    all.push(item); writeLS(KEYS.chores, all);
  },
  async updateChore(id: string, updates: Partial<Pick<Chore, "title"|"position"|"active">>): Promise<void> {
    const all = readLS<Chore[]>(KEYS.chores, []);
    const idx = all.findIndex(c => c.id === id); if (idx >= 0) { all[idx] = { ...all[idx], ...updates }; writeLS(KEYS.chores, all); }
  },
  async softDeleteChore(id: string): Promise<void> { return Local.updateChore(id, { active: false }); },

  async getSettings(): Promise<Settings | null> { return readLS<Settings | null>(KEYS.settings, null); },
  async saveSettings(s: Settings): Promise<void> { writeLS(KEYS.settings, s); },

  async getCheckoffsInRange(from: Date, to: Date): Promise<Checkoff[]> {
    const all = readLS<Checkoff[]>(KEYS.checkoffs, []);
    return all.filter(r => { const d = new Date(r.done_at); return d >= from && d <= to; });
  },
  async getCheckoffsForChores(choreIds: string[], from: Date, to: Date): Promise<Checkoff[]> {
    const set = new Set(choreIds);
    const all = readLS<Checkoff[]>(KEYS.checkoffs, []);
    return all.filter(r => set.has(r.chore_id) && (new Date(r.done_at) >= from && new Date(r.done_at) <= to));
  },
  async findCheckoffInRange(choreId: string, from: Date, to: Date): Promise<Checkoff | null> {
    const all = readLS<Checkoff[]>(KEYS.checkoffs, []);
    return all.find(r => r.chore_id === choreId && (new Date(r.done_at) >= from && new Date(r.done_at) <= to)) || null;
  },
  async insertCheckoff(choreId: string, date: Date): Promise<void> {
    const all = readLS<Checkoff[]>(KEYS.checkoffs, []);
    all.push({ id: uuid(), chore_id: choreId, done_at: date.toISOString() });
    writeLS(KEYS.checkoffs, all);
  },
  async deleteCheckoff(id: string): Promise<void> {
    const all = readLS<Checkoff[]>(KEYS.checkoffs, []);
    writeLS(KEYS.checkoffs, all.filter(r => r.id !== id));
  }
};

const Remote = {
  async getActiveChores(): Promise<Chore[]> {
    const { data, error } = await supabase
      .from("chores")
      .select("id,title,type,child_id,active,position")
      .eq("active", true)
      .order("position", { ascending: true });
    if (error) throw error;
    return data as any;
  },
  async addChore(input: Pick<Chore, "title"|"type"|"child_id"|"position">): Promise<void> {
    const { error } = await supabase.from("chores").insert({ ...input, active: true });
    if (error) throw error;
  },
  async updateChore(id: string, updates: Partial<Pick<Chore, "title"|"position"|"active">>): Promise<void> {
    const { error } = await supabase.from("chores").update(updates).eq("id", id);
    if (error) throw error;
  },
  async softDeleteChore(id: string): Promise<void> { return Remote.updateChore(id, { active: false }); },

  async getSettings(): Promise<Settings | null> {
    const { data, error } = await supabase.from("settings").select("trophy_threshold,apple_threshold").maybeSingle();
    if (error) return null;
    if (!data) return null;
    return { trophy_threshold: Number(data.trophy_threshold), apple_threshold: Number(data.apple_threshold) };
  },
  async saveSettings(s: Settings): Promise<void> {
    const { error } = await supabase.from("settings").upsert({ id: 1, trophy_threshold: s.trophy_threshold, apple_threshold: s.apple_threshold });
    if (error) throw error;
  },

  async getCheckoffsInRange(from: Date, to: Date): Promise<Checkoff[]> {
    const { data, error } = await supabase
      .from("checkoffs")
      .select("id,chore_id,done_at")
      .gte("done_at", from.toISOString())
      .lte("done_at", to.toISOString());
    if (error) throw error;
    return data as any;
  },
  async getCheckoffsForChores(choreIds: string[], from: Date, to: Date): Promise<Checkoff[]> {
    const { data, error } = await supabase
      .from("checkoffs")
      .select("id,chore_id,done_at")
      .in("chore_id", choreIds)
      .gte("done_at", from.toISOString())
      .lte("done_at", to.toISOString());
    if (error) throw error;
    return data as any;
  },
  async findCheckoffInRange(choreId: string, from: Date, to: Date): Promise<Checkoff | null> {
    const { data, error } = await supabase
      .from("checkoffs")
      .select("id,chore_id,done_at")
      .eq("chore_id", choreId)
      .gte("done_at", from.toISOString())
      .lte("done_at", to.toISOString())
      .limit(1);
    if (error) throw error;
    return data && data[0] ? (data[0] as any) : null;
  },
  async insertCheckoff(choreId: string, date: Date): Promise<void> {
    const { error } = await supabase.from("checkoffs").insert({ chore_id: choreId, done_at: date.toISOString() });
    if (error) throw error;
  },
  async deleteCheckoff(id: string): Promise<void> {
    const { error } = await supabase.from("checkoffs").delete().eq("id", id);
    if (error) throw error;
  }
};

const Provider = MODE === "local" ? Local : Remote;

export const data = Provider;

