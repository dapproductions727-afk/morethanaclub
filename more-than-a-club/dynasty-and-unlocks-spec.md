# Retention spec: visible unlocks + dynasty inheritance

Implementation brief for *More Than a Club*. Written against the current codebase
(`more-than-a-club/`). Two features:

1. **Visible unlocks** — the player always sees the next thing they're playing toward, and locked founding content shows up greyed with its unlock condition.
2. **Dynasty inheritance** — each finished century is recorded, shown on a "Your clubs" wall, and the *last* run reshapes the *next* run's world (league, era pressure, and a starting bump or curse).

Both are localStorage-only, client-side, and compatible with the static export. No backend.

The decisions already made: full dynasty inheritance (not just a hall, not just a rival echo), locked content shown with hints (not hidden), and this is a spec to implement yourself in VS Code.

---

## Part 0 — What already exists (don't rebuild it)

Read these before starting; the features bolt onto them.

- `lib/progress.ts` — `ACHIEVEMENTS[]`, `recordRun()`, `getUnlockedAchievements()`, and a **`UNLOCKS` map that already gates `story:dynasty` and `rule:europe` behind achievements**. This map is currently defined but never read anywhere. Feature 1 wires it in.
- `lib/savegame.ts` — the mid-run save pattern (versioned, SSR-guarded localStorage). Copy this exact shape for the two new stores.
- `lib/seed.ts` — `mulberry32`, `seedFromString`, `seededFounding`. The dynasty world-seeding reuses these.
- `lib/rivals.ts` — `RIVALS[]`, `leagueTable()`, `playerPosition()`. Feature 2 injects a dynastic rival here.
- `app/page.tsx` — `BootScreen`, `FoundingScreen`, `EndingScreen`, and `finalizeRun()` / `recordRun()` call site. All wiring lands here.
- `lib/charter.ts` — `STORIES` and `RULES` maps. The locked `dynasty` story and `europe` rule must exist as real entries here for feature 1 to surface them (verify; add if missing).

**localStorage key discipline:** existing keys are `mtac-progress-v1` and `mtac.savegame.v1`. New keys: `mtac.lastrun.v1` (feature 1 hint + feature 2 inheritance) and `mtac.dynasty.v1` (the clubs wall). Bump the `vN` suffix if you change a shape rather than migrating.

---

## Part 1 — Visible unlocks

### 1A. Record last run's "near-miss" data

The sharp hint ("you won 1 title last run, need 2") needs the previous run's summary persisted. Add to `lib/progress.ts`:

```ts
const LAST_KEY = "mtac.lastrun.v1";

export interface LastRun {
  founding: Founding;
  trophies: number;
  charterBroken: boolean;
  survived: boolean;
  bestPosition: number;
  movedOut: boolean;
  corporate: boolean;
  endingTitle: string;   // from computeEnding().title
  soul: number; fans: number; money: number;
  endedAt: number;       // Date.now()
}

export function readLastRun(): LastRun | null { /* SSR-guarded JSON.parse, same as read() */ }
export function writeLastRun(r: LastRun): void { /* SSR-guarded, same as write() */ }
```

Write it inside `recordRun()` (or right after it in `finalizeRun()`), so it captures every finished century. `finalizeRun()` in `page.tsx` already has `end`, `summary`, `finalMeters` in scope — pass `end.title` in as `endingTitle`.

### 1B. "Next unlock" computation

Add to `lib/progress.ts` a function that returns the single most motivating locked achievement plus a personalised hint from last run:

```ts
export interface NextUnlock {
  achievement: Achievement;
  hint: string;            // personalised, e.g. "You won 1 title last run — need 2 with the charter intact."
  unlocksLabel?: string;   // if this achievement gates content via UNLOCKS
}

export function nextUnlock(): NextUnlock | null {
  const have = new Set(getUnlockedAchievements());
  const locked = ACHIEVEMENTS.filter(a => !have.has(a.key));
  if (locked.length === 0) return null;
  const last = readLastRun();
  // Rank locked achievements by "closeness" using last run. See hint table below.
  // Pick the closest; build its hint; attach UNLOCKS[a.key]?.label if present.
}
```

**Hint table** (one line per achievement; fall back to `a.desc` if no last run):

