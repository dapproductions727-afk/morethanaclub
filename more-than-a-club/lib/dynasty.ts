// Dynasty inheritance: how the last finished century reshapes the next run's
// world — as a league rival, a starting bump, and era pressure. Seeded runs
// bypass this entirely (pass null to deriveInheritance).

import type { LastRun } from "./progress";
import type { Meters } from "./types";
import { REGIONS } from "./regions";

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
function arc(fn: (e: number) => number): number[] {
  return Array.from({ length: ERAS }, (_, e) => Math.max(120, Math.round(fn(e))));
}

export function deriveInheritance(last: LastRun | null): Inheritance | null {
  if (!last) return null;

  const place = last.founding.region
    ? (REGIONS[last.founding.region]?.place ?? last.founding.region)
    : "Unknown";

  if (last.corporate || last.movedOut) {
    const rivalName = `${place} City FC`;
    return {
      rivalName,
      rivalArc: arc((e) => 165 + (e > 6 ? (e - 6) * 20 : e * 3)),
      rivalBlurb: `${last.movedOut ? "Moved out of the old ground" : "Sold to a fund"} in your last century. Now owns the league.`,
      rivalArchetype: "sellout",
      startBump: { money: 6, soul: -4 },
      eraPressureMod: 1.15,
      flavorLine: `Across town, ${rivalName} — the club that took the money — still casts a long shadow.`,
    };
  }

  if (last.survived && !last.charterBroken) {
    const rivalName = `Old ${place}`;
    return {
      rivalName,
      rivalArc: arc((e) => 225 - e * 6),
      rivalBlurb: "Kept the faith for a hundred years. The neighbourhood still loves them.",
      rivalArchetype: "purist",
      startBump: { soul: 6, fans: 3 },
      eraPressureMod: 1.0,
      flavorLine: `${rivalName} — the club that kept the faith — is part of this city's conscience now.`,
    };
  }

  if (!last.survived) {
    const rivalName = `${place} Athletic`;
    return {
      rivalName,
      rivalArc: arc((e) => 240 - (e > 7 ? (e - 7) * 18 : 0)),
      rivalBlurb: "Once a giant. Overstretched and collapsed. A cautionary tale the whole city remembers.",
      rivalArchetype: "fallen",
      startBump: { money: -5 },
      eraPressureMod: 1.0,
      flavorLine: `The ghost of ${rivalName} — the club that died — haunts every boardroom decision you make.`,
    };
  }

  // Default: survived, charter broken, stayed put
  const rivalName = `${place} United`;
  return {
    rivalName,
    rivalArc: arc((e) => 200 + Math.round(Math.sin(e / 2.5) * 10)),
    rivalBlurb: "Mid-table ever since. Steady as ever. Part of the furniture.",
    rivalArchetype: "steady",
    startBump: {},
    eraPressureMod: 1.0,
    flavorLine: `${rivalName} — reliable, unremarkable, always there — represents everything you're trying to transcend.`,
  };
}
