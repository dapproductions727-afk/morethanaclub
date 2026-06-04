# Mid-era interactive events spec

Implementation brief for *More Than a Club*. Fixes the loudest structural complaint a regular player would have: **the quiet middle.** Between the 12–15 heavy century decisions, the player taps "Play season" and watches odds resolve — dead air. This adds a small interactive choice *between seasons*, so the player is acting, not just reading, in the gaps.

Key design call: **this is not a new system.** The game already has a passive between-seasons event system (`lib/events.ts` → `rollEvent`, fired inside `playOneSeason` in `app/page.tsx`). It currently picks a weighted random event, applies its effect silently, and pushes a headline to the news ticker. This spec turns a *fraction* of those events into **interactive** ones the player decides on. Reusing the existing weighting, conditions, and `EventCtx` keeps the build small and the balance familiar.

This is a spec to implement yourself in VS Code. No new dependencies, client-side only, export-safe.

---

## Part 0 — What exists today (the foundation)

- `lib/events.ts` — `GameEvent` (id, headline, weight, optional `cond`, `apply(ctx)`), the `EVENTS[]` array (~10 events), and `rollEvent(state, rng)` which returns one eligible weighted event or `null` (~35% "quiet week"). Effects mutate meters/squad through `EventCtx`.
- `app/page.tsx` → `playOneSeason()` — after computing season rewards, calls `rollEvent({ era, meters, trophies, reach }, seedRng.current)`, applies it via an `EventCtx` built on local `nextMeters`/`nextSquad`, and sets a `newsLine`. **This is the single hook point.**
- The `Phase` type and the phase-switching render block in `page.tsx` — the new interactive event reuses this pattern (cf. how `pressure` and `mgrEvent` phases already pause the loop for a decision card).
- `PressureCard` / `ManagerEventCard` — existing two-choice decision cards. The new `EventChoiceCard` is the same shape; copy it.

The important property to preserve: **mid-era events must stay light.** The file comment says "none should swing the century, only flavour a decade." Interactive ones can have slightly more weight than passive ones (the player chose, so it should matter a little more) but still small — single-digit meter swings, not era-deciding.

---

## Part 1 — Data model: interactive events

Extend `lib/events.ts` with a second event type that sits alongside `GameEvent`. Don't overload the existing one — passive flavour events should stay one-liners.

```ts
export interface EventOption {
  t: string;                       // button label
  note: string;                    // the <small> consequence hint
  apply: (ctx: EventCtx) => void;  // mutates meters/squad, same ctx as passive events
  tags?: string[];                 // optional: "commercial" | "community" so culture axis + modifiers apply
  outcome: string;                 // ticker line AFTER the choice ("SPONSOR: the brewery's name goes up.")
}

export interface InteractiveEvent {
  id: string;
  sp: string;                      // card sub-heading, e.g. "The boardroom"
  prompt: string;                  // the situation, 1–2 sentences
  weight: number;
  cond?: (s: EventState) => boolean;
  options: [EventOption, EventOption];  // exactly two — keep it Reigns-tight
}

export const INTERACTIVE_EVENTS: InteractiveEvent[] = [ /* see Part 3 */ ];
```

Note `tags` on options: the engine already has `applyModifiers(delta, tags, founding)` and a `cultureDelta(tags)` for the community↔commercial axis (used by the big scene choices). Wiring tags through here means a mid-era "take the sponsor" nudges the culture meter just like a big commercial decision would — consistency for free. If that's too much for v1, omit tags and apply raw effects; add tags later.

---

## Part 2 — The roll: decide passive vs interactive

Add a second roller, leaving `rollEvent` untouched:

```ts
export function rollInteractive(state: EventState, rng: () => number): InteractiveEvent | null {
  const eligible = INTERACTIVE_EVENTS.filter((e) => !e.cond || e.cond(state));
  if (eligible.length === 0) return null;
  const total = eligible.reduce((s, e) => s + e.weight, 0);
  let r = rng() * total;
  for (const e of eligible) { r -= e.weight; if (r <= 0) return e; }
  return eligible[0] ?? null;
}
```