| Achievement key | Closeness signal from last run | Example hint |
|---|---|---|
| `first-century` | `!last.survived` | "Last century, the club died. Just survive a hundred years." |
| `true-believer` | `last.survived && !last.charterBroken && trophies < 2` | "You won {trophies} title(s) last run with the charter intact — need 2." |
| `kept-the-faith` | `last.charterBroken` | "You broke the charter last run. Reach the end without breaking it." |
| `sold-the-soul` | `last.charterBroken && trophies < 4` | "You broke the charter and won {trophies} — need 4 to make it worth it." |
| `stayed-home` | `last.movedOut || last.corporate` | "You {moved the ground / sold out} last run. Finish without doing either." |
| `champions` | `last.bestPosition > 1` | "Best finish last run: {bestPosition}. Top the table." |
| `purist-hard` | `last.founding.rules.length < 3 || last.charterBroken` | "Swear all three charter rules and keep them." |
| `hostile-state` | `last.founding.region !== "capital"` | "Found a capital-city club and survive with the charter intact." |

"Closeness" ranking heuristic: prefer achievements where last run was *one condition away* (e.g. survived + pure + trophies===1 for `true-believer`) over ones needing a whole different run. Simple scoring: +3 if all-but-one condition met, +1 if region/setup matches, 0 otherwise. Pick the max; tie-break by `ACHIEVEMENTS` order.

### 1C. Boot screen — show it

In `BootScreen` (`page.tsx`), replace the bare count line:

```tsx
{unlocked.length > 0 && (
  <div className="bootach pix">{unlocked.length} / {ACHIEVEMENTS.length} achievements earned</div>
)}
```

with a panel that keeps the count **and** adds the next-unlock nudge:

```tsx
const next = nextUnlock();
// ...
<div className="bootach pix">{unlocked.length} / {ACHIEVEMENTS.length} earned</div>
{next && (
  <div className="nextunlock">
    <span className="nu-label pix">NEXT</span>
    <span className="nu-name">{next.achievement.name}</span>
    <span className="nu-hint">{next.hint}</span>
    {next.unlocksLabel && <span className="nu-reward">Unlocks: {next.unlocksLabel}</span>}
  </div>
)}
```

This is the core retention lever: a specific, personalised reason to press "Found a club" *right now*. Keep it to **one** unlock — a list of eight dilutes the pull.

### 1D. Founding screen — locked content, shown with hints

The decision: locked options appear greyed with their condition, not hidden.

1. **Verify `dynasty` (story) and `europe` (rule) exist in `lib/charter.ts`.** They're referenced by `UNLOCKS` (`story:dynasty`, `rule:europe`) but the founding screen only renders `Object.keys(STORIES)` / `Object.keys(RULES)`. If they aren't real entries, add them — name, flavor, bonus, mod — so they can render.

2. Build a reverse lookup in `progress.ts`:

```ts
// Which content keys are locked, and what unlocks them.
export function lockedContent(): Record<string, { by: string; label: string }> {
  // returns e.g. { "story:dynasty": { by: "true-believer", label: "Win 2+ titles, charter intact" } }
  // for every UNLOCKS entry whose achievement isn't yet earned.
}
```

3. In `FoundingScreen`, when rendering a story/rule button, check if `"story:"+k` or `"rule:"+k` is locked. If so, render it disabled with a lock glyph and the condition as the `<small>`:

```tsx
const lockKey = (f.group === "story" ? "story:" : "rule:") + k;
const lock = locked[lockKey];
return (
  <button key={k} className={`c ${chosen ? "chosen" : ""} ${lock ? "locked" : ""}`}
          disabled={!!lock}
          onClick={() => !lock && onPick(f.group, k)}>
    {lock ? "🔒 " : chosen ? "✓ " : ""}{opt.name}
    <small>{lock ? lock.label : (opt.flavor || opt.note)}</small>
  </button>
);
```

(Region group has no locks today; the check is a no-op there.)

4. CSS in `globals.css`: `.c.locked { opacity: .5; cursor: not-allowed; filter: grayscale(1); }` and style `.nextunlock` / `.nu-*` to match the existing `.bootach` / `.panel` pixel aesthetic.

### 1E. Ending screen — announce content unlocks

`EndingScreen` already shows newly-earned achievements. Add: if a newly-earned achievement is a key in `UNLOCKS`, show a louder line — "★ NEW FOUNDING OPTION: The dynasty" — so the reward is legible at the moment it's won, not discovered later on the founding screen.

