import type {
  Meters,
  Player,
  Founding,
  Delta,
  SeasonResult,
  SeasonReward,
  Scene,
  Choice,
  Mood,
  StadiumState,
  RunContext,
} from "./types";
import { REGIONS } from "./regions";
import { STORIES, RULES } from "./charter";
import { scenes } from "./scenes";

export const MAX_RULES = 3;
export const meterLabels: Record<string, string> = { money: "Money", soul: "Soul", fans: "Fans" };

// The technology timeline — the Civ-style spine. Each tech "arrives" at a
// scene that carries its tag, and stays unlocked for the rest of the game.
export const TECHS = [
  {
    key: "radio",
    name: "Radio",
    year: "1927",
    blurb: "A voice in the parlour. Your name leaves the district.",
    history:
      "Write the club's radio history here. The first crackling commentary that carried the score beyond the terraces — who called it, what they said, the night the whole town listened in.",
  },
  {
    key: "floodlights",
    name: "Floodlights",
    year: "1958",
    blurb: "Football after dark. Midweek crowds, new money.",
    history:
      "Write the floodlights history here. The first match under the lights, the midweek crowds it brought, what it cost and who paid for it.",
  },
  {
    key: "television",
    name: "Television",
    year: "1965",
    blurb: "The match becomes a broadcast. The gate becomes optional.",
    history:
      "Write the television history here. The first time the cameras carried the club to the country, what it did to the gate, and what it did to the soul of the place.",
  },
  {
    key: "data",
    name: "Data & analytics",
    year: "2015",
    blurb: "Every pass measured. The squad becomes a spreadsheet.",
    history:
      "Write the data & analytics history here. The first analyst in the building, the arguments it started, what the numbers saw that the eyes didn't.",
  },
  {
    key: "streaming",
    name: "Streaming",
    year: "2020",
    blurb: "The match goes direct. Anyone, anywhere, on any screen.",
    history:
      "Write the streaming history here. The club's own channel, the global audience it reached overnight, and the question of who the match is really for now.",
  },
] as const;

export function clamp(n: number): number {
  return Math.max(0, Math.min(100, n));
}

export function strength(squad: Player[]): number {
  return squad.reduce((s, p) => s + p.rating, 0);
}

// 20-player squads: typical ~215 str. Steep curve, cap at 50%.
export function titleChance(s: number): number {
  return Math.min(0.5, Math.max(0.03, (s - 160) / 280));
}

// The manager's tactical style nudges the odds. An optional rng lets seeded
// mode produce a deterministic century; defaults to Math.random.
export function playSeason(squad: Player[], oddsMod = 1, rng: () => number = Math.random): SeasonResult {
  const s = strength(squad);
  const chance = Math.min(0.6, titleChance(s) * oddsMod);
  const roll = rng();
  const won = roll < chance;
  const nearMiss = !won && roll < chance + 0.18;
  return { won, nearMiss, chance, strength: s };
}

// Season result feeds back into money and fans. Fans now swing harder with
// results, and the swing scales with how big the club has grown (reach): a
// title at a global club brings a flood; a barren decade quietly empties the
// terraces. Winning football is a real lever now, not a rounding error.
export function seasonRewards(r: SeasonResult, reach = 0): SeasonReward {
  // Bigger clubs see bigger crowds move. 0 reach -> x1, 100 reach -> x2.
  const scale = 1 + reach / 100;
  if (r.won) {
    return {
      money: +8,
      fans: Math.round(11 * scale),
      label: "Champions",
      cls: "win",
    };
  }
  if (r.nearMiss) {
    return {
      money: +1,
      fans: Math.round(6 * scale),
      label: "A thrilling near-miss",
      cls: "win",
    };
  }
  if (r.chance < 0.1) {
    return {
      money: 0,
      fans: -Math.round(7 * scale),
      label: "A wretched season",
      cls: "lose",
    };
  }
  // A flat mid-table year now costs a couple of fans: standing still bleeds you.
  return { money: 0, fans: -Math.round(2 * scale), label: "Mid-table", cls: "lose" };
}

// ---- Fan mood: a rolling read of RECENT form ----
// form decays toward zero each season, so the meter tracks the last handful of
// years rather than the whole century. A title run lifts the mood; a barren
// decade lets it sink back. Updated via nextForm() once per season.
export function nextForm(prev: number, delta: number): number {
  // 0.78 decay keeps roughly the last ~4-5 seasons in view.
  const decayed = prev * 0.78 + delta;
  return Math.max(-6, Math.min(8, decayed));
}

