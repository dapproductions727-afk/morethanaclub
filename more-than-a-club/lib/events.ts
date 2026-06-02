import type { Meters, Player } from "./types";

// Small random events that fire between seasons, shown in a news ticker. They
// add texture and surprise so the seasons aren't just dice. Each has a weight,
// an optional condition, and an effect on meters or squad. Kept light: none
// should swing the century, only flavour a decade.

export interface GameEvent {
  id: string;
  headline: string; // shown in the ticker
  weight: number;
  cond?: (s: EventState) => boolean;
  apply: (ctx: EventCtx) => void;
}

export interface EventState {
  era: number; // scene index
  meters: Meters;
  trophies: number;
  reach: number;
}

export interface EventCtx {
  meters: Meters;
  squad: Player[];
  addPlayer: (p: Player) => void;
  boostUnder: (age: number, by: number) => void;
}

const wonderkidNames = ["Vidal", "Costa", "Bauer", "Novak", "Reyes", "Haaland", "Ødegaard", "Iniesta", "Salah"];
let wk = 0;

export const EVENTS: GameEvent[] = [
  {
    id: "wonderkid",
    headline: "ACADEMY: A 17-year-old is turning heads in training.",
    weight: 3,
    apply: (c) => {
      const name = wonderkidNames[wk++ % wonderkidNames.length];
      c.addPlayer({ name, age: 17, rating: 13, foreign: false });
      c.meters.soul = Math.min(100, c.meters.soul + 2);
    },
  },
  {
    id: "derby",
    headline: "DERBY DAY: The whole city stops. The terraces are a furnace.",
    weight: 3,
    apply: (c) => {
      c.meters.fans = Math.min(100, c.meters.fans + 3);
    },
  },
  {
    id: "derby-trouble",
    headline: "TROUBLE: Crowd disorder after the derby. The press is unkind.",
    weight: 2,
    cond: (s) => s.era >= 6,
    apply: (c) => {
      c.meters.fans = Math.max(0, c.meters.fans - 3);
      c.meters.money = Math.max(0, c.meters.money - 2);
    },
  },
  {
    id: "sponsor",
    headline: "OFFER: A local brewery wants its name on the shirt.",
    weight: 2,
    cond: (s) => s.era >= 4,
    apply: (c) => {
      c.meters.money = Math.min(100, c.meters.money + 4);
      c.meters.soul = Math.max(0, c.meters.soul - 2);
    },
  },
  {
    id: "testimonial",
    headline: "TESTIMONIAL: A one-club man hangs up his boots to a full house.",
    weight: 2,
    apply: (c) => {
      c.meters.soul = Math.min(100, c.meters.soul + 3);
      c.meters.fans = Math.min(100, c.meters.fans + 2);
    },
  },
  {
    id: "injury",
    headline: "BLOW: Your best player limps off. Months on the sidelines.",
    weight: 2,
    apply: (c) => {
      // Knock 3 off the top-rated player; it heals via era turnover.
      let best = -1;
      let bestR = -1;
      c.squad.forEach((p, i) => {
        if (p.rating > bestR) {
          bestR = p.rating;
          best = i;
        }
      });
      if (best >= 0) c.squad[best].rating = Math.max(4, c.squad[best].rating - 3);
    },
  },
  {
    id: "flood",
    headline: "STORM: The pitch floods. Two home games called off.",
    weight: 1,
    apply: (c) => {
      c.meters.money = Math.max(0, c.meters.money - 3);
    },
  },
  {
    id: "windfall",
    headline: "WINDFALL: A rival overpays for your reserve full-back.",
    weight: 2,
    apply: (c) => {
      c.meters.money = Math.min(100, c.meters.money + 5);
    },
  },
  {
    id: "fanzine",
    headline: "GRASSROOTS: A supporters' fanzine becomes a local institution.",
    weight: 2,
    apply: (c) => {
      c.meters.fans = Math.min(100, c.meters.fans + 2);
      c.meters.soul = Math.min(100, c.meters.soul + 1);
    },
  },
  {
    id: "tv-cameo",
    headline: "SPOTLIGHT: Your ground features in a film. Tourists arrive.",
    weight: 1,
    cond: (s) => s.reach >= 40,
    apply: (c) => {
      c.meters.money = Math.min(100, c.meters.money + 3);
    },
  },
];

// Pick a weighted random eligible event for the current state. Returns null
// occasionally so not every gap has news.
export function rollEvent(state: EventState, rng: () => number): GameEvent | null {
  if (rng() < 0.35) return null; // quiet week
  const eligible = EVENTS.filter((e) => !e.cond || e.cond(state));
  const total = eligible.reduce((s, e) => s + e.weight, 0);
  let r = rng() * total;
  for (const e of eligible) {
    r -= e.weight;
    if (r <= 0) return e;
  }
  return eligible[0] || null;
}