```tsx
const unlockedThisRun = (earned?.newlyEarned || [])
  .map(k => UNLOCKS[k]).filter(Boolean);
// render unlockedThisRun labels in a highlighted block above the achievement rows
```

---

## Part 2 — Dynasty inheritance

The premise: a century is never a clean slate. The club you built last run **persists into the world of the next run** — as a league rival, as era pressure, and as a starting bump or curse. This is the legacy fantasy the one-pager is chasing, made mechanical.

It reuses `readLastRun()` from Part 1A. No new persistence is needed for the *inheritance* itself; the **wall** (2D) needs its own append-only store.

### 2A. Derive an "inherited world" from last run

New module `lib/dynasty.ts`:

```ts
import type { LastRun } from "./progress";
import type { Meters } from "./types";

export interface Inheritance {
  rivalName: string;        // last club's name, returns as a rival
  rivalArc: number[];       // 15-era strength arc, shaped by how you left it
  rivalBlurb: string;       // "Sold to a fund in your last century. Now owns the league."
  startBump: Partial<Meters>;  // small bonus or curse to this run's starting meters
  eraPressureMod: number;   // multiplier on how hard the money era pushes (see 2C)
  flavorLine: string;       // one line shown on the founding summary screen
}

export function deriveInheritance(last: LastRun | null): Inheritance | null {
  if (!last) return null;
  // Branch on how the last club ended. Four archetypes mirror rivals.ts:
  //   corporate/movedOut  -> a "sellout" rival that dominates late + commercial pressure up
  //   charter held + survived -> a "purist" rival, beloved, weaker late; soul start +small
  //   died (!survived)    -> a "fallen" rival, collapses mid-century; money start -small (cautionary)
  //   default             -> "steady"
  // Name the rival after last.founding.region's place + a suffix, or reuse a stored club name.
}
```

**Inheritance archetypes (the heart of the feature):**

| Last run ended... | Returns as | Rival arc | This run's start | Era pressure |
|---|---|---|---|---|
| Sold out (`corporate`) or moved ground (`movedOut`) | The club that took the money | `sellout` arc (dominates after the TV era) | money **+6**, soul **−4** (you inherit a richer, hollower world) | commercial era pushes **harder** (×1.15) — the rug you set up |
| Survived, charter intact | The club that kept the faith | `purist` arc (strong early, fades) | soul **+6**, fans **+3** | normal |
| Club died (`!survived`) | A cautionary giant | `fallen` arc (overreaches, collapses ~mid) | money **−5** (lean inheritance) | normal |
| Otherwise (survived, charter broken, stayed put) | A steady mid-table presence | `steady` arc | none | normal |

Keep `startBump` **small** (±3–6 on one or two meters). It should *colour* the run, not decide it. This is the main balance lever — if dynasty runs feel easier/harder than fresh ones, shrink these first.

### 2B. Inject the dynastic rival into the league

`lib/rivals.ts` currently hard-codes three rivals. Make `leagueTable`, `playerPosition`, and the HUD accept an **optional extra rival** built from the inheritance:

```ts
export function dynastyRival(inh: Inheritance): Rival {
  return {
    key: "dynasty",
    name: inh.rivalName,
    archetype: "sellout", // or whatever deriveInheritance chose; store it on Inheritance
    blurb: inh.rivalBlurb,
    arc: inh.rivalArc,
  };
}
```

Then thread an optional `extraRivals: Rival[] = []` param through `leagueTable(playerName, playerStrength, era, extraRivals)` and `playerPosition(..., extraRivals)`. In `page.tsx`, build the dynasty rival once at run start from the inheritance and pass it in. **Important:** a four-rival league changes `playerPosition` (now 1st–5th) — check `bestPosition` logic and the `champions` achievement (`bestPosition === 1`) still behave. Top of a 5-club table is harder; that's intended (dynasty raises the bar) but confirm it's not impossible for the inherited "purist" arcs.

### 2C. Apply era pressure + start bump

- **Start bump:** in `beginCentury()` (`page.tsx`), after computing the base `setMeters({...})`, fold in `inheritance.startBump` with `clamp`. One line each for money/soul/fans.
- **Era pressure:** `eraPressureMod` multiplies the commercial temptation. Cleanest hook: in `applyModifiers` (or wherever `commercial`/`reach` deltas are scaled), multiply the commercial-tag swing by `eraPressureMod`. If that's too invasive, apply it more simply as a per-era money drift in `endOfEra()`. Pick the lighter touch.
- Surface the inheritance to the player: on `SummaryScreen`, add `inheritance.flavorLine` ("Across town, {rivalName} — {how you left them} — still casts a shadow.") so the player *sees* the continuity. Without this line the feature is invisible and most of its value is lost.

