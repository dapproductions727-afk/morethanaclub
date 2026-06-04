// Achievements, unlocks, run history, and dynasty features. Persistence is
// localStorage, guarded so it never throws in SSR/export. Achievements are
// evaluated at the ending from the final run summary. Hard runs unlock new
// founding flavour.

import type { Meters, Founding } from "./types";

export interface RunSummary {
  founding: Founding;
  trophies: number;
  charterBroken: boolean;
  meters: Meters;
  survived: boolean;
  movedOut: boolean;
  corporate: boolean;
  bestPosition: number; // best league finish reached (1 = top)
  seeded: boolean;
  score: number; // seeded-mode score
}

export interface Achievement {
  key: string;
  name: string;
  desc: string;
  test: (r: RunSummary) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    key: "first-century",
    name: "A hundred years",
    desc: "Finish a century without the club dying.",
    test: (r) => r.survived,
  },
  {
    key: "true-believer",
    name: "True believer",
    desc: "Win 2+ titles with the charter intact.",
    test: (r) => r.survived && !r.charterBroken && r.trophies >= 2,
  },
  {
    key: "kept-the-faith",
    name: "Kept the faith",
    desc: "Reach the end with the charter never broken.",
    test: (r) => r.survived && !r.charterBroken,
  },
  {
    key: "sold-the-soul",
    name: "Sold the soul",
    desc: "Win 4+ titles after breaking the charter.",
    test: (r) => r.survived && r.charterBroken && r.trophies >= 4,
  },
  {
    key: "stayed-home",
    name: "Stayed home",
    desc: "Finish without ever moving the ground or selling out.",
    test: (r) => r.survived && !r.movedOut && !r.corporate,
  },
  {
    key: "champions",
    name: "Top of the pile",
    desc: "Finish a century top of the league table.",
    test: (r) => r.bestPosition === 1,
  },
  {
    key: "purist-hard",
    name: "The Bilbao run",
    desc: "Survive with three charter rules, none broken.",
    test: (r) => r.survived && !r.charterBroken && r.founding.rules.length >= 3,
  },
  {
    key: "hostile-state",
    name: "Under the boot",
    desc: "Survive as a capital-city club with the charter intact.",
    test: (r) => r.survived && !r.charterBroken && r.founding.region === "capital",
  },
];

// Unlocks: which achievement gates which extra founding flavour.
export const UNLOCKS: Record<string, { unlocks: string; label: string }> = {
  "true-believer": { unlocks: "story:dynasty", label: "Founding story: The dynasty" },
  "champions": { unlocks: "rule:europe", label: "Charter rule: Continental ambition" },
};

// ---- Last-run snapshot (for personalised hints + dynasty inheritance) ----
const LAST_KEY = "mtac.lastrun.v1";

export interface LastRun {
  founding: Founding;
  trophies: number;
  charterBroken: boolean;
  survived: boolean;
  bestPosition: number;
  movedOut: boolean;
  corporate: boolean;
  endingTitle: string;
  soul: number;
  fans: number;
  money: number;
  endedAt: number;
}

export function readLastRun(): LastRun | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LAST_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LastRun;
  } catch {
    return null;
  }
}

export function writeLastRun(r: LastRun): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LAST_KEY, JSON.stringify(r));
  } catch {
    /* ignore */
  }
}

// ---- Next unlock nudge ----
export interface NextUnlock {
  achievement: Achievement;
  hint: string;
  unlocksLabel?: string;
}

