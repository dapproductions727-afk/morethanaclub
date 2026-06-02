// Core types for the game state and content.

export type MeterKey = "money" | "soul" | "fans";

export interface Meters {
  money: number;
  soul: number;
  fans: number;
}

export interface Player {
  name: string;
  age: number;
  rating: number;
  foreign: boolean;
}

export type Delta = Partial<Meters>;

// A modifier mutates a delta in place, optionally reading the active charter tags.
export type Modifier = (d: Delta, tags: string[]) => void;

export interface Region {
  name: string;
  place: string;
  flavor: string;
  start: Meters;
  squad: Player[];
  youthPool: string[];
  mod: Modifier;
}

export interface Story {
  name: string;
  flavor: string;
  bonus: Delta;
  mod: Modifier;
}

export interface Rule {
  name: string;
  note: string;
  bonus: Delta;
  mod: Modifier;
}

export interface Choice {
  t: string;
  note: string | (() => string);
  tags: string[];
  conflict?: boolean;
  cond?: () => boolean;
  // optional stadium/visual effect applied when this choice is picked
  fx?: ChoiceFx;
  // run mutates meters/squad directly through the provided context.
  run: (ctx: RunContext) => void;
  _idx?: number;
}

export interface Scene {
  sp: string;
  year: string;
  seasons: number;
  // tech unlocked when the player enters this era, if any
  tech?: string;
  // if set, this era's season run-through includes a tap-to-play match moment
  bigMatch?: BigMatch;
  pr: string | (() => string);
  ch: Choice[];
}

// A choice can carry stadium effects, applied when picked, that change how the
// ground is drawn for the rest of the game.
export type StadiumFx = "rebuild" | "moveOut" | "sellToFund" | "newStand" | "grow";

export interface ChoiceFx {
  stadium?: StadiumFx;
}

// Context passed into a choice's run() so it can mutate live game state.
export interface RunContext {
  meters: Meters;
  squad: Player[];
  addPlayer: (p: Player) => void;
  removeBestLocal: () => void;
  boostUnder: (age: number, by: number) => void;
  setFlag: (k: FlagKey, v: boolean) => void;
}

export type FlagKey = "charterBroken" | "defiedBan";

// ---- Stadium state: the ground reacts to decisions, not just the clock ----
export interface StadiumState {
  built: number; // 0 wooden, 1 brick terrace, 2 concrete bowl, 3 glass cathedral
  movedOut: boolean; // demolished old ground, built out of town
  corporate: boolean; // sold to the fund: signage, sterile bowl
  lights: boolean; // floodlights unlocked
}

// ---- Fan mood: recent form colours the crowd and the writing ----
export type Mood = "furious" | "restless" | "content" | "buoyant" | "ecstatic";

export interface Manager {
  key: string;
  name: string;
  style: string;
  blurb: string;
  // multiplier on title chance
  oddsMod: number;
  // youth development bonus added to incoming youth rating each era
  youthBonus: number;
  // flat soul/fans nudge per era the manager is in post
  soulPerEra: number;
  fansPerEra: number;
}

export interface BigMatch {
  kind: string; // "Cup final", "Relegation decider", "Title decider"
  setup: string; // one line of pixel drama
  // base chance the moment succeeds before the player's tap timing
  prompt: string; // what the tap does
  rewardWin: { fans: number; money: number; soul: number; trophy?: boolean };
  rewardLose: { fans: number; money: number; soul: number };
}

export interface Founding {
  region: string | null;
  story: string | null;
  rules: string[];
}

export interface SeasonResult {
  won: boolean;
  nearMiss: boolean;
  chance: number;
  strength: number;
}

export interface SeasonReward {
  money: number;
  fans: number;
  label: string;
  cls: "win" | "lose";
}