### 2D. The "Your clubs" wall

Append-only history, its own store. New module `lib/dynastyHistory.ts` (or extend `progress.ts`):

```ts
const DYNASTY_KEY = "mtac.dynasty.v1";

export interface ClubRecord {
  region: string; story: string; rules: string[];
  trophies: number; charterBroken: boolean; survived: boolean;
  endingTitle: string; soul: number; fans: number; money: number;
  foundedLabel: string;  // "Century I", "Century II"... = index+1 in roman
  endedAt: number;
}

export function appendClub(r: ClubRecord): void { /* read array, push, cap at ~20, write */ }
export function readClubs(): ClubRecord[] { /* SSR-guarded */ }
```

Call `appendClub` in `finalizeRun()` alongside `recordRun()`. On `BootScreen`, add a **"Your clubs"** entry that opens a panel (new lightweight `phase === "dynasty"` view, or a collapsible block) listing each past club: founding line + ending verdict + trophies + a ✓/✗ for charter held. This is the visible legacy — the wall that makes a player feel they're building across runs, not resetting.

Cap the list (~20) so localStorage and the panel stay bounded.

### 2E. Daily-challenge interaction

The seeded daily must stay identical for everyone — so **dynasty inheritance must NOT apply to seeded runs.** In `startSeeded()`, skip `deriveInheritance` (pass `null`). The daily already skips the mid-run save; this is the same principle. Do still `appendClub` a finished daily to the wall (mark it `seeded`), but don't let it seed the *next* run's world.

---

## Part 3 — Build order & test checklist

Recommended order (each step is independently testable):

1. **1A + 1B** — persist last run, compute `nextUnlock()`. Test: finish a run, reload, console-log `nextUnlock()`.
2. **1C** — boot screen nudge. Test: the hint reflects your actual last run.
3. **1D** — locked founding content. Test: a fresh profile (clear `mtac-progress-v1`) shows 🔒 on dynasty/europe; earning the gate removes it.
4. **1E** — ending unlock announcement.
5. **2A + 2D** — inheritance derivation + clubs wall (wall first, it's pure read/display and low-risk).
6. **2B + 2C** — inject rival, apply bump/pressure, surface flavor line. **Playtest balance here.**
7. **2E** — confirm daily is untouched by inheritance.

**Regression checks:**

- Static export still builds (`next build` with the existing `next.config.mjs` export settings) — all new localStorage access stays SSR-guarded.
- `playerPosition` with the extra rival doesn't break the `champions` achievement or `bestPosition` tracking.
- A brand-new player (no last run, empty stores) sees: no inheritance, no clubs wall, next-unlock falls back to `a.desc` hints. Nothing crashes on null.
- Clearing localStorage resets cleanly to a first-time experience.

**Balance levers, in order of likely adjustment:** `startBump` magnitudes (2A) → `eraPressureMod` (2C) → rival arcs (2A) → which achievement `nextUnlock` prioritises (1B).

---

## File-by-file summary

| File | Change |
|---|---|
| `lib/progress.ts` | + `LastRun` store, `readLastRun`/`writeLastRun`, `nextUnlock()`, `lockedContent()`; export `UNLOCKS` if not already |
| `lib/charter.ts` | verify/add `dynasty` story + `europe` rule entries |
| `lib/dynasty.ts` | **new** — `Inheritance`, `deriveInheritance()` |
| `lib/dynastyHistory.ts` | **new** (or fold into progress) — `ClubRecord`, `appendClub()`, `readClubs()` |
| `lib/rivals.ts` | `dynastyRival()`; optional `extraRivals` param on `leagueTable`/`playerPosition` |
| `app/page.tsx` | boot nudge (1C), locked founding (1D), ending unlock (1E), build+inject inheritance, start bump + flavor line, `appendClub` in `finalizeRun`, skip inheritance in `startSeeded` |
| `app/globals.css` | `.nextunlock`/`.nu-*`, `.c.locked`, clubs-wall panel styles |

No new dependencies. All client-side. Export-safe.