export function nextUnlock(): NextUnlock | null {
  const have = new Set(getUnlockedAchievements());
  const locked = ACHIEVEMENTS.filter((a) => !have.has(a.key));
  if (locked.length === 0) return null;
  const last = readLastRun();

  function score(a: Achievement): number {
    if (!last) return 0;
    const { trophies, charterBroken, survived, bestPosition, movedOut, corporate, founding } = last;
    switch (a.key) {
      case "first-century": return !survived ? 3 : 0;
      case "true-believer": return survived && !charterBroken && trophies === 1 ? 3 : survived && !charterBroken && trophies > 0 ? 1 : 0;
      case "kept-the-faith": return charterBroken ? 3 : 0;
      case "sold-the-soul": return charterBroken && trophies >= 1 ? 3 : charterBroken ? 1 : 0;
      case "stayed-home": return movedOut || corporate ? 3 : 0;
      case "champions": return survived && bestPosition === 2 ? 3 : survived && bestPosition === 3 ? 1 : 0;
      case "purist-hard": return survived && !charterBroken && founding.rules.length >= 2 ? 1 : 0;
      case "hostile-state": return founding.region !== "capital" ? 1 : 0;
      default: return 0;
    }
  }

  function buildHint(a: Achievement): string {
    if (!last) return a.desc;
    const { trophies, charterBroken, survived, bestPosition, movedOut, corporate, founding } = last;
    switch (a.key) {
      case "first-century":
        return !survived ? "Last century, the club died. Just survive a hundred years." : a.desc;
      case "true-believer":
        return `You won ${trophies} title${trophies === 1 ? "" : "s"} last run with the charter intact — need 2.`;
      case "kept-the-faith":
        return charterBroken ? "You broke the charter last run. Reach the end without breaking it." : a.desc;
      case "sold-the-soul":
        return charterBroken ? `You broke the charter and won ${trophies} — need 4 to make it worth it.` : a.desc;
      case "stayed-home":
        if (movedOut && corporate) return "You moved the ground and sold out last run. Finish without doing either.";
        if (movedOut) return "You moved the ground last run. Finish without doing either.";
        if (corporate) return "You sold out last run. Finish without doing either.";
        return a.desc;
      case "champions":
        return `Best finish last run: ${bestPosition}${bestPosition === 1 ? "st" : bestPosition === 2 ? "nd" : "th"}. Top the table.`;
      case "purist-hard":
        return founding.rules.length < 3 || charterBroken
          ? "Swear all three charter rules and keep them."
          : a.desc;
      case "hostile-state":
        return founding.region !== "capital"
          ? "Found a capital-city club and survive with the charter intact."
          : a.desc;
      default:
        return a.desc;
    }
  }

  let best = locked[0];
  let bestScore = score(locked[0]);
  for (const a of locked.slice(1)) {
    const s = score(a);
    if (s > bestScore) { best = a; bestScore = s; }
  }

  const unlock = UNLOCKS[best.key];
  return {
    achievement: best,
    hint: buildHint(best),
    unlocksLabel: unlock?.label,
  };
}

// ---- Locked content reverse lookup ----
export function lockedContent(): Record<string, { by: string; label: string }> {
  const have = new Set(getUnlockedAchievements());
  const result: Record<string, { by: string; label: string }> = {};
  for (const [achKey, unlock] of Object.entries(UNLOCKS)) {
    if (!have.has(achKey)) {
      const ach = ACHIEVEMENTS.find((a) => a.key === achKey);
      result[unlock.unlocks] = { by: achKey, label: ach?.desc || "" };
    }
  }
  return result;
}

const KEY = "mtac-progress-v1";

interface Saved {
  achievements: string[];
  bestSeededScore: number;
}

function read(): Saved {
  if (typeof window === "undefined") return { achievements: [], bestSeededScore: 0 };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { achievements: [], bestSeededScore: 0 };
    return JSON.parse(raw) as Saved;
  } catch {
    return { achievements: [], bestSeededScore: 0 };
  }
}

function write(s: Saved) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export function getUnlockedAchievements(): string[] {
  return read().achievements;
}

export function getBestSeededScore(): number {
  return read().bestSeededScore;
}

// Evaluate a finished run, persist any newly earned achievements, and return
// the keys that were newly earned this run (for a "NEW" badge).
export function recordRun(r: RunSummary): { newlyEarned: string[]; all: string[] } {
  const saved = read();
  const have = new Set(saved.achievements);
  const newlyEarned: string[] = [];
  for (const a of ACHIEVEMENTS) {
    if (!have.has(a.key) && a.test(r)) {
      have.add(a.key);
      newlyEarned.push(a.key);
    }
  }
  saved.achievements = [...have];
  if (r.seeded && r.score > saved.bestSeededScore) saved.bestSeededScore = r.score;
  write(saved);
  return { newlyEarned, all: saved.achievements };
}
