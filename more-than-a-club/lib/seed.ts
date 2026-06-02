// Seeded mode: a "same century for everyone" daily challenge. A date string
// becomes a deterministic seed; the founding is fixed from that seed, and all
// season RNG runs through the seeded generator so two players on the same day
// face the identical century and can compare scores.

import { REGIONS } from "./regions";
import { STORIES } from "./charter";
import { RULES } from "./charter";
import type { Founding } from "./types";

// Mulberry32: tiny, fast, deterministic PRNG.
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seedFromString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function todaySeedString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

// Pick a fixed founding from the seed so every player gets the same start.
export function seededFounding(seed: number): Founding {
  const rng = mulberry32(seed);
  const rk = Object.keys(REGIONS);
  const sk = Object.keys(STORIES);
  const ruk = Object.keys(RULES);
  const region = rk[Math.floor(rng() * rk.length)];
  const story = sk[Math.floor(rng() * sk.length)];
  // two charter rules for the challenge
  const r1 = ruk[Math.floor(rng() * ruk.length)];
  let r2 = ruk[Math.floor(rng() * ruk.length)];
  if (r2 === r1) r2 = ruk[(ruk.indexOf(r1) + 1) % ruk.length];
  return { region, story, rules: [r1, r2] };
}

// A single score number for the seeded run, for leaderboards/bragging.
export function seededScore(opts: {
  trophies: number;
  charterBroken: boolean;
  survived: boolean;
  soul: number;
  fans: number;
  money: number;
}): number {
  if (!opts.survived) return 0;
  const base = opts.trophies * 100;
  const balance = Math.round((opts.soul + opts.fans + opts.money) / 3);
  const purityBonus = opts.charterBroken ? 0 : 150;
  return base + balance + purityBonus;
}
