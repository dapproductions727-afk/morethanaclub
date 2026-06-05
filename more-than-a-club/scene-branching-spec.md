# Scene-variant branching spec (Tier 1)

Implementation brief for *More Than a Club*. Makes each run feel different *within the same century* — without breaking the game's core premise that history happens to everyone (Bosman arrives for all; radio→TV→data march in order).

**The design call:** Tier 1 branching, driven by past choices. The 14-era spine stays fixed and in order. But each era can swap in a *different card* depending on who you've been — defy the women's ban in 1921 and the 1965 television beat reads (and plays) differently than if you obeyed. Same slot, forked content. This is the most "different run" feeling for the least content and code, and it keeps the inevitability that makes the game's argument land.

**Why this is small:** the engine *already branches at the choice level.* Scenes have `cond: () => swore("affordable") && swore("debtfree")` gating individual choices, and `pr`/`note` can be functions reading live flags (`defiedBanFlag()`). `visibleChoices()` already filters by `cond`. This spec lifts that exact pattern from the choice level up to the **scene** level. You're extending a mechanism, not inventing one.

Spec to implement yourself in VS Code. No new deps, client-side, export-safe.

---

## Part 0 — How scene selection works today

- `lib/scenes.ts` exports `scenes: Scene[]` — a flat array of 14. The game walks it strictly: `app/page.tsx` reads `scenes[current]` and advances `current + 1` in `endOfEra`. Order is fixed, every run.
- **Consequence already exists, branching doesn't.** Choices set flags (`setFlag("defiedBan", true)`, `setFlag("charterBroken", true)`), move meters, remove players. A few scenes *read* those flags to change wording: e.g. the post-ban era's `pr` and `note` are functions calling `defiedBanFlag()`.
- The flag-reading bridge is `bindSceneHooks(sworeFn, defiedBanFn)` (bottom of `scenes.ts`), wired once in `page.tsx`'s mount effect. It exposes `swore(k)` (did the charter swear rule k) and `defiedBanFlag()` to scene code.
- `engine.ts` → `visibleChoices(s: Scene)` returns `s.ch.filter(c => !c.cond || c.cond())` with `_idx` attached. This is the existing filter-by-condition primitive.

So: the data to branch on is already tracked. What's missing is (a) more flags worth branching on, exposed through the hook bridge, and (b) a way for a *scene slot* to choose between variant cards.

---

## Part 1 — Expand the flag bridge

Branching on "did you sell the centre-forward in 1906" needs that decision remembered and readable by later scenes. Today only `defiedBan` and `swore(rule)` are exposed. Generalise the bridge to a small read-only history object.

### 1A. A run-history flag store

In `page.tsx` you already hold the state the branches care about: `charterBroken`, `defiedBan`, `movedOut`, `corporate`, `culture`, `meters`, plus per-decision outcomes. Add a lightweight record of *which option was taken at key scenes*. Cheapest approach: a `Set<string>` of decision tags.

```ts
const [decisions, setDecisions] = useState<Set<string>>(new Set());
```

In `chooseOption`, after a choice resolves, record a stable id for branch-worthy choices. Add an optional `mark?: string` to the `Choice` type and record it:

```ts
// types.ts — Choice gets one optional field:
mark?: string;   // stable id recorded into run history for later branching, e.g. "sold-cf"
```
```ts
// page.tsx, inside chooseOption after opt.run(ctx):
if (opt.mark) setDecisions(d => new Set(d).add(opt.mark!));
```

Then tag the choices you want to branch on, e.g. in the 1906 centre-forward scene:
```ts
{ t: "Sell him...", mark: "sold-cf", tags:["commercial"], run: (c)=>{...} },
{ t: "Hold him...", mark: "held-cf", run: (c)=>{...} },
```

### 1B. Expose history through the hook bridge

Extend `bindSceneHooks` so scene code can ask richer questions. Keep the existing two for back-compat; add a general one.

```ts
// scenes.ts
let _did: (mark: string) => boolean = () => false;
let _meter: (k: "money"|"soul"|"fans") => number = () => 50;
let _culture: () => number = () => 0;

export function bindSceneHooks(
  sworeFn: (k: string) => boolean,
  defiedBanFn: () => boolean,
  didFn: (mark: string) => boolean,
  meterFn: (k: "money"|"soul"|"fans") => number,
  cultureFn: () => number,
) {
  _swore = sworeFn; _defiedBan = defiedBanFn;
  _did = didFn; _meter = meterFn; _culture = cultureFn;
}

export function did(mark: string): boolean { return _did(mark); }
export function meter(k: "money"|"soul"|"fans"): number { return _meter(k); }
export function culture(): number { return _culture(); }
```