export function moodFromForm(form: number): Mood {
  if (form <= -3) return "furious";
  if (form < -0.5) return "restless";
  if (form < 1.5) return "content";
  if (form < 3.5) return "buoyant";
  return "ecstatic";
}

export const MOOD_LABEL: Record<Mood, string> = {
  furious: "Furious",
  restless: "Restless",
  content: "Content",
  buoyant: "Buoyant",
  ecstatic: "Ecstatic",
};

export const MOOD_COLOR: Record<Mood, string> = {
  furious: "#d9472e",
  restless: "#e0a93a",
  content: "#7e9173",
  buoyant: "#6fd06a",
  ecstatic: "#f2c14e",
};

// How a season's result moves the form score.
export function formDelta(r: SeasonResult): number {
  if (r.won) return 2;
  if (r.nearMiss) return 1;
  if (r.chance < 0.1) return -2;
  return -0.5;
}

// Age the squad eight years, drop the worn-out, and bring through four youth
// whose quality scales with soul (the academy) and money (the facilities).
// Story tags are cleared and reassigned each era: the top new youth is the
// prospect, the best local senior is the captain, the oldest local is the veteran.
export function passEra(
  squad: Player[],
  meters: Meters,
  region: string,
  nameCounter: { i: number },
  youthBonus = 0
): Player[] {
  const aged = squad
    .map((p) => {
      const np: Player = { ...p, age: p.age + 8, storyTag: undefined };
      if (np.age > 30) np.rating -= 3;
      return np;
    })
    .filter((p) => p.age <= 36 && p.rating > 0);

  const youthRating = Math.round(8 + (meters.soul / 100) * 6 + (meters.money / 100) * 3) + youthBonus;
  const pool = REGIONS[region].youthPool;
  const newYouth: Player[] = [];
  for (let i = 0; i < 4; i++) {
    newYouth.push({
      name: pool[nameCounter.i++ % pool.length],
      age: 19,
      rating: Math.max(6, youthRating + (i === 0 ? 1 : 0)),
      foreign: false,
    });
  }

  // Top new youth (highest-rated, gets the +1 bonus) becomes the prospect.
  if (newYouth.length > 0) newYouth[0].storyTag = "prospect";

  // Oldest surviving local player becomes the veteran (if 32+).
  const oldLocals = aged.filter((p) => !p.foreign && p.age >= 32);
  if (oldLocals.length > 0) {
    oldLocals.reduce((a, b) => (a.age >= b.age ? a : b)).storyTag = "veteran";
  }

  // Best local senior player who isn't already tagged becomes the captain.
  const captainPool = aged.filter((p) => !p.foreign && !p.storyTag);
  if (captainPool.length > 0) {
    captainPool.reduce((a, b) => (a.rating >= b.rating ? a : b)).storyTag = "captain";
  }

  return [...aged, ...newYouth];
}

// Derive how the stadium should be drawn from accumulated decision flags and
// the era. The ground reacts to the player, not the clock: each decision bolts
// a new visible feature onto the structure, the way the floodlights do.
export function deriveStadium(state: {
  era: number;
  rebuilt: boolean;
  newStand: boolean;
  movedOut: boolean;
  corporate: boolean;
  lights: boolean;
  radio: boolean;
  tv: boolean;
}): StadiumState {
  // Material grows slowly with the century, then decisions override it.
  // era 0-1: open wooden bleachers. ~era 2: a covered wooden stand.
  // ~era 3: brick terrace. The rebuild puts up concrete; the fund, glass.
  let material: StadiumState["material"] = "bleacher";
  if (state.era >= 2) material = "wood";
  if (state.era >= 3) material = "brick";
  if (state.rebuilt || state.newStand) material = "concrete";
  if (state.corporate) material = "glass";

  // Roof follows the material, unless rebuilt/corporate upgrade it.
  let roof: StadiumState["roof"] = "none";
  if (material === "wood") roof = "wood";
  if (material === "brick") roof = "pitch";
  if (material === "concrete") roof = "cantilever";
  if (material === "glass") roof = "glass";

  const tiers = state.newStand || state.corporate ? 2 : 1;

  // Keep `built` as a coarse 0-3 for any code that still wants a single number.
  const built = material === "glass" ? 3 : material === "concrete" ? 2 : material === "brick" ? 1 : 0;

  return {
    built,
    material,
    roof,
    tiers,
    movedOut: state.movedOut,
    corporate: state.corporate,
    lights: state.lights,
    radio: state.radio,
    tv: state.tv,
  };
}

