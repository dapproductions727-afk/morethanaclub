// Achievements, unlocks, and run history. Persistence is localStorage, guarded
// so it never throws in SSR/export. Achievements are evaluated at the ending
// from the final run summary. Hard runs unlock new founding flavour.

import type { Meters, Founding } from "./types";

// ---- Last-run snapshot: used by visible-unlock hints and dynasty inheritance ----

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

// ---- Visible unlocks: next thing to play toward ----

export interface NextUnlock {
  achievement: Achievement;
  hint: string;
  unlocksLabel?: string;
}

function ordinal(n: number): string {
  if (n === 1) return "st";
  if (n === 2) return "nd";
  if (n === 3) return "rd";
  return "th";
}

export function nextUnlock(): NextUnlock | null {
  const have = new Set(getUnlockedAchievements());
  const locked = ACHIEVEMENTS.filter((a) => !have.has(a.key));
  if (locked.length === 0) return null;
  const last = readLastRun();

  function score(a: Achievement): number {
    if (!last) return 0;
    switch (a.key) {
      case "first-century": return !last.survived ? 3 : 0;
      case "true-believer": return last.survived && !last.charterBroken && last.trophies < 2 ? 3 : 0;
      case "kept-the-faith": return last.charterBroken ? 3 : last.survived ? 1 : 0;
      case "sold-the-soul": return last.charterBroken && last.trophies >= 3 ? 3 : last.charterBroken ? 1 : 0;
      case "stayed-home": return (last.movedOut || last.corporate) ? 3 : last.survived ? 1 : 0;
      case "champions": return last.bestPosition === 2 ? 3 : last.bestPosition <= 3 ? 1 : 0;
      case "purist-hard":
        return last.survived && !last.charterBroken && last.founding.rules.length >= 3 ? 3
          : last.founding.rules.length >= 3 ? 1 : 0;
      case "hostile-state":
        return last.survived && !last.charterBroken && last.founding.region !== "capital" ? 3
          : last.founding.region === "capital" ? 1 : 0;
      default: return 0;
    }
  }

  function hint(a: Achievement): string {
    if (!last) return a.desc;
    switch (a.key) {
      case "first-century":
        return !last.survived ? "Last century, the club died. Just survive a hundred years." : a.desc;
      case "true-believer":
        return `You won ${last.trophies} title${last.trophies === 1 ? "" : "s"} last run${!last.charterBroken ? " with the charter intact" : ""} — need 2 with the charter intact.`;
      case "kept-the-faith":
        return last.charterBroken ? "You broke the charter last run. Reach the end without breaking it." : a.desc;
      case "sold-the-soul":
        return last.charterBroken
          ? `You broke the charter and won ${last.trophies} — need 4 to make it worth it.`
          : a.desc;
      case "stayed-home":
        return last.movedOut
          ? "You moved the ground last run. Finish without doing either."
          : last.corporate
          ? "You sold out last run. Finish without doing either."
          : a.desc;
      case "champions":
        return last.bestPosition > 1
          ? `Best finish last run: ${last.bestPosition}${ordinal(last.bestPosition)}. Top the table.`
          : a.desc;
      case "purist-hard":
        return last.founding.rules.length < 3 || last.charterBroken
          ? "Swear all three charter rules and keep them."
          : a.desc;
      case "hostile-state":
        return last.founding.region !== "capital"
          ? "Found a capital-city club and survive with the charter intact."
          : a.desc;
      default:
        return a.desc;
    }
  }

  let best = locked[0];
  let bestScore = score(locked[0]);
  for (let i = 1; i < locked.length; i++) {
    const s = score(locked[i]);
    if (s > bestScore) { bestScore = s; best = locked[i]; }
  }

  const unlocksEntry = UNLOCKS[best.key];
  return {
    achievement: best,
    hint: hint(best),
    unlocksLabel: unlocksEntry?.label,
  };
}

// Which content keys are locked, and what achievement condition unlocks them.
export function lockedContent(): Record<string, { by: string; label: string }> {
  const have = new Set(getUnlockedAchievements());
  const result: Record<string, { by: string; label: string }> = {};
  for (const [achKey, unlock] of Object.entries(UNLOCKS)) {
    if (!have.has(achKey)) {
      const ach = ACHIEVEMENTS.find((a) => a.key === achKey);
      result[unlock.unlocks] = { by: achKey, label: ach?.desc ?? unlock.label };
    }
  }
  return result;
}
