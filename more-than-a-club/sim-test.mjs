// Headless playtest of the real game modules. Strips TS via node 22.
// Simulates full centuries across founding combos and checks invariants.

import { REGIONS } from "./lib/regions.ts";
import { STORIES, RULES } from "./lib/charter.ts";
import { scenes, bindSceneHooks } from "./lib/scenes.ts";
import {
  clamp,
  strength,
  passEra,
  playSeason,
  seasonRewards,
  applyModifiers,
  visibleChoices,
  computeEnding,
} from "./lib/engine.ts";

let failures = 0;
function check(cond, msg) {
  if (!cond) {
    console.log("  FAIL:", msg);
    failures++;
  }
}

function playthrough(regionKey, storyKey, ruleKeys, picker) {
  const founding = { region: regionKey, story: storyKey, rules: ruleKeys };
  let charterBroken = false;
  let defiedBan = false;

  bindSceneHooks(
    (k) => founding.rules.includes(k),
    () => defiedBan
  );

  const r = REGIONS[regionKey];
  const s = STORIES[storyKey];
  const rb = { money: 0, soul: 0, fans: 0 };
  ruleKeys.forEach((k) => {
    const b = RULES[k].bonus || {};
    rb.money += b.money || 0;
    rb.soul += b.soul || 0;
    rb.fans += b.fans || 0;
  });
  const meters = {
    money: clamp(r.start.money + (s.bonus.money || 0) + rb.money),
    soul: clamp(r.start.soul + (s.bonus.soul || 0) + rb.soul),
    fans: clamp(r.start.fans + (s.bonus.fans || 0) + rb.fans),
  };
  let squad = r.squad.map((p) => ({ ...p }));
  let trophies = 0;
  let reach = 0;
  const nameCounter = { i: 0 };

  let current = 0;
  let died = false;

  while (current < scenes.length) {
    const scene = scenes[current];
    if (meters.soul <= 0 || meters.money <= 0 || meters.fans <= 0) {
      died = true;
      break;
    }

    const choices = visibleChoices(scene);
    check(choices.length >= 1, `scene ${current} has a visible choice`);
    const opt = choices[picker(current, choices.length)];

    // Resolve choice (mirror of page.tsx chooseOption)
    const before = { ...meters };
    const working = { ...meters };
    const wsquad = [...squad];
    const ctx = {
      meters: working,
      squad: wsquad,
      addPlayer: (p) => wsquad.push(p),
      removeBestLocal: () => {
        let best = -1, bestR = -1;
        wsquad.forEach((p, i) => { if (!p.foreign && p.rating > bestR) { bestR = p.rating; best = i; } });
        if (best >= 0) wsquad.splice(best, 1);
      },
      boostUnder: (age, by) => wsquad.forEach((p) => { if (p.age < age) p.rating += by; }),
      setFlag: (k, v) => { if (k === "charterBroken") charterBroken = v; if (k === "defiedBan") defiedBan = v; },
    };
    opt.run(ctx);
    const tags = opt.tags || [];
    const delta = {
      money: working.money - before.money,
      soul: working.soul - before.soul,
      fans: working.fans - before.fans,
    };
    applyModifiers(delta, tags, founding);
    meters.money = clamp(before.money + (delta.money || 0));
    meters.soul = clamp(before.soul + (delta.soul || 0));
    meters.fans = clamp(before.fans + (delta.fans || 0));
    squad = wsquad;

    if (tags.includes("commercial")) reach = Math.min(100, reach + 12);
    if (tags.includes("move") || tags.includes("ownership")) reach = Math.min(100, reach + 8);

    // resolve note (catches function-note crashes)
    const note = typeof opt.note === "function" ? opt.note() : opt.note;
    check(typeof note === "string" && note.length > 0, `scene ${current} choice has note`);

    // Play the era's seasons
    const total = scene.seasons || 5;
    for (let i = 0; i < total; i++) {
      const res = playSeason(squad);
      const rew = seasonRewards(res);
      if (res.won) { trophies++; reach = Math.min(100, reach + 4); }
      meters.money = clamp(meters.money + rew.money);
      meters.fans = clamp(meters.fans + rew.fans);
    }

    // Age + advance
    squad = passEra(squad, meters, regionKey, nameCounter);
    check(squad.length >= 12 && squad.length <= 40, `scene ${current} squad size sane (${squad.length})`);
    check(strength(squad) > 0, `scene ${current} strength positive`);
    current++;
  }

  const ending = computeEnding(meters, founding, trophies, charterBroken);
  check(ending.title.length > 0 && ending.body.length > 0, "ending has copy");

  // meter invariants
  for (const k of ["money", "soul", "fans"]) {
    check(meters[k] >= 0 && meters[k] <= 100, `final ${k} in [0,100]: ${meters[k]}`);
  }
  return { died, trophies, charterBroken, meters, ending: ending.title };
}