// Founding modifiers stack on top of a raw delta: region, then story, then
// every sworn rule. They amplify costs and reward holding the line.
export function applyModifiers(delta: Delta, tags: string[], founding: Founding): void {
  if (founding.region) REGIONS[founding.region].mod(delta, tags);
  if (founding.story) STORIES[founding.story].mod(delta, tags);
  founding.rules.forEach((k) => RULES[k].mod(delta, tags));
}

export function ruleNames(founding: Founding): string {
  return founding.rules.map((k) => RULES[k].name).join(", ");
}

export function cultureLabel(n: number): string {
  if (n <= -30) return "Deep roots";
  if (n <= -10) return "Community club";
  if (n <= 10) return "The long middle";
  if (n <= 30) return "Upwardly mobile";
  return "Corporate drift";
}

// How a scene choice shifts the culture axis. Commercial/ownership moves right;
// community-hold choices move left. Capped so no single scene swings it too far.
export function cultureDelta(tags: string[]): number {
  let d = 0;
  for (const t of tags) {
    if (t.endsWith("-hold")) d -= 8;
    else if (["commercial", "outsider", "ownership", "move", "glamour"].includes(t)) d += 8;
  }
  return Math.max(-20, Math.min(20, d));
}

// A choice shows only if it has no cond, or its cond is true for this charter.
export function visibleChoices(s: Scene): Choice[] {
  return s.ch.map((o, i) => ({ ...o, _idx: i })).filter((o) => !o.cond || o.cond());
}

// Preview the meter change a choice would make, WITHOUT mutating game state.
// Runs the choice against throwaway copies of the current meters/squad, then
// applies the same founding modifiers chooseOption() uses, so the arrows on the
// buttons match exactly what the click will do. Squad/flag side-effects are
// swallowed — we only care about the money/soul/fans delta here.
export function previewChoice(
  choice: Choice,
  meters: Meters,
  squad: Player[],
  founding: Founding
): Delta {
  const before: Meters = { ...meters };
  const workingMeters: Meters = { ...meters };
  const workingSquad: Player[] = [...squad];
  const ctx: RunContext = {
    meters: workingMeters,
    squad: workingSquad,
    addPlayer: (p) => workingSquad.push(p),
    removeBestLocal: () => {},
    boostUnder: () => {},
    setFlag: () => {},
  };
  try {
    choice.run(ctx);
  } catch {
    // A choice's run() may touch squad helpers we stubbed; meters still resolve.
  }
  const delta: Meters = {
    money: workingMeters.money - before.money,
    soul: workingMeters.soul - before.soul,
    fans: workingMeters.fans - before.fans,
  };
  applyModifiers(delta, choice.tags || [], founding);
  return delta;
}

export interface EndingCopy {
  title: string;
  body: string;
  caption: string;
}

export function computeEnding(
  meters: Meters,
  founding: Founding,
  trophies: number,
  charterBroken: boolean
): EndingCopy {
  const r = REGIONS[founding.region as string];
  const s = STORIES[founding.story as string];
  let t: string;
  let b: string;
  const dead = meters.soul <= 0 ? "soul" : meters.money <= 0 ? "money" : meters.fans <= 0 ? "fans" : null;

  if (dead) {
    t = "The club did not survive the century.";
    b = `You ran out of ${dead}. A century needs all of it.`;
  } else if (!charterBroken && trophies >= 2) {
    t = "You won, and you stayed yourselves.";
    b = `${trophies} titles, every one true to the charter. The rarest ending for a ${s.name} in a ${r.name}.`;
  } else if (!charterBroken) {
    t = "You kept the charter.";
    b = `Only ${trophies} title${trophies === 1 ? "" : "s"} in a hundred years. But this ${s.name} is still what the founders made it. The rule held.`;
  } else if (trophies >= 3) {
    t = "You won everything. You are no longer yourselves.";
    b = `${trophies} titles bought with compromises. The charter is a framed relic. The ${r.name} you were belongs to another century.`;
  } else {
    t = "You broke the charter and won little anyway.";
    b = `You spent the soul of a ${s.name} chasing the dice, and the dice didn't care. ${trophies} title${trophies === 1 ? "" : "s"}, and nothing left that made you different.`;
  }

  return {
    title: t,
    body: b,
    caption: `${r.place} · ${s.name} · Charter: ${ruleNames(founding)}`,
  };
}

export { scenes, REGIONS, STORIES, RULES };
