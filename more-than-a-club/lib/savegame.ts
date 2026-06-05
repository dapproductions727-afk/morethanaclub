// Mid-run save: a single in-progress century, snapshotted at the start of each
// scene (a clean boundary — no in-flight season log or pending match to lose).
// Persistence is localStorage, guarded so it never throws in SSR/static export.
// Seeded "daily challenge" runs are intentionally NOT saved: the daily is meant
// to be a single sitting, and its RNG can't be resumed mid-stream.

import type { Meters, Player, Founding } from "./types";

const KEY = "mtac.savegame.v1";

export interface SaveGame {
  version: 2;
  savedAt: number;
  // Founding + identity
  founding: Founding;
  // Core run state
  meters: Meters;
  squad: Player[];
  trophies: number;
  reach: number;
  current: number; // scene index the player is about to play
  charterBroken: boolean;
  defiedBan: boolean;
  // Branch-worthy past choices (by mark), so a resumed run resolves the right
  // scene variants. Missing on legacy v1 saves → treated as empty.
  decisions: string[];
  unlockedTech: string[];
  // Stadium decision flags
  rebuilt: boolean;
  newStand: boolean;
  movedOut: boolean;
  corporate: boolean;
  // Form / mood / manager / culture
  form: number;
  managerKey: string | null;
  managerTenure: number;
  mgrContractLocked: boolean;
  firedMgrEvts: string[];
  news: string[];
  culture: number;
  charterWasBroken: boolean;
  // Replay bookkeeping
  runLog: { year: string; text: string }[];
  bestPosition: number;
  nameCounter: number;
}

export function readSave(): SaveGame | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Omit<SaveGame, "version"> & { version: number };
    // Accept v1 (pre-branching) and v2 saves. Default missing fields so an
    // old save resumes cleanly onto the fallback scene path.
    if (parsed.version !== 1 && parsed.version !== 2) return null;
    if (!Array.isArray(parsed.decisions)) parsed.decisions = [];
    return { ...parsed, version: 2 };
  } catch {
    return null;
  }
}

export function writeSave(s: SaveGame): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore quota / disabled storage */
  }
}

export function clearSave(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function hasSave(): boolean {
  return readSave() != null;
}
