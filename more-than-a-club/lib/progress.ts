// Achievements, unlocks, and run history. Persistence is localStorage, guarded
// so it never throws in SSR/export. Achievements are evaluated at the ending
// from the final run summary. Hard runs unlock new founding flavour.

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
