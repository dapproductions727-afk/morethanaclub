# More Than a Club

A century in one club. You run a sporting institution for 100 years while the world keeps changing the rules underneath you. A pixel-art sweep-of-history football game in the spirit of early Championship Manager crossed with Civilization.

Built with Next.js + React, mobile-first, single player.

## Run it

```bash
cd "more-than-a-club"
npm install
npm run dev
```

Open http://localhost:3000 on your phone or browser. It's built portrait-first and caps at a phone width.

## Ship it

```bash
npm run build
```

`output: "export"` writes a fully static site to `out/`. Drop that folder on any static host (Vercel, Netlify, GitHub Pages, an S3 bucket). No server needed.

## How it's put together

- `lib/regions.ts` — the six founding regions, their squads, youth pools, and cost modifiers.
- `lib/charter.ts` — the five founding stories and seven charter rules.
- `lib/scenes.ts` — the heavy decisions of the century. All the writing lives here. Some carry stadium effects and big-match moments.
- `lib/managers.ts` — the four managers you can hire and their tactical trade-offs.
- `lib/events.ts` — the random mid-era news events that fire between seasons.
- `lib/engine.ts` — pure game logic: strength, the season sim, era aging, modifier stacking, the tech timeline, fan mood, stadium derivation, and the endings.
- `app/page.tsx` — the state machine: boot → founding → manager → scenes → seasons → match moments → era pass → ending.
- `components/Stadium.tsx` — the evolving pixel ground. Reads your DECISIONS, not the clock: rebuild and it grows, move out and the old ground is demolished beyond an empty car park, sell to the fund and a sterile glass bowl goes up with corporate signage. The crowd colour follows the fans' mood.
- `components/Hud.tsx` — meters, fan-mood meter, squad, manager panel, news ticker, reach strip, tech timeline.

## What's in it

- Built in Next.js/React with typed, separated modules.
- Pixel-art CRT skin: phosphor palette, scanlines, chunky beveled buttons, Press Start 2P + VT323.
- A decision-driven pixel stadium and neighborhood that visibly changes across the century.
- A fan-mood meter (furious → restless → content → buoyant → ecstatic) that tracks recent results and colours the crowd.
- A manager you hire, each with a tactical style that shifts your title odds and how your own players develop.
- A mid-era news ticker with random events: wonderkids, derbies, sponsors, injuries, windfalls.
- Tap-to-play match moments for the big games (a cup final, a relegation decider, a title decider) where your timing nudges the result.
- A Civ-style technology timeline (radio → floodlights → television → data → surveillance).
- Stronger coupling between results and fans: winning brings real crowds, a barren decade empties the terraces.

## Replayability

- A run-history ending: the whole century laid out decision by decision, with your best league finish.
- Rival clubs (the sellout, the purist, the steady mid-tabler) that rise and fall beside you in a live league table.
- Achievements for rare runs (win with the charter intact, survive the three-rule purist run, finish top), saved across sessions.
- A daily challenge: a seeded "same century for everyone today" mode with a score to beat. Same seed = identical century.

## Play it without Terminal

Double-click **Play More Than a Club.command** in this folder. It starts a tiny local server (using Python, which ships with macOS) and opens the game in your browser. Keep that window open while you play. First time, macOS may warn it's from an unidentified developer — right-click the file, choose Open, then Open again. You only do that once.

## A note on balance

A headless harness ran 200+ full playthroughs to check the math. Random play survives about a quarter of the time, and most deaths come from fans hitting zero — the intended pressure point, since selling out drains the people who were here first. A thoughtful run, holding the charter, can reach the rare "you won and stayed yourselves" ending. Survival is never guaranteed. That's the point.
