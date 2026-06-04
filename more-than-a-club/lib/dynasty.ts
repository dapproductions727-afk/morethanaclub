import type { LastRun } from "./progress";
import type { Meters } from "./types";

export interface Inheritance {
  rivalName: string;
  rivalArc: number[];
  rivalBlurb: string;
  rivalArchetype: "sellout" | "purist" | "steady" | "fallen";
  startBump: Partial<Meters>;
  eraPressureMod: number;
  flavorLine: string;
}

const ERAS = 15;

function makeArc(fn: (e: number) => number): number[] {
  return Array.from({ length: ERAS }, (_, e) => Math.max(120, Math.round(fn(e))));
}

const REGION_ADJECTIVES: Record<string, string> = {
  north: "Northern",
  midlands: "Midlands",
  capital: "Capital City",
  port: "Port",
  valley: "Valley",
};

export function deriveInheritance(last: LastRun | null): Inheritance | null {
  if (!last) return null;

  const adj = REGION_ADJECTIVES[last.founding.region ?? ""] ?? "Old";
  const rivalName = `${adj} FC`;

  if (last.corporate || last.movedOut) {
    return {
      rivalName,
      rivalArchetype: "sellout",
      rivalArc: makeArc((e) => 170 + (e > 6 ? (e - 6) * 22 : e * 4)),
      rivalBlurb: last.corporate
        ? "Sold to a fund in your last century. Now owns the league."
        : "Packed up and moved out of town. Bought their way to the top.",
      startBump: { money: 6, soul: -4 },
      eraPressureMod: 1.15,
      flavorLine: `Across town, ${rivalName} — the club that took the money — still casts a long shadow.`,
    };
  }

  if (last.survived && !last.charterBroken) {
    return {
      rivalName,
      rivalArchetype: "purist",
      rivalArc: makeArc((e) => 230 - e * 5),
      rivalBlurb: "Kept the faith all century. The neighbourhood still loves them.",
      startBump: { soul: 6, fans: 3 },
      eraPressureMod: 1.0,
      flavorLine: `Across town, ${rivalName} — the club that kept the faith — still draws its crowds.`,
    };
  }

  if (!last.survived) {
    return {
      rivalName,
      rivalArchetype: "fallen",
      rivalArc: makeArc((e) => 240 - (e > 7 ? (e - 7) * 18 : 0)),
      rivalBlurb: "Overreached and collapsed mid-century. A cautionary giant.",
      startBump: { money: -5 },
      eraPressureMod: 1.0,
      flavorLine: `Across town, the ruins of ${rivalName} — the club that fell — are still visible.`,
    };
  }

  // Survived with charter broken, stayed put — steady mid-table presence.
  return {
    rivalName,
    rivalArchetype: "steady",
    rivalArc: makeArc((e) => 205 + Math.round(Math.sin(e / 2) * 12)),
    rivalBlurb: "Forever mid-table. Never relegated, never champions. The metronome of the league.",
    startBump: {},
    eraPressureMod: 1.0,
    flavorLine: `Across town, ${rivalName} — a steady presence through the years — watches on.`,
  };
}
