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

// ---- Interactive mid-era events ----
// A fraction of between-season beats become decisions the player acts on,
// breaking up the quiet between the heavy century choices.

export interface EventOption {
  t: string;
  note: string;
  apply: (ctx: EventCtx) => void;
  tags?: string[];
  outcome: string;
}

export interface InteractiveEvent {
  id: string;
  sp: string;
  prompt: string;
  weight: number;
  cond?: (s: EventState) => boolean;
  options: [EventOption, EventOption];
}

const localLadNames = ["Brennan", "Osei", "Ribeiro", "Kowalski", "Hargreaves", "Flynn", "Ibáñez", "Mbeki"];
let ll = 0;
const proNames = ["Laurent", "Bauer", "Müller", "Novak", "Kompany", "Fernandes", "Reyes"];
let pr = 0;

export const INTERACTIVE_EVENTS: InteractiveEvent[] = [
  {
    id: "local-lad",
    sp: "The academy",
    prompt: "A boy from three streets away is ready for the first team, but he's raw. A proven signing would be safer.",
    weight: 3,
    options: [
      {
        t: "Blood the local lad.",
        note: "The crowd will love it. The results may not agree.",
        tags: [],
        apply: (c) => {
          c.meters.soul = Math.min(100, c.meters.soul + 5);
          c.meters.fans = Math.min(100, c.meters.fans + 3);
          c.addPlayer({ name: localLadNames[ll++ % localLadNames.length], age: 18, rating: 11, foreign: false });
        },
        outcome: "DEBUT: The local lad gets his chance. Three streets away, his family listen on the radio.",
      },
      {
        t: "Bring in the proven pro.",
        note: "Better odds immediately. Costs money. The fans won't feel the same about him.",
        tags: ["commercial"],
        apply: (c) => {
          c.meters.money = Math.max(0, c.meters.money - 5);
          c.meters.soul = Math.max(0, c.meters.soul - 2);
          c.addPlayer({ name: proNames[pr++ % proNames.length], age: 26, rating: 18, foreign: true });
        },
        outcome: "SIGNING: A proven professional arrives. The scouts are satisfied.",
      },
    ],
  },
  {
    id: "brewery-deal",
    sp: "The boardroom",
    prompt: "The shirt sponsor wants a five-year renewal — and their name on the east stand too. The money is significant.",
    weight: 2,
    cond: (s) => s.era >= 4,
    options: [
      {
        t: "Sign the extended deal.",
        note: "The brewery's name goes up. The money is real.",
        tags: ["commercial"],
        apply: (c) => {
          c.meters.money = Math.min(100, c.meters.money + 6);
          c.meters.soul = Math.max(0, c.meters.soul - 4);
        },
        outcome: "SPONSOR: The brewery's name goes up on the east stand. The chairman is pleased.",
      },
      {
        t: "Keep the stand clean.",
        note: "Turn down the money. The ground stays yours.",
        tags: [],
        apply: (c) => {
          c.meters.money = Math.max(0, c.meters.money - 2);
          c.meters.soul = Math.min(100, c.meters.soul + 3);
        },
        outcome: "DECLINED: The stand stays nameless. A smaller offer is found elsewhere.",
      },
    ],
  },
  {
    id: "ticket-price",
    sp: "The turnstiles",
    prompt: "Costs are up. The board wants to raise the gate price. The away end won't notice; the home end will.",
    weight: 3,
    options: [
      {
        t: "Raise the prices.",
        note: "Money comes in. The regulars feel it.",
        apply: (c) => {
          c.meters.money = Math.min(100, c.meters.money + 5);
          c.meters.fans = Math.max(0, c.meters.fans - 5);
        },
        outcome: "PRICES: The gate goes up. A few familiar faces start coming less often.",
      },
      {
        t: "Hold the line.",
        note: "A short-term cost. The home end remembers.",
        apply: (c) => {
          c.meters.money = Math.max(0, c.meters.money - 3);
          c.meters.fans = Math.min(100, c.meters.fans + 4);
          c.meters.soul = Math.min(100, c.meters.soul + 2);
        },
        outcome: "HELD: The prices stay where they are. The home end sings a little louder.",
      },
    ],
  },
  {
    id: "fans-protest",
    sp: "The terraces",
    prompt: "A supporters' group is planning a walkout over the direction of the club. The cameras will be there.",
    weight: 2,
    cond: (s) => s.era >= 6,
    options: [
      {
        t: "Meet them. Make a concession.",
        note: "Costs something. Buys something back.",
        apply: (c) => {
          c.meters.money = Math.max(0, c.meters.money - 4);
          c.meters.fans = Math.min(100, c.meters.fans + 6);
          c.meters.soul = Math.min(100, c.meters.soul + 3);
        },
        outcome: "MEETING: The chairman sits down with the supporters. A statement is agreed.",
      },
      {
        t: "Ride it out.",
        note: "The cameras will move on. Some of the fans may not.",
        apply: (c) => {
          c.meters.fans = Math.max(0, c.meters.fans - 5);
          c.meters.soul = Math.max(0, c.meters.soul - 2);
        },
        outcome: "WALKOUT: The supporters leave at half-time. The footage runs on the evening news.",
      },
    ],
  },
  {
    id: "wage-demand",
    sp: "The dressing room",
    prompt: "Your best player's agent wants a deal that breaks the wage structure. Pay it or risk losing him.",
    weight: 2,
    options: [
      {
        t: "Pay it. Keep him.",
        note: "The wage structure buckles. He stays.",
        apply: (c) => {
          c.meters.money = Math.max(0, c.meters.money - 6);
        },
        outcome: "CONTRACT: He signs. Everyone else's agent makes a note of the number.",
      },
      {
        t: "Hold the line.",
        note: "He's unsettled. His performances show it.",
        apply: (c) => {
          let best = -1;
          let bestR = -1;
          c.squad.forEach((p, i) => {
            if (p.rating > bestR) { bestR = p.rating; best = i; }
          });
          if (best >= 0) c.squad[best].rating = Math.max(4, c.squad[best].rating - 4);
        },
        outcome: "STANDOFF: The deal goes unsigned. He is still here, but he is somewhere else.",
      },
    ],
  },
  {
    id: "tour-abroad",
    sp: "The phone",
    prompt: "A lucrative pre-season tour overseas is on offer. Good money, but it's the players' only proper rest.",
    weight: 2,
    cond: (s) => s.reach >= 30,
    options: [
      {
        t: "Take the tour.",
        note: "The money is real. The players will be tired.",
        tags: ["commercial"],
        apply: (c) => {
          c.meters.money = Math.min(100, c.meters.money + 6);
          c.meters.fans = Math.max(0, c.meters.fans - 2);
          c.meters.soul = Math.max(0, c.meters.soul - 2);
        },
        outcome: "TOUR: The squad flies out. Photographs of the pitch in the heat. The money clears.",
      },
      {
        t: "Stay home and rest.",
        note: "The money walks. The players come back sharp.",
        apply: (c) => {
          c.meters.money = Math.max(0, c.meters.money - 2);
          c.meters.fans = Math.min(100, c.meters.fans + 2);
        },
        outcome: "PRESEASON: The squad trains at home. Nobody is photographed in front of a skyline.",
      },
    ],
  },
  {
    id: "old-stand",
    sp: "The ground",
    prompt: "The oldest stand in the ground is crumbling. Patch it cheap and move on, or do it properly and feel the cost.",
    weight: 2,
    cond: (s) => s.era >= 5,
    options: [
      {
        t: "Patch it. Keep it standing.",
        note: "Short-term fix. It'll need more work by the next era.",
        apply: (c) => {
          c.meters.money = Math.max(0, c.meters.money - 2);
          c.meters.soul = Math.max(0, c.meters.soul - 2);
        },
        outcome: "PATCH: The stand gets its temporary reprieve. The sightlines are still bad.",
      },
      {
        t: "Restore it properly.",
        note: "A significant cost. Worth it if it lasts another fifty years.",
        apply: (c) => {
          c.meters.money = Math.max(0, c.meters.money - 6);
          c.meters.soul = Math.min(100, c.meters.soul + 5);
          c.meters.fans = Math.min(100, c.meters.fans + 3);
        },
        outcome: "RESTORED: The old stand comes back better than it was. The oldest members approve.",
      },
    ],
  },
  {
    id: "youth-coach",
    sp: "The academy",
    prompt: "A respected old coach will work for nothing if you promise to keep faith with academy players.",
    weight: 2,
    options: [
      {
        t: "Make the promise.",
        note: "He believes you. The academy believes him.",
        apply: (c) => {
          c.meters.soul = Math.min(100, c.meters.soul + 5);
          c.meters.money = Math.min(100, c.meters.money + 2);
          c.boostUnder(21, 1);
        },
        outcome: "APPOINTED: The old coach takes the academy sessions. The young ones are paying attention.",
      },
      {
        t: "Keep your options open.",
        note: "He'll understand. He's heard it before.",
        apply: (c) => {
          c.meters.soul = Math.max(0, c.meters.soul - 1);
        },
        outcome: "PASSED: The offer is declined politely. He finds somewhere else.",
      },
    ],
  },
];

export function rollInteractive(state: EventState, rng: () => number): InteractiveEvent | null {
  const eligible = INTERACTIVE_EVENTS.filter((e) => !e.cond || e.cond(state));
  if (eligible.length === 0) return null;
  const total = eligible.reduce((s, e) => s + e.weight, 0);
  let r = rng() * total;
  for (const e of eligible) {
    r -= e.weight;
    if (r <= 0) return e;
  }
  return eligible[0] ?? null;
}