// Pickers: always first choice, always second, random.
const pickFirst = () => 0;
const pickSecond = (_, n) => Math.min(1, n - 1);
const pickRandom = (_, n) => Math.floor(Math.random() * n);

console.log("=== Playtest: scenes =", scenes.length, "===\n");

const regionKeys = Object.keys(REGIONS);
const storyKeys = Object.keys(STORIES);
const ruleKeys = Object.keys(RULES);

let runs = 0;
const endings = {};

// 1) Every region with a default story+charter, both pure strategies.
for (const rk of regionKeys) {
  for (const pick of [pickFirst, pickSecond]) {
    const res = playthrough(rk, "factory", ["local"], pick);
    runs++;
    endings[res.ending] = (endings[res.ending] || 0) + 1;
  }
}

// 2) The hard-mode purist (enclave + church + 3 rules), holding the line.
{
  const res = playthrough("enclave", "church", ["local", "ownership", "stayput"], pickSecond);
  runs++;
  endings[res.ending] = (endings[res.ending] || 0) + 1;
  console.log("Purist hold-the-line:", res.ending, "| trophies", res.trophies, "| broken", res.charterBroken);
}

// 3) The sell-out (take every commercial option) — should often win + break charter.
{
  const res = playthrough("capital", "merchants", ["debtfree"], pickFirst);
  runs++;
  endings[res.ending] = (endings[res.ending] || 0) + 1;
  console.log("Sell-out everything:", res.ending, "| trophies", res.trophies, "| broken", res.charterBroken);
}

// 4) The affordable+debtfree conflict run (forces the 1990 conflict choice to appear).
{
  const founding = { region: "docktown", story: "cooperative", rules: ["affordable", "debtfree"] };
  bindSceneHooks((k) => founding.rules.includes(k), () => false);
  const newStand = scenes.find((s) => s.sp === "The new stand");
  const vis = visibleChoices(newStand);
  check(vis.some((c) => c.conflict), "affordable+debtfree surfaces the conflict choice in 1990");
  console.log("Conflict choice present in 1990:", vis.some((c) => c.conflict));
}

// 5) 200 random full playthroughs for invariant fuzzing.
for (let i = 0; i < 200; i++) {
  const rk = regionKeys[i % regionKeys.length];
  const sk = storyKeys[i % storyKeys.length];
  const nRules = 1 + (i % 3);
  const rules = ruleKeys.slice(0, nRules);
  const res = playthrough(rk, sk, rules, pickRandom);
  runs++;
  endings[res.ending] = (endings[res.ending] || 0) + 1;
}

console.log("\nTotal runs:", runs);
console.log("Ending distribution:");
for (const [k, v] of Object.entries(endings)) console.log("  " + v + "x  " + k);

console.log("\n" + (failures === 0 ? "ALL CHECKS PASSED ✓" : failures + " CHECKS FAILED ✗"));
process.exit(failures === 0 ? 0 : 1);