**Frequency tuning (the core lever).** The point is to break up the quiet, not to drown the player in pop-ups. Recommended: an interactive event can fire only on a season that *isn't* the era's final season (the last season may trigger the big-match moment — don't stack two interrupts), and only when no passive event already fired, at roughly a **1-in-4 chance per eligible mid-season**. Concretely, in `playOneSeason`:

```ts
// after the passive rollEvent block, before committing state:
const canInteract = !isLast && !newsLine && seedRng.current() < 0.25;
if (canInteract) {
  const ie = rollInteractive({ era: current, meters: nextMeters, trophies, reach: nextReach }, seedRng.current);
  if (ie) {
    // stash the in-progress season state, then pause for the decision (Part 4)
  }
}
```

Tune the `0.25` first if it feels too sparse or too busy. Over a ~5-season era the player should hit one or two interactive beats, not zero and not five.

---

## Part 3 — Starter content (8 interactive events)

Written in the game's voice; each is a small, genuine dilemma with no free-lunch option. Effects are deliberately modest (±3 to ±6). Expand later — the system scales by adding array entries.

1. **The local lad** — *sp: "The academy"* — "A boy from three streets away is ready for the first team, but he's raw. A proven signing would be safer." → **Blood the local lad** (soul +5, fans +3, short-term squad dip: `boostUnder` does nothing; instead a low-rated local player added) / **Buy the safe pro** (money −5, squad strength up, soul −2). *tags: community / commercial.*

2. **The brewery's bigger offer** — *sp: "The boardroom"* — cond era ≥ 4 — "The shirt sponsor wants a five-year deal and their logo on the stand too." → **Sign it** (money +6, soul −4, tags commercial) / **Keep the stand clean** (money −2, soul +3, tags community).

3. **The ticket price** — *sp: "The turnstiles"* — "Costs are up. The board wants to raise the gate price. The away end won't notice; the home end will." → **Raise prices** (money +5, fans −5) / **Hold them** (money −3, fans +4, soul +2).

4. **The fans' protest** — *sp: "The terraces"* — cond era ≥ 6 — "A supporters' group is planning a walkout over the direction of the club. The cameras will be there." → **Meet them, make a concession** (money −4, fans +6, soul +3) / **Ride it out** (fans −5, money +0, soul −2).

5. **The wage demand** — *sp: "The dressing room"* — "Your best player's agent wants a deal that breaks the wage structure. Pay it or risk losing him." → **Pay it** (money −6, squad holds) / **Hold the line** (money +0, lose a few rating points off the top player — use the `injury`-style top-player knock).

6. **The friendly abroad** — *sp: "The phone"* — cond reach ≥ 30 — "A lucrative pre-season tour overseas is on offer. Good money, but it's the players' only rest." → **Take the tour** (money +6, fans −2, form/soul −2) / **Stay home and rest** (money −2, fans +2).

7. **The old stand** — *sp: "The ground"* — cond era ≥ 5 — "The oldest stand is crumbling. Patch it cheap, or do it properly and feel the cost." → **Patch it** (money −2, soul −2) / **Restore it properly** (money −6, soul +5, fans +3).

8. **The youth coach** — *sp: "The academy"* — "A respected old coach will work for nothing if you promise to keep faith with academy players." → **Make the promise** (soul +5, money +2, a future `boostUnder(21, +1)` flavour) / **Keep your options open** (no change, soul −1).

Voice rule: every option's `note` states the cost *and* the gain plainly ("Money back, but the home end remembers"). No option should read as obviously correct — that's what makes the tap a decision, not a formality.

---

## Part 4 — Wiring the pause into the season loop

The challenge: `playOneSeason` runs synchronously and ends by either continuing or calling `endOfEra`. An interactive event has to **pause** mid-loop, wait for the player, then resume. Mirror exactly how `pendingPressure` / `pendingMgrEvt` already work.

1. **New phase + state** in `page.tsx`:
   ```ts
   type Phase = ... | "eraEvent";
   const [pendingEraEvt, setPendingEraEvt] = useState<InteractiveEvent | null>(null);
   ```

2. **In `playOneSeason`**, when `canInteract` and `rollInteractive` returns one: commit the season's reward state as normal (so the season *counts*), then instead of looping, set `setPendingEraEvt(ie)` and `setPhase("eraEvent")`. The season counter has already advanced; the player resolves the event, and resuming returns them to the `seasons` phase with `seasonsLeft` unchanged so they continue the era.

   The cleanest seam: let the season fully resolve and `setSeasonsLeft(s => s-1)` as usual, but branch the *final* `if (isLast) {...}` / continue logic so that when an interactive event is pending you go to `eraEvent` instead of leaving the player on the seasons card.

3. **Resolver** (cf. `resolveMgrEvent`):
   ```ts
   function resolveEraEvent(choiceIdx: 0 | 1) {
     const ev = pendingEraEvt!;
     setPendingEraEvt(null);
     const opt = ev.options[choiceIdx];
     // build an EventCtx on current meters/squad, apply opt.apply, fold tags through
     // applyModifiers + cultureDelta if using tags, then commit with clamp.
     setNews((n) => [...n, opt.outcome]);
     logEvent(`${ev.sp}: ${opt.t}`);   // shows in the end-of-century run log too — nice continuity
     setPhase("seasons");              // back to the era, player taps "Play season" to continue
   }
   ```
   Apply effects through the same `clamp` + (optional) `applyModifiers`/`cultureDelta` path the big choices use, so a mid-era commercial pick moves the culture axis consistently.

4. **Render block** — add alongside the existing `pressure` / `mgrEvent` cases:
   ```tsx
   {phase === "eraEvent" && pendingEraEvt && (
     <>
       {hudGame}
       <div ref={cardRef}>
         <EventChoiceCard event={pendingEraEvt} onResolve={resolveEraEvent} />
       </div>
     </>
   )}
   ```

5. **`EventChoiceCard`** — copy `ManagerEventCard` almost verbatim: `sp`, `prompt`, two `.c` buttons with label + `<small>note</small>`. Optionally show the predicted meter deltas the way the big scene buttons do via `MeterDelta`, but **consider hiding them here** — these are small, frequent, flavour-led decisions, and a little uncertainty keeps them feeling like texture rather than a spreadsheet. Designer's call; I'd hide them on mid-era events and keep them on the heavy century choices.

---

## Part 5 — Interactions to get right

- **Seeded daily.** All rolls already run through `seedRng.current`, so interactive events are deterministic in daily mode automatically — *as long as* you draw every random via `seedRng.current()` and never `Math.random()`. Two players on the same day must hit the same events with the same choices available. Double-check the `canInteract` roll and `rollInteractive` both use `seedRng.current`.
- **Autosave boundary.** The mid-run save snapshots at the *start of each scene* (`phase === "scene"`), not mid-era. An interactive event fires mid-era, so it won't be mid-save — but confirm a player can't get a save written while `pendingEraEvt` is set. It can't today (save only fires on `scene`), just don't add new save triggers.
- **Don't stack interrupts.** Guard so an interactive event never fires on the same season as: the big-match moment (`isLast && scene.bigMatch`), a passive news event (`newsLine` already set), or a manager era event. One interruption per beat. The `!isLast && !newsLine` guard in Part 2 covers most of this.
- **Run log.** Logging the choice via `logEvent` means mid-era decisions show up in the end-of-century "decision by decision" history — which makes the century read richer at the end for free. Recommended.
- **Form/mood.** If an option should affect momentum, nudge `form` in the resolver (the game derives `mood` from `form`). Optional; most events should touch meters, not form.

---

## Part 6 — Build order & test checklist

1. **Part 1** — add `InteractiveEvent` / `EventOption` types + an empty `INTERACTIVE_EVENTS`.
2. **Part 3** — author 3 events first (local lad, brewery, ticket price) to test variety before writing all 8.
3. **Part 2** — add `rollInteractive`; console-test it returns eligible events at the right rate.
4. **Part 4** — phase, state, resolver, render, `EventChoiceCard`. Get one event firing and resolving end to end.
5. Add the remaining events; tune the `0.25` frequency by playing a full era.
6. **Part 5** — verify daily determinism and no stacked interrupts.

**Regression checks:**
- A full era plays through with seasons still counting correctly (`seasonsLeft` reaches 0, `endOfEra` still fires).
- Interactive event never appears on the big-match season.
- Daily challenge: same seed → same events, same options, same order.
- Static export builds; no `Math.random()` crept into the new paths.
- The end-of-century run log includes resolved mid-era choices.

**Balance levers, in order:** the `0.25` fire chance (Part 2) → per-option meter magnitudes (Part 3) → individual event `weight`s → whether deltas are shown on the card (Part 4.5).

---

## File-by-file summary

| File | Change |
|---|---|
| `lib/events.ts` | + `EventOption`, `InteractiveEvent` types; `INTERACTIVE_EVENTS[]` (start with 3, grow to 8+); `rollInteractive()`. Leave `GameEvent`/`rollEvent`/`EVENTS` untouched. |
| `app/page.tsx` | + `"eraEvent"` phase; `pendingEraEvt` state; the `canInteract` branch inside `playOneSeason`; `resolveEraEvent()`; render case; `EventChoiceCard` component (copy `ManagerEventCard`). |
| `app/globals.css` | reuse existing `.card` / `.c` / `.sp` / `.pr` styles — no new CSS needed unless you want a distinct accent for mid-era cards. |

This is the highest-leverage retention piece short of full branching: it directly removes the dead air between big decisions, reuses systems already in the codebase, and every new event is just one array entry.