Update the `bindSceneHooks(...)` call in `page.tsx`'s mount effect to pass:
- `did`: `(m) => decisionsRef.current.has(m)` — use a ref that mirrors `decisions` (same pattern as the existing `flagRef`/`foundingRef`), so scene functions always read current values without re-binding.
- `meter`: `(k) => metersRef.current[k]`
- `culture`: `() => cultureRef.current`

(You already keep `flagRef` and `foundingRef` updated via effects — add `decisionsRef`, `metersRef`, `cultureRef` the same way. This avoids re-binding hooks on every change.)

Even though the trigger decision is **past choices** (per the design call), exposing `meter`/`culture` too costs nothing and lets a future variant use a threshold without another bridge change. Branch *conditions* in v1 should stay choice/flag-based for narrative legibility.

---

## Part 2 — Scene variants: the slot picks a card

A "scene slot" becomes either a single `Scene` (no branch, the common case) or a **set of variants** with conditions. Add a variant container and a selector.

### 2A. Types

```ts
// types.ts
export interface SceneVariant {
  when: () => boolean;   // reads did()/swore()/meter()/culture() via the hook bridge
  scene: Scene;
}
export type SceneSlot = Scene | { variants: SceneVariant[]; fallback: Scene };
```

### 2B. The slot array + selector

Rename the data to slots, keep a resolved view for the engine:

```ts
// scenes.ts
export const slots: SceneSlot[] = [ /* mostly bare Scene objects; a few branch */ ];

export function resolveScene(slot: SceneSlot): Scene {
  if ("variants" in slot) {
    const hit = slot.variants.find(v => v.when());
    return hit ? hit.scene : slot.fallback;
  }
  return slot;
}

// Back-compat: callers that used scenes[current] now do resolveScene(slots[current]).
export const SCENE_COUNT = slots.length;
```

