// Rival clubs that rise and fall alongside the player across the century, so
// the league has characters and the player's choices are measured against
// someone. Each rival has an archetype that sets how its strength moves era to
// era. They are deterministic given the era index (no RNG) so the table reads
// as a coherent story, not noise.

import type { Inheritance } from "./dynasty";

export interface Rival {
  key: string;
  name: string;
  archetype: "sellout" | "purist" | "steady" | "fallen";
  blurb: string;
  // strength by era index 0..14 (precomputed arc)
  arc: number[];
}

// Arc helpers: each archetype tells a different century.
// - sellout: poor early, takes the money mid-century, dominates late.
// - purist: solid early, refuses the money, slowly falls behind.
// - steady: bobs around mid-table the whole way.
// - fallen: a giant that overreaches and collapses.
const ERAS = 15;

function arc(fn: (e: number) => number): number[] {
  return Array.from({ length: ERAS }, (_, e) => Math.max(120, Math.round(fn(e))));
}

export const RIVALS: Rival[] = [
  {
    key: "money",
    name: "Sportsclub Meridian",
    archetype: "sellout",
    blurb: "Took every cheque going. Bought the league and a new identity with it.",
    // climbs hard after ~era 6 (the TV era)
    arc: arc((e) => 170 + (e > 6 ? (e - 6) * 22 : e * 4)),
  },
  {
    key: "pure",
    name: "Old Wanderers",
    archetype: "purist",
    blurb: "Never sold a thing. Never won much either, lately. The neighbourhood still loves them.",
    // strong early, gently declines relative to the money clubs
    arc: arc((e) => 230 - e * 5),
  },
  {
    key: "steady",
    name: "County Athletic",
    archetype: "steady",
    blurb: "Forever mid-table. Never relegated, never champions. The metronome of the league.",
    arc: arc((e) => 205 + Math.round(Math.sin(e / 2) * 12)),
  },
];

export function rivalStrength(r: Rival, era: number): number {
  return r.arc[Math.min(ERAS - 1, Math.max(0, era))];
}

// Build a league table: the player plus the rivals, sorted by strength.
export interface TableRow {
  name: string;
  strength: number;
  isPlayer: boolean;
}

export function dynastyRival(inh: Inheritance): Rival {
  return {
    key: "dynasty",
    name: inh.rivalName,
    archetype: inh.rivalArchetype,
    blurb: inh.rivalBlurb,
    arc: inh.rivalArc,
  };
}

export function leagueTable(
  playerName: string,
  playerStrength: number,
  era: number,
  extraRivals: Rival[] = [],
): TableRow[] {
  const allRivals = [...RIVALS, ...extraRivals];
  const rows: TableRow[] = allRivals.map((r) => ({
    name: r.name,
    strength: rivalStrength(r, era),
    isPlayer: false,
  }));
  rows.push({ name: playerName, strength: playerStrength, isPlayer: true });
  rows.sort((a, b) => b.strength - a.strength);
  return rows;
}

export function playerPosition(
  playerStrength: number,
  era: number,
  extraRivals: Rival[] = [],
): number {
  const allRivals = [...RIVALS, ...extraRivals];
  const stronger = allRivals.filter((r) => rivalStrength(r, era) > playerStrength).length;
  return stronger + 1; // 1st..(3+extraRivals.length+1)th
}