In `page.tsx`, every `scenes[current]` / `scenes[next]` / `scenes.length` reference becomes `resolveScene(slots[current])` / `resolveScene(slots[next])` / `SCENE_COUNT`. There are ~8 such references (the `scene` const, `endOfEra`'s `nextScene`, `playOneSeason`'s `scenes[current]`, the length check, `logEvent`'s year). Resolve once per render into the existing `scene` const and reuse — minimise scattered calls.

**Critical correctness rule:** resolve a slot **once when the era is entered**, not repeatedly, because a variant's `when()` reads live flags that keep changing *during* the era (seasons mutate meters). If you re-resolve mid-era you could swap the card under the player. Resolve at the moment `current` advances (in `endOfEra` when setting up the next scene, or memoised on `current`) and store the resolved `Scene` in state/ref for the duration of that era.

```ts
// cleanest: resolve into a memo keyed ONLY on current (not meters), so it's stable per era
const scene = useMemo(() => resolveScene(slots[current]), [current]);
```
This guarantees the era you're playing can't reshuffle itself. The `when()` therefore reads the flag state *as it was when you entered the era* — which is exactly right: the 1965 card is chosen by what you'd done *by 1965*.

---

## Part 3 — Authoring the first branches

Keep most slots as plain `Scene` objects (no change). Convert a handful of high-impact eras to variant slots. Three good first branches, each keyed off a memorable earlier decision:

### Branch 1 — The television era forks on the women's ban (1921 → 1965)
The 1921 ban scene already sets `defiedBan`. Make the 1965 television slot a variant:
- **`when: () => defiedBanFlag()`** → a card where the broadcaster is *wary* of your reputation as troublemakers: lower money on offer, but the framing is "they need you more than you need them." Defiance compounds.
- **fallback** (obeyed) → the existing television card as written.

The player who stood with the women in 1921 feels that choice reach forward 44 years. That's the whole pitch of the game, made structural.

### Branch 2 — The stadium era forks on selling the centre-forward (1906 → ~1930s ground decision)
Mark the 1906 choices `sold-cf` / `held-cf`. The era where you first expand the ground:
- **`when: () => did("sold-cf")`** → "The fee you took in 1906 has sat in the bank for a generation. The board wants to spend it on a grand new stand." A build-big card: bigger money option, soul cost, `fx.stadium: "newStand"`.
- **fallback** (held him) → a make-do-and-mend card: smaller, scrappier, soul-positive.

### Branch 3 — The ownership/European era forks on culture drift
Late-century, key off the culture axis (this one *does* use a meter, as a showcase — optional for v1 if you want pure-flag only):
- **`when: () => culture() > 20`** (drifted commercial) → the closed-league invitation arrives as a *natural next step*; the framing assumes you'll say yes.
- **`when: () => culture() < -20`** (deep roots) → the same invitation arrives as an *insult* to everything the club stands for; refusing is framed as obvious, accepting as betrayal.
- **fallback** → the existing balanced framing.

Each variant is a full `Scene` (sp/year/pr/ch). Reuse the same `year`/`tech`/`bigMatch` across a slot's variants so the timeline and stadium stay consistent — only the `sp`/`pr`/`ch`/`note` should differ. **Tip:** factor the shared fields and spread them: `const base1965 = { year:"{PLACE} · 1965", tech:"television", seasons:4 }; variants use {...base1965, sp, pr, ch}`.

---

## Part 4 — Content budget (the honest part)

Tier 1's cost is content, not code. Each branched slot = writing 2–3 cards where you used to write 1. Players see only one per run. Budget accordingly:

- **v1: branch 3 slots.** ~6–8 extra cards total. Enough that two runs visibly diverge; small enough to finish.
- Leave the other 11 slots as single scenes. Not every era needs to fork — the fixed ones are the "history happens to everyone" backbone, and they make the forked ones feel special.
- Each variant still needs to be *balanced* on its own — a player who only ever sees the "defied" branch shouldn't have an easier or harder century than one who sees "obeyed". Keep variant meter swings in the same range as the card they replace.

---

## Part 5 — Interactions to get right

- **Seeded daily.** Variants are chosen by player *decisions*, which are deterministic given the seed *and* the player's inputs. Two players on the same daily seed who make the same choices see the same variants — correct. Two who diverge see different cards — also correct and fine; the daily compares *score*, not path. No RNG is involved in `resolveScene`, so nothing to guard here.
- **Save/resume.** `savegame.ts` must persist the new `decisions` set (add `decisions: string[]` to `SaveGame`, write/read it). On resume, rebuild `decisionsRef` before any scene resolves. Without this, a resumed run could pick the wrong variant. Bump the save `version` and handle old saves (treat missing `decisions` as empty set).
- **Ending / run log.** Variants flow through the existing `logEvent` automatically (it logs `scene.sp` + choice), so the end-of-century history naturally reflects the path taken. No change needed, but it's a nice payoff — the log reads differently per branch.
- **Dynasty inheritance** (your other spec) reads last run's *outcome*, not its path, so it's orthogonal. They compose cleanly: dynasty varies the world between runs, scene variants vary the century within a run.
- **`bestPosition` / achievements** are unaffected — they read meters/trophies/position, not scene identity.

---

## Part 6 — Build order & test checklist

1. **Part 2A/2B** — add `SceneSlot`, `resolveScene`, rename `scenes`→`slots` (wrap all 14 as bare slots first — pure refactor, game plays identically). Verify nothing changed.
2. **Part 1** — add `decisions` state + ref, `mark` on `Choice`, extend `bindSceneHooks`, update the bind call. Mark the 1906 choices. Verify `did("sold-cf")` returns true after selling.
3. **Part 2 memo** — resolve scene once per era via `useMemo([current])`. Confirm the card can't swap mid-era.
4. **Part 3, Branch 1** — convert the 1965 slot to variants on `defiedBan`. Play both paths (defy vs obey in 1921), confirm different 1965 cards.
5. Add Branches 2 and 3.
6. **Part 5** — persist `decisions` in savegame; test save→resume picks the right variant.

**Regression checks:**
- Refactor step (1) leaves the game byte-for-byte identical in behaviour (no branch added yet).
- A scene mid-era never changes card when meters cross a threshold (the memo guarantees this — test by entering a branched era then watching a season swing a meter).
- Save made mid-century resumes onto the correct variant path.
- Daily: same seed + same inputs → same path; build is export-safe; no `Math.random` anywhere in `resolveScene`.
- Every variant is reachable (write a tiny dev assert that logs which variant fired) and every fallback works when no `when()` matches.

**Balance levers, in order:** which decisions get a `mark` (more marks = more branchable) → how many slots branch (start at 3) → per-variant meter ranges (keep parity with the card replaced) → whether any variant uses a meter/culture threshold vs pure flags.

---

## File-by-file summary

| File | Change |
|---|---|
| `lib/types.ts` | + `Choice.mark?`; + `SceneVariant`, `SceneSlot` |
| `lib/scenes.ts` | rename `scenes`→`slots: SceneSlot[]`; + `resolveScene()`, `SCENE_COUNT`; extend `bindSceneHooks` (did/meter/culture); convert 3 slots to variants; author variant cards |
| `lib/engine.ts` | no change needed (`visibleChoices` already works on the resolved `Scene`) |
| `app/page.tsx` | `decisions` state + `decisionsRef`/`metersRef`/`cultureRef`; record `opt.mark` in `chooseOption`; resolve scene via `useMemo([current])`; swap `scenes[...]`→`resolveScene(slots[...])` / `SCENE_COUNT`; update `bindSceneHooks` call |
| `lib/savegame.ts` | + `decisions: string[]` in `SaveGame`; write/read it; bump `version`, default missing to empty |

No new dependencies. The branch *engine* is ~30 lines; the rest is content. Start with the refactor, prove the game is unchanged, then fork one era and feel it before writing the other two.
