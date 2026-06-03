"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Meters, Player, Founding, FlagKey, RunContext, Mood, Manager, BigMatch, StadiumState } from "@/lib/types";
import { REGIONS } from "@/lib/regions";
import { STORIES, RULES } from "@/lib/charter";
import { scenes, bindSceneHooks } from "@/lib/scenes";
import { MANAGERS, managerByKey } from "@/lib/managers";
import { rollEvent, type EventCtx } from "@/lib/events";
import { leagueTable, playerPosition, RIVALS } from "@/lib/rivals";
import { ACHIEVEMENTS, recordRun, getUnlockedAchievements, type RunSummary } from "@/lib/progress";
import { mulberry32, seedFromString, todaySeedString, seededFounding, seededScore } from "@/lib/seed";
import { readSave, writeSave, clearSave, hasSave, type SaveGame } from "@/lib/savegame";
import {
  MAX_RULES,
  clamp,
  strength,
  passEra,
  playSeason,
  seasonRewards,
  applyModifiers,
  ruleNames,
  visibleChoices,
  previewChoice,
  computeEnding,
  moodFromForm,
  formDelta,
  nextForm,
  deriveStadium,
  cultureLabel,
  cultureDelta,
} from "@/lib/engine";
import Stadium from "@/components/Stadium";
import { useAudio } from "@/lib/useAudio";
import { MetersBar, SquadPanel, ReachStrip, TechTimeline, MoodMeter, ManagerPanel, NewsTicker, LeagueTable, CultureStrip } from "@/components/Hud";

type Phase = "boot" | "founding" | "summary" | "manager" | "scene" | "seasons" | "match" | "pressure" | "mgrEvent" | "ending";

interface PressureEvent {
  kind: "fan_pressure" | "rival_interest";
  managerName: string;
}

interface MgrEraEventDef {
  id: string;
  once: boolean;
  cond: (tenure: number, hasCaptain: boolean) => boolean;
  sp: string;
  getPr: (mgr: string, captain: string) => string;
  ch0: string; note0: string;
  ch1: string; note1: string;
}

interface PendingMgrEvt {
  id: string;
  managerName: string;
  captainName: string;
}

// Manager relationship events — fire at era transitions, give the player
// agency over the manager beyond just hire/fire.
const MGR_ERA_EVENTS: MgrEraEventDef[] = [
  {
    id: "contract",
    once: true,
    cond: (tenure) => tenure === 2,
    sp: "The agent's call",
    getPr: (mgr) =>
      `Two eras in, and ${mgr} has other clubs watching him. His agent has been in touch. Tie him down now with a long-term deal, or let the contract run its course.`,
    ch0: "Offer him a long-term deal. Keep him here.",
    note0: "Costs money. He's yours for the foreseeable.",
    ch1: "Let it run. Keep your options open.",
    note1: "Free. But the door stays ajar.",
  },
  {
    id: "tactics",
    once: false,
    cond: (tenure) => tenure >= 2,
    sp: "The pre-season",
    getPr: (mgr) =>
      `${mgr} wants to overhaul the system over the summer. New shape, new pressing game. The players will find it brutal at first. He thinks it changes everything.`,
    ch0: "Back him. Let him rebuild it.",
    note0: "Costs money and short-term disruption. The vision is his.",
    ch1: "Hold the current shape. Too much, too soon.",
    note1: "The squad settles. The manager is frustrated.",
  },
  {
    id: "fallout",
    once: false,
    cond: (tenure, hasCaptain) => tenure >= 1 && hasCaptain,
    sp: "The dressing room",
    getPr: (mgr, captain) =>
      `There has been a falling-out between ${mgr} and ${captain}. The manager says he cannot work with him. ${captain} says ${mgr} has lost the dressing room. You have to choose a side.`,
    ch0: "Back the manager. He runs the team.",
    note0: "The captain is dropped. The fans aren't happy.",
    ch1: "Side with the captain. The players come first.",
    note1: "The manager is undermined. Soul holds. Results may not.",
  },
];

const foundingFlow = [
  {
    sp: "1 of 3 · The ground",
    pr: "Your club is about to be born. First: where?",
    group: "region" as const,
    keys: Object.keys(REGIONS),
  },
  {
    sp: "2 of 3 · The founders",
    pr: "Who built this club, and why?",
    group: "story" as const,
    keys: Object.keys(STORIES),
  },
  {
    sp: "3 of 3 · The charter",
    multi: true,
    pr: "Swear up to three rules into the founding document. Each earns a starting bonus, and each closes a door you'll later wish you'd left open. The more you swear, the harder the century.",
    group: "rule" as const,
    keys: Object.keys(RULES),
  },
];

export default function Game() {
  const [phase, setPhase] = useState<Phase>("boot");

  const [founding, setFounding] = useState<Founding>({ region: null, story: null, rules: [] });
  const [foundingStep, setFoundingStep] = useState(0);

  const [meters, setMeters] = useState<Meters>({ money: 0, soul: 0, fans: 0 });
  const [squad, setSquad] = useState<Player[]>([]);
  const [trophies, setTrophies] = useState(0);
  const [reach, setReach] = useState(0);
  const [current, setCurrent] = useState(0);
  const [charterBroken, setCharterBroken] = useState(false);
  const [defiedBan, setDefiedBan] = useState(false);
  const [unlockedTech, setUnlockedTech] = useState<Set<string>>(new Set());

  // Stadium decision flags.
  const [rebuilt, setRebuilt] = useState(false);
  const [newStand, setNewStand] = useState(false);
  const [movedOut, setMovedOut] = useState(false);
  const [corporate, setCorporate] = useState(false);

  // Fan form/mood + manager + news.
  const [form, setForm] = useState(0);
  const [managerKey, setManagerKey] = useState<string | null>(null);
  const [managerTenure, setManagerTenure] = useState(0);
  const [news, setNews] = useState<string[]>([]);

  // Culture axis: negative = deep community roots, positive = commercial drift.
  const [culture, setCulture] = useState(0);

  // Tracks whether charter was already broken at the end of the previous era,
  // so we can detect when it's newly broken and trigger a manager resignation.
  const charterWasBroken = useRef(false);

  // Season run-through state.
  const [seasonInEra, setSeasonInEra] = useState(0);
  const [seasonsLeft, setSeasonsLeft] = useState(0);
  const [seasonLog, setSeasonLog] = useState<{ text: string; cls: string }[]>([]);
  const [sceneNote, setSceneNote] = useState("");
  const [flashText, setFlashText] = useState<string | null>(null);

  // Match-moment state.
  const [pendingMatch, setPendingMatch] = useState<BigMatch | null>(null);

  // Manager pressure event waiting for player decision.
  const [pendingPressure, setPendingPressure] = useState<PressureEvent | null>(null);

  // Manager era events — periodic relationship decisions.
  const [pendingMgrEvt, setPendingMgrEvt] = useState<PendingMgrEvt | null>(null);
  const [firedMgrEvts, setFiredMgrEvts] = useState<Set<string>>(new Set());
  const [mgrContractLocked, setMgrContractLocked] = useState(false);

  // Replayability: run history, league position, seeded mode.
  const [runLog, setRunLog] = useState<{ year: string; text: string }[]>([]);
  const [bestPosition, setBestPosition] = useState(4);
  const [seeded, setSeeded] = useState(false);
  const seedRng = useRef<() => number>(Math.random);
  const [ending, setEnding] = useState<ReturnType<typeof computeEnding> | null>(null);
  const [earned, setEarned] = useState<{ newlyEarned: string[]; all: string[] } | null>(null);
  const clubName = founding.region ? REGIONS[founding.region].place + " club" : "Your club";

  const flagRef = useRef({ defiedBan: false });
  useEffect(() => {
    flagRef.current.defiedBan = defiedBan;
  }, [defiedBan]);

  const foundingRef = useRef(founding);
  useEffect(() => {
    foundingRef.current = founding;
  }, [founding]);

  useEffect(() => {
    bindSceneHooks(
      (k: string) => foundingRef.current.rules.includes(k),
      () => flagRef.current.defiedBan
    );
  }, []);

  const nameCounter = useRef({ i: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const { on: audioOn, toggle: toggleAudio, sting } = useAudio();

  // Whether a resumable save exists, checked once on mount for the boot screen.
  const [resumable, setResumable] = useState(false);
  useEffect(() => {
    setResumable(hasSave());
  }, []);

  // Mid-run autosave: snapshot at the start of each scene, the one clean
  // boundary with no in-flight season log or pending match. Seeded daily runs
  // are never saved (single-sitting by design).
  useEffect(() => {
    if (phase !== "scene" || seeded || !founding.region) return;
    const snap: SaveGame = {
      version: 1,
      savedAt: Date.now(),
      founding,
      meters,
      squad,
      trophies,
      reach,
      current,
      charterBroken,
      defiedBan,
      unlockedTech: Array.from(unlockedTech),
      rebuilt,
      newStand,
      movedOut,
      corporate,
      form,
      managerKey,
      managerTenure,
      mgrContractLocked,
      firedMgrEvts: Array.from(firedMgrEvts),
      news,
      culture,
      charterWasBroken: charterWasBroken.current,
      runLog,
      bestPosition,
      nameCounter: nameCounter.current.i,
    };
    writeSave(snap);
    setResumable(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, current]);

  // Restore a saved century and drop the player straight into its next scene.
  function resumeSave() {
    const s = readSave();
    if (!s) return;
    setFounding(s.founding);
    setMeters(s.meters);
    setSquad(s.squad);
    setTrophies(s.trophies);
    setReach(s.reach);
    setCurrent(s.current);
    setCharterBroken(s.charterBroken);
    setDefiedBan(s.defiedBan);
    flagRef.current.defiedBan = s.defiedBan;
    setUnlockedTech(new Set(s.unlockedTech));
    setRebuilt(s.rebuilt);
    setNewStand(s.newStand);
    setMovedOut(s.movedOut);
    setCorporate(s.corporate);
    setForm(s.form);
    setManagerKey(s.managerKey);
    setManagerTenure(s.managerTenure);
    setMgrContractLocked(s.mgrContractLocked);
    setFiredMgrEvts(new Set(s.firedMgrEvts));
    setNews(s.news);
    setCulture(s.culture);
    charterWasBroken.current = s.charterWasBroken;
    setRunLog(s.runLog);
    setBestPosition(s.bestPosition);
    nameCounter.current.i = s.nameCounter;
    foundingRef.current = s.founding;
    seedRng.current = Math.random;
    setSeeded(false);
    setSceneNote("");
    setPhase("scene");
  }

  // Scroll to the decision card for game phases, or back to the top for
  // full-screen phases (founding, manager, ending) so they're never hidden below
  // a previously scrolled viewport.
  useEffect(() => {
    if (phase === "seasons" || phase === "scene" || phase === "pressure" || phase === "mgrEvent") {
      cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [phase]);
  const place = founding.region ? REGIONS[founding.region].place : "";
  const manager = managerByKey(managerKey);
  const mood: Mood = moodFromForm(form);
  const lightsOn = unlockedTech.has("floodlights");
  const radioOn = unlockedTech.has("radio");
  const tvOn = unlockedTech.has("television");
  const neighborhoodVal = movedOut
    ? clamp(Math.round(meters.fans * 0.2))
    : clamp(Math.round(meters.fans * 0.6 + meters.soul * 0.4));
  const stadium = deriveStadium({ era: current, rebuilt, newStand, movedOut, corporate, lights: lightsOn, radio: radioOn, tv: tvOn });
  const leaguePos = playerPosition(strength(squad), current);
  const table = leagueTable(clubName, strength(squad), current);

  // Track best league finish reached across the run.
  useEffect(() => {
    if ((phase === "scene" || phase === "seasons") && leaguePos < bestPosition) {
      setBestPosition(leaguePos);
    }
  }, [phase, leaguePos, bestPosition]);

  function logEvent(text: string) {
    const y = scenes[current]?.year.replace("{PLACE}", place) || "";
    setRunLog((l) => [...l, { year: y.split("·").pop()?.trim() || y, text }]);
  }

  // =====================================================================
  // FOUNDING
  // =====================================================================
  function pickFounding(group: "region" | "story" | "rule", key: string) {
    if (group === "rule") {
      setFounding((f) => {
        const rules = [...f.rules];
        const i = rules.indexOf(key);
        if (i >= 0) rules.splice(i, 1);
        else if (rules.length < MAX_RULES) rules.push(key);
        return { ...f, rules };
      });
      return;
    }
    setFounding((f) => ({ ...f, [group]: key }));
    advanceFounding();
  }

  function advanceFounding() {
    setFoundingStep((s) => {
      const next = s + 1;
      if (next >= foundingFlow.length) setPhase("summary");
      return next;
    });
  }

  function sealCharter() {
    if (founding.rules.length === 0) return;
    advanceFounding();
  }

  // Start a seeded daily challenge: fixed founding, deterministic century.
  function startSeeded() {
    clearSave();
    setResumable(false);
    const seedStr = todaySeedString();
    const seed = seedFromString(seedStr);
    seedRng.current = mulberry32(seed);
    setSeeded(true);
    const f = seededFounding(seed);
    setFounding(f);
    // Jump straight past the founding screens with the seeded club.
    setTimeout(() => {
      const r = REGIONS[f.region as string];
      const s = STORIES[f.story as string];
      const rb = { money: 0, soul: 0, fans: 0 };
      f.rules.forEach((k) => {
        const b = RULES[k].bonus || {};
        rb.money += b.money || 0;
        rb.soul += b.soul || 0;
        rb.fans += b.fans || 0;
      });
      setMeters({
        money: clamp(r.start.money + (s.bonus.money || 0) + rb.money),
        soul: clamp(r.start.soul + (s.bonus.soul || 0) + rb.soul),
        fans: clamp(r.start.fans + (s.bonus.fans || 0) + rb.fans),
      });
      setSquad(r.squad.map((p) => ({ ...p })));
      nameCounter.current.i = 0;
      setPhase("manager");
    }, 0);
  }

  function beginCentury() {
    clearSave();
    setResumable(false);
    const r = REGIONS[founding.region as string];
    const s = STORIES[founding.story as string];
    const rb = { money: 0, soul: 0, fans: 0 };
    founding.rules.forEach((k) => {
      const b = RULES[k].bonus || {};
      rb.money += b.money || 0;
      rb.soul += b.soul || 0;
      rb.fans += b.fans || 0;
    });
    setMeters({
      money: clamp(r.start.money + (s.bonus.money || 0) + rb.money),
      soul: clamp(r.start.soul + (s.bonus.soul || 0) + rb.soul),
      fans: clamp(r.start.fans + (s.bonus.fans || 0) + rb.fans),
    });
    setSquad(r.squad.map((p) => ({ ...p })));
    nameCounter.current.i = 0;
    // First decision: hire your founding manager.
    setPhase("manager");
  }

  function hireManager(key: string) {
    setManagerKey(key);
    setManagerTenure(0);
    setMgrContractLocked(false);
    // New manager starts fresh — don't fire resignation based on old charter state.
    charterWasBroken.current = charterBroken;
    setNews((n) => [...n, `APPOINTED: ${managerByKey(key)?.name} takes the dugout.`]);
    setPhase("scene");
  }

  // =====================================================================
  // SCENE -> CHOICE
  // =====================================================================
  function chooseOption(idx: number) {
    const scene = scenes[current];
    const opt = scene.ch[idx];

    const before: Meters = { ...meters };
    const workingMeters: Meters = { ...meters };
    const workingSquad: Player[] = [...squad];
    let brokeCharter = charterBroken;
    let didDefy = defiedBan;

    const ctx: RunContext = {
      meters: workingMeters,
      squad: workingSquad,
      addPlayer: (p) => workingSquad.push(p),
      removeBestLocal: () => {
        let best = -1;
        let bestR = -1;
        workingSquad.forEach((p, i) => {
          if (!p.foreign && p.rating > bestR) {
            bestR = p.rating;
            best = i;
          }
        });
        if (best >= 0) workingSquad.splice(best, 1);
      },
      boostUnder: (age, by) =>
        workingSquad.forEach((p) => {
          if (p.age < age) p.rating += by;
        }),
      setFlag: (k: FlagKey, v: boolean) => {
        if (k === "charterBroken") brokeCharter = v;
        if (k === "defiedBan") didDefy = v;
      },
    };

    opt.run(ctx);

    const tags = opt.tags || [];
    const delta: Meters = {
      money: workingMeters.money - before.money,
      soul: workingMeters.soul - before.soul,
      fans: workingMeters.fans - before.fans,
    };
    applyModifiers(delta, tags, founding);

    const finalMeters: Meters = {
      money: clamp(before.money + (delta.money || 0)),
      soul: clamp(before.soul + (delta.soul || 0)),
      fans: clamp(before.fans + (delta.fans || 0)),
    };

    let newReach = reach;
    if (tags.includes("commercial")) newReach = Math.min(100, newReach + 12);
    if (tags.includes("move") || tags.includes("ownership")) newReach = Math.min(100, newReach + 8);

    setCulture((c) => Math.max(-50, Math.min(50, c + cultureDelta(tags))));

    // Apply stadium effects from this choice.
    if (opt.fx?.stadium === "rebuild") setRebuilt(true);
    if (opt.fx?.stadium === "newStand") setNewStand(true);
    if (opt.fx?.stadium === "moveOut") setMovedOut(true);
    if (opt.fx?.stadium === "sellToFund") {
      setCorporate(true);
      setMovedOut(true);
    }

    setMeters(finalMeters);
    setSquad(workingSquad);
    setReach(newReach);
    setCharterBroken(brokeCharter);
    setDefiedBan(didDefy);

    const note = typeof opt.note === "function" ? opt.note() : opt.note || "";
    setSceneNote(note);
    // Record this decision in the century's run history.
    logEvent(`${scene.sp}: ${opt.t}`);

    setSeasonsLeft(scene.seasons || 5);
    setSeasonInEra(0);
    setSeasonLog([]);
    setPhase("seasons");
  }

  // =====================================================================
  // SEASONS
  // =====================================================================
  function endOfEra(latestSquad: Player[], latestMeters: Meters, latestForm: number) {
    const aged = passEra(latestSquad, latestMeters, founding.region as string, nameCounter.current, manager?.youthBonus || 0);
    // Manager's per-era nudge to soul/fans.
    const withMgr: Meters = {
      ...latestMeters,
      soul: clamp(latestMeters.soul + (manager?.soulPerEra || 0)),
      fans: clamp(latestMeters.fans + (manager?.fansPerEra || 0)),
    };
    setSquad(aged);
    setMeters(withMgr);

    const next = current + 1;
    const nextScene = scenes[next];
    if (nextScene?.tech) setUnlockedTech((u) => new Set(u).add(nextScene.tech as string));
    if (nextScene) {
      setFlashText(nextScene.year.replace("{PLACE}", place));
      setTimeout(() => setFlashText(null), 1400);
    }
    setCurrent(next);

    if (next >= scenes.length || withMgr.soul <= 0 || withMgr.money <= 0 || withMgr.fans <= 0) {
      charterWasBroken.current = charterBroken;
      finalizeRun(withMgr);
      return;
    }

    // Check for manager departure before advancing to the next scene.
    const newTenure = managerTenure + 1;
    setManagerTenure(newTenure);

    if (manager) {
      const brokenThisEra = charterBroken && !charterWasBroken.current;

      // Resignation: charter newly broken and this manager has soul to lose.
      if (brokenThisEra && manager.soulPerEra > 0) {
        setNews((n) => [...n, `MANAGER RESIGNS: ${manager.name} walks out in protest.`]);
        setManagerKey(null);
        charterWasBroken.current = charterBroken;
        setPhase("manager");
        return;
      }

      // Fan pressure: poor form long enough for the crowd to turn on the manager.
      if (latestForm < -2 && newTenure >= 2) {
        setPendingPressure({ kind: "fan_pressure", managerName: manager.name });
        charterWasBroken.current = charterBroken;
        setPhase("pressure");
        return;
      }

      // Rival interest: a bigger club wants your manager after a strong run.
      if (latestForm > 3 && manager.oddsMod > 1 && newTenure >= 2) {
        setPendingPressure({ kind: "rival_interest", managerName: manager.name });
        charterWasBroken.current = charterBroken;
        setPhase("pressure");
        return;
      }

      // Background departure: a quieter risk even in ordinary eras.
      // Skipped if the player has signed the manager to a long-term contract.
      if (newTenure >= 3 && !mgrContractLocked) {
        const chance = Math.min(0.12, 0.04 + (manager.oddsMod - 1) * 0.4);
        if (seedRng.current() < chance) {
          setNews((n) => [...n, `MANAGER LEAVES: ${manager.name} departs for bigger things.`]);
          setManagerKey(null);
          charterWasBroken.current = charterBroken;
          setPhase("manager");
          return;
        }
      }

      // Manager era event — a periodic decision about the ongoing relationship.
      const captainName = aged.find((p) => p.storyTag === "captain")?.name ?? "";
      const eligible = MGR_ERA_EVENTS.filter(
        (ev) => !(ev.once && firedMgrEvts.has(ev.id)) && ev.cond(newTenure, !!captainName)
      );
      if (eligible.length > 0 && seedRng.current() < 0.5) {
        const chosen = eligible[Math.floor(seedRng.current() * eligible.length)];
        setFiredMgrEvts((s) => new Set([...s, chosen.id]));
        setPendingMgrEvt({ id: chosen.id, managerName: manager.name, captainName });
        charterWasBroken.current = charterBroken;
        setPhase("mgrEvent");
        return;
      }
    }

    charterWasBroken.current = charterBroken;
    setPhase("scene");
  }

  function resolvePressure(fire: boolean) {
    const ev = pendingPressure!;
    setPendingPressure(null);
    if (ev.kind === "fan_pressure") {
      if (fire) {
        setMeters((m) => ({ ...m, fans: clamp(m.fans + 8), soul: clamp(m.soul - 3) }));
        setNews((n) => [...n, `SACKED: ${ev.managerName} leaves by mutual consent.`]);
        setManagerKey(null);
        setPhase("manager");
      } else {
        setMeters((m) => ({ ...m, fans: clamp(m.fans - 6), soul: clamp(m.soul + 3) }));
        setNews((n) => [...n, `BACKED: You've stood by ${ev.managerName}. The fans aren't happy.`]);
        setPhase("scene");
      }
    } else {
      if (fire) {
        setMeters((m) => ({ ...m, money: clamp(m.money + 6), fans: clamp(m.fans - 5) }));
        setNews((n) => [...n, `MANAGER LEAVES: ${ev.managerName} accepts the offer.`]);
        setManagerKey(null);
        setPhase("manager");
      } else {
        setMeters((m) => ({ ...m, money: clamp(m.money - 8), fans: clamp(m.fans + 4) }));
        setNews((n) => [...n, `RETAINED: ${ev.managerName} signs a new deal. It wasn't cheap.`]);
        setPhase("scene");
      }
    }
  }

  function resolveMgrEvent(choice: 0 | 1) {
    const ev = pendingMgrEvt!;
    setPendingMgrEvt(null);
    if (ev.id === "contract") {
      if (choice === 0) {
        setMeters((m) => ({ ...m, money: clamp(m.money - 10) }));
        setMgrContractLocked(true);
        setNews((n) => [...n, `CONTRACT: ${ev.managerName} signs a long-term deal.`]);
      } else {
        setNews((n) => [...n, `${ev.managerName} enters the final stretch of his contract.`]);
      }
    } else if (ev.id === "tactics") {
      if (choice === 0) {
        setMeters((m) => ({ ...m, money: clamp(m.money - 6), soul: clamp(m.soul + 5), fans: clamp(m.fans - 4) }));
        setNews((n) => [...n, `TACTICS: ${ev.managerName} introduces the new system.`]);
      } else {
        setMeters((m) => ({ ...m, soul: clamp(m.soul - 3), fans: clamp(m.fans + 4) }));
        setNews((n) => [...n, `${ev.managerName} keeps the current shape. Not everyone agrees.`]);
      }
    } else if (ev.id === "fallout") {
      if (choice === 0) {
        setMeters((m) => ({ ...m, fans: clamp(m.fans - 10), soul: clamp(m.soul - 3) }));
        setNews((n) => [...n, `${ev.managerName} drops ${ev.captainName} from the squad.`]);
      } else {
        setMeters((m) => ({ ...m, fans: clamp(m.fans + 8), soul: clamp(m.soul + 5) }));
        setNews((n) => [...n, `${ev.captainName} leads the side out. ${ev.managerName} is not pleased.`]);
      }
    }
    setPhase("scene");
  }

  // Compute the ending copy, record achievements, then show the ending screen.
  function finalizeRun(finalMeters: Meters) {
    const end = computeEnding(finalMeters, founding, trophies, charterBroken);
    const survived = finalMeters.soul > 0 && finalMeters.money > 0 && finalMeters.fans > 0;
    const score = seeded
      ? seededScore({ trophies, charterBroken, survived, soul: finalMeters.soul, fans: finalMeters.fans, money: finalMeters.money })
      : 0;
    const summary: RunSummary = {
      founding,
      trophies,
      charterBroken,
      meters: finalMeters,
      survived,
      movedOut,
      corporate,
      bestPosition,
      seeded,
      score,
    };
    setEnding(end);
    setEarned(recordRun(summary));
    // The century is over — there's nothing left to resume.
    clearSave();
    setResumable(false);
    setPhase("ending");
  }

  function playOneSeason() {
    const scene = scenes[current];
    const totalForEra = scene.seasons || 5;
    const isLast = seasonsLeft - 1 <= 0;

    // If this era has a big match, the FINAL season is played as a tap moment.
    if (isLast && scene.bigMatch) {
      setPendingMatch(scene.bigMatch);
      setPhase("match");
      return;
    }

    const r = playSeason(squad, manager?.oddsMod || 1, seedRng.current);
    const rew = seasonRewards(r, reach);
    if (r.won) {
      logEvent("Champions of the league.");
      // The biggest beat in the game gets a real celebration.
      setFlashText("CHAMPIONS!");
      setTimeout(() => setFlashText(null), 1300);
      sting("win");
    } else if (r.chance < 0.1) {
      // A wretched season lands with a small down-note.
      sting("loss");
    }

    // Work on local copies so the news event and end-of-era see fresh values.
    let nextMeters: Meters = {
      money: clamp(meters.money + rew.money),
      fans: clamp(meters.fans + rew.fans),
      soul: meters.soul,
    };
    let nextSquad = [...squad];
    let nextReach = reach;
    if (r.won) {
      setTrophies((t) => t + 1);
      nextReach = Math.min(100, nextReach + 4);
    }
    const latestForm = nextForm(form, formDelta(r));
    setForm(latestForm);

    // Roll a small news event most weeks.
    const ev = rollEvent({ era: current, meters: nextMeters, trophies, reach: nextReach }, seedRng.current);
    let newsLine: string | null = null;
    if (ev) {
      const ectx: EventCtx = {
        meters: nextMeters,
        squad: nextSquad,
        addPlayer: (p) => nextSquad.push(p),
        boostUnder: (age, by) => nextSquad.forEach((p) => { if (p.age < age) p.rating += by; }),
      };
      ev.apply(ectx);
      newsLine = ev.headline;
    }

    setMeters(nextMeters);
    setSquad(nextSquad);
    setReach(nextReach);
    if (newsLine) setNews((n) => [...n, newsLine as string]);

    const newSeasonInEra = seasonInEra + 1;
    const bits: string[] = [];
    if (rew.fans) bits.push(`${rew.fans > 0 ? "+" : ""}${rew.fans} fans`);
    if (rew.money) bits.push(`${rew.money > 0 ? "+" : ""}${rew.money} money`);
    const tag = bits.length ? ` · ${bits.join(", ")}` : "";
    setSeasonLog((log) => [
      ...log,
      { text: `Season ${newSeasonInEra} of ${totalForEra} — ${rew.label} (${Math.round(r.chance * 100)}% odds)${tag}`, cls: rew.cls },
    ]);
    setSeasonInEra(newSeasonInEra);
    setSeasonsLeft((s) => s - 1);

    if (isLast) {
      setTimeout(() => endOfEra(nextSquad, nextMeters, latestForm), 1100);
    }
  }

  // Resolve a tap-to-play match moment. `quality` 0..1 from the tap timing.
  function resolveMatch(success: boolean) {
    const m = pendingMatch;
    if (!m) return;
    const rew = success ? m.rewardWin : m.rewardLose;

    let nextMeters: Meters = {
      money: clamp(meters.money + rew.money),
      fans: clamp(meters.fans + rew.fans),
      soul: clamp(meters.soul + rew.soul),
    };
    let nextReach = reach;
    if (success && m.rewardWin.trophy) {
      setTrophies((t) => t + 1);
      nextReach = Math.min(100, nextReach + 6);
    }
    const latestForm = nextForm(form, success ? 3 : -2);
    setForm(latestForm);
    setReach(nextReach);
    setMeters(nextMeters);

    // Celebrate a won final; mark a lost one with a down-note.
    if (success) {
      setFlashText(m.rewardWin.trophy ? "TROPHY!" : "WON!");
      setTimeout(() => setFlashText(null), 1300);
      sting("win");
    } else {
      sting("loss");
    }

    const totalForEra = scenes[current].seasons || 5;
    setSeasonLog((log) => [
      ...log,
      {
        text: `${m.kind} — ${success ? "WON" : "lost"}${m.rewardWin.trophy && success ? " (trophy!)" : ""}`,
        cls: success ? "win" : "lose",
      },
    ]);
    setNews((n) => [...n, `${m.kind.toUpperCase()}: ${success ? "Glory. The city will remember this." : "Heartbreak at the death."}`]);
    logEvent(`${m.kind}: ${success ? "won" : "lost"}.`);
    setSeasonInEra((x) => x + 1);
    setSeasonsLeft(0);
    setPendingMatch(null);
    setPhase("seasons");
    setTimeout(() => endOfEra(squad, nextMeters, latestForm), 1300);
  }

  useEffect(() => {
    if (phase === "scene" && (meters.soul <= 0 || meters.money <= 0 || meters.fans <= 0)) {
      finalizeRun(meters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, meters]);

  function restart() {
    window.location.reload();
  }

  // =====================================================================
  // RENDER
  // =====================================================================
  const scene = scenes[current];
  const sceneTitle = phase === "scene" || phase === "seasons" ? scene?.sp : "";
  const yearLine = useMemo(() => {
    if (phase === "founding" || phase === "summary" || phase === "manager") return "1900 · Before the first season";
    if (scene) return scene.year.replace("{PLACE}", place);
    return "";
  }, [phase, scene, place]);

  // One-line narrative blurb for the current era's story players.
  const storyBlurb = useMemo(() => {
    const veteran = squad.find((p) => p.storyTag === "veteran");
    const captain = squad.find((p) => p.storyTag === "captain");
    const prospect = squad.find((p) => p.storyTag === "prospect");
    const parts: string[] = [];
    if (veteran) parts.push(`${veteran.name}, ${veteran.age}, the old warhorse, is in his final seasons.`);
    if (captain) parts.push(`${captain.name} leads the side.`);
    if (prospect) parts.push(`${prospect.name}, ${prospect.age}, is the new face from the academy.`);
    return parts.join("  ");
  }, [squad]);

  const hudGame = (
    <>
      <header className="hud">
        <h1 className="pix">MORE THAN A CLUB</h1>
        <div className="year">{yearLine}</div>
        <button className={`audio-btn${audioOn ? " on" : ""}`} onClick={toggleAudio} title="Toggle music">
          {audioOn ? "♫" : "♪"}
        </button>
      </header>
      <Stadium
        material={stadium.material}
        roof={stadium.roof}
        tiers={stadium.tiers}
        crowd={meters.fans}
        neighborhood={neighborhoodVal}
        lights={stadium.lights}
        movedOut={stadium.movedOut}
        corporate={stadium.corporate}
        radio={stadium.radio}
        tv={stadium.tv}
        night={lightsOn}
        mood={mood}
      />
      <MetersBar meters={meters} />
      <MoodMeter mood={mood} form={form} />
      <CultureStrip culture={culture} />
      <SquadPanel squad={squad} trophies={trophies} />
      <LeagueTable rows={table} />
      <ManagerPanel manager={manager} />
      <NewsTicker items={news} />
      <ReachStrip reach={reach} />
      <TechTimeline unlocked={unlockedTech} />
    </>
  );

  return (
    <div id="screen">
      {flashText && <div className="flash pix">{flashText}</div>}

      {phase === "boot" && (
        <BootScreen
          onStart={() => setPhase("founding")}
          onDaily={startSeeded}
          onResume={resumeSave}
          canResume={resumable}
        />
      )}

      {phase === "founding" && (
        <FoundingScreen step={foundingStep} founding={founding} onPick={pickFounding} onSeal={sealCharter} />
      )}

      {phase === "summary" && <SummaryScreen founding={founding} onBegin={beginCentury} />}

      {phase === "manager" && <ManagerScreen onHire={hireManager} />}

      {(phase === "scene" || phase === "seasons") && scene && (
        <>
          {hudGame}
          <div className="card" ref={cardRef}>
            <div className="sp">{sceneTitle}</div>
            {phase === "scene" && (
              <>
                <div className="pr">
                  {(typeof scene.pr === "function" ? scene.pr() : scene.pr).replace("${STR}", String(strength(squad)))}
                </div>
                <div className="ch">
                  {visibleChoices(scene).map((o) => {
                    const noteText = typeof o.note === "function" ? o.note() : o.note || "";
                    const d = previewChoice(o, meters, squad, founding);
                    return (
                      <button
                        key={o._idx}
                        className={`c ${o.conflict ? "conflict" : ""}`}
                        onClick={() => chooseOption(o._idx as number)}
                      >
                        {o.t}
                        <small>{noteText}</small>
                        <span className="deltas">
                          <MeterDelta label="Money" v={d.money || 0} />
                          <MeterDelta label="Soul" v={d.soul || 0} />
                          <MeterDelta label="Fans" v={d.fans || 0} />
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {phase === "seasons" && (
              <>
                <div className="fo">{sceneNote}</div>
                {storyBlurb && (
                  <div className="fo" style={{ fontStyle: "italic", color: "var(--muted)", marginBottom: 4 }}>
                    {storyBlurb}
                  </div>
                )}
                <div className="rollOut">
                  {seasonLog.map((l, i) => (
                    <div key={i} className={l.cls}>
                      {l.text}
                    </div>
                  ))}
                </div>
                {seasonsLeft > 0 ? (
                  <button className="nx" onClick={playOneSeason}>
                    {seasonsLeft === 1 && scene.bigMatch
                      ? `▶ ${scene.bigMatch.kind} — play it →`
                      : `Play season ${seasonInEra + 1} of ${scene.seasons} →`}
                  </button>
                ) : (
                  <div className="fo pix" style={{ fontSize: 10, color: "var(--green)" }}>
                    The era turns…
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {phase === "match" && pendingMatch && (
        <>
          {hudGame}
          <MatchMoment
            match={pendingMatch}
            baseOdds={Math.min(0.85, playSeason(squad, manager?.oddsMod || 1, () => 0.5).chance * 1.6)}
            speed={1.4 + current * 0.12}
            sweetHalfWidth={Math.min(20, 9 + Math.round((strength(squad) - 180) / 12) + (manager?.key === "showman" ? 4 : 0))}
            onResolve={resolveMatch}
          />
        </>
      )}

      {phase === "pressure" && pendingPressure && (
        <>
          {hudGame}
          <div ref={cardRef}>
            <PressureCard event={pendingPressure} onResolve={resolvePressure} />
          </div>
        </>
      )}

      {phase === "mgrEvent" && pendingMgrEvt && (
        <>
          {hudGame}
          <div ref={cardRef}>
            <ManagerEventCard event={pendingMgrEvt} onResolve={resolveMgrEvent} />
          </div>
        </>
      )}

      {phase === "ending" && ending && (
        <EndingScreen
          ending={ending}
          stadium={stadium}
          fans={meters.fans}
          neighborhood={neighborhoodVal}
          mood={mood}
          runLog={runLog}
          earned={earned}
          seeded={seeded}
          score={seeded ? seededScore({ trophies, charterBroken, survived: meters.soul > 0 && meters.money > 0 && meters.fans > 0, soul: meters.soul, fans: meters.fans, money: meters.money }) : 0}
          bestPosition={bestPosition}
          cultureSummary={
            culture < -20
              ? "A club that never forgot where it came from."
              : culture > 20
              ? "The founders would barely recognise what you built."
              : "You kept something of both worlds."
          }
          onRestart={restart}
        />
      )}
    </div>
  );
}

// =====================================================================
// SUB-SCREENS
// =====================================================================

// A single meter's predicted swing on a choice button: arrows scaled to size.
// Hidden when the swing is zero, so buttons only show what actually moves.
function MeterDelta({ label, v }: { label: string; v: number }) {
  if (!v) return null;
  const up = v > 0;
  const mag = Math.abs(v);
  const arrows = mag >= 25 ? 3 : mag >= 12 ? 2 : 1;
  return (
    <span className={`md ${up ? "up" : "down"}`} title={`${label} ${up ? "+" : ""}${v}`}>
      {label} {(up ? "▲" : "▼").repeat(arrows)}
    </span>
  );
}

function BootScreen({
  onStart,
  onDaily,
  onResume,
  canResume,
}: {
  onStart: () => void;
  onDaily: () => void;
  onResume: () => void;
  canResume: boolean;
}) {
  const unlocked = getUnlockedAchievements();
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <div className="intro-title">
        <h1 className="pix">
          MORE
          <br />
          THAN A
          <br />
          CLUB
        </h1>
      </div>
      <div className="intro-sub">A century in one club</div>
      <div className="intro-body" style={{ margin: "0 8px 18px" }}>
        <p>You run a sporting institution for 100 years, and the world keeps changing the rules underneath you.</p>
        <p>
          A handful of heavy decisions across a century, and you live with each one for the rest of the game. A choice
          in 1925 still bites in 1995. Money, soul, fans. None can hit zero.
        </p>
      </div>
      <div className="ch">
        {canResume && (
          <button className="c seal" onClick={onResume}>
            Continue your century <span className="blink">▌</span>
            <small>Pick up the saved run where you left off.</small>
          </button>
        )}
        <button className={canResume ? "c" : "c seal"} onClick={onStart}>
          Found a club {!canResume && <span className="blink">▌</span>}
        </button>
        <button className="c" onClick={onDaily}>
          Daily challenge
          <small>The same century for everyone today. One run. Beat your score.</small>
        </button>
      </div>
      {unlocked.length > 0 && (
        <div className="bootach pix">
          {unlocked.length} / {ACHIEVEMENTS.length} achievements earned
        </div>
      )}
    </div>
  );
}

function FoundingScreen({
  step,
  founding,
  onPick,
  onSeal,
}: {
  step: number;
  founding: Founding;
  onPick: (g: "region" | "story" | "rule", k: string) => void;
  onSeal: () => void;
}) {
  const f = foundingFlow[step];
  const data = (g: string, k: string) => (g === "region" ? REGIONS[k] : g === "story" ? STORIES[k] : RULES[k]);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <header className="hud">
        <h1 className="pix">FOUND A CLUB</h1>
        <div className="year">1900 · Before the first season</div>
      </header>
      <div className="card">
        <div className="sp">{f.sp}</div>
        <div className="pr">{f.pr}</div>
        <div className="ch">
          {f.keys.map((k) => {
            const opt: any = data(f.group, k);
            const chosen = f.multi && founding.rules.includes(k);
            return (
              <button key={k} className={`c ${chosen ? "chosen" : ""}`} onClick={() => onPick(f.group, k)}>
                {chosen ? "✓ " : ""}
                {opt.name}
                <small>{opt.flavor || opt.note}</small>
              </button>
            );
          })}
          {f.multi && (
            <>
              <div className="fo">
                {founding.rules.length === 0
                  ? "Swear at least one rule to continue."
                  : `${founding.rules.length} rule${founding.rules.length === 1 ? "" : "s"} sworn (max ${MAX_RULES}). Tap to toggle, then seal below.`}
              </div>
              <button className="c seal" disabled={founding.rules.length === 0} onClick={onSeal}>
                Seal the charter →
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryScreen({ founding, onBegin }: { founding: Founding; onBegin: () => void }) {
  const r = REGIONS[founding.region as string];
  const s = STORIES[founding.story as string];
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <header className="hud">
        <h1 className="pix">YOUR CLUB</h1>
        <div className="year">1900 · Before the first season</div>
      </header>
      <div className="card">
        <div className="sp">The founding</div>
        <div className="pr">
          <p style={{ marginTop: 0 }}>
            {r.place}. {s.name}. Charter: {ruleNames(founding)}.
          </p>
          <p style={{ color: "var(--muted)", fontStyle: "italic" }}>{r.flavor}</p>
        </div>
        <div className="ch">
          <button className="c seal" onClick={onBegin}>
            Appoint a manager →
          </button>
        </div>
      </div>
    </div>
  );
}

function ManagerScreen({ onHire }: { onHire: (key: string) => void }) {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <header className="hud">
        <h1 className="pix">THE DUGOUT</h1>
        <div className="year">Appoint your first manager</div>
      </header>
      <div className="card">
        <div className="sp">Who runs the team?</div>
        <div className="pr" style={{ flex: "none", marginBottom: 8 }}>
          You hold the institution; the manager holds the team. Their style shapes your odds and how your own players
          grow. You can keep them all century, or the world may force a change.
        </div>
        <div className="ch">
          {MANAGERS.map((m) => (
            <button key={m.key} className="c" onClick={() => onHire(m.key)}>
              {m.name} · {m.style}
              <small>{m.blurb}</small>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Tap-to-play match moment: a moving bar; tap near the sweet spot for quality.
// A juiced-up tap-to-shoot moment. A pixel goal with a keeper; a marker sweeps
// across the goalmouth; tap to shoot at whatever third the marker is over. The
// keeper dives somewhere, and you score if you placed it away from the dive and
// timed it cleanly. Sweet-spot width and bar speed scale with squad/manager and
// the era, so your boardroom choices make the moment easier or harder.
function MatchMoment({
  match,
  baseOdds,
  speed,
  sweetHalfWidth,
  onResolve,
}: {
  match: BigMatch;
  baseOdds: number; // 0..1 squad+manager strength
  speed: number; // marker speed (px-per-frame), climbs with era
  sweetHalfWidth: number; // half-width of the good zone in %, wider = easier
  onResolve: (success: boolean) => void;
}) {
  const [pos, setPos] = useState(0); // 0..100 marker position
  const [phase, setPhase] = useState<"aim" | "shot" | "result">("aim");
  const [result, setResult] = useState<{ success: boolean; ballX: number; keeperX: number } | null>(null);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (phase !== "aim") return;
    let p = 0;
    let d = 1;
    const tick = () => {
      p += d * speed;
      if (p >= 100) {
        p = 100;
        d = -1;
      }
      if (p <= 0) {
        p = 0;
        d = 1;
      }
      setPos(p);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [phase, speed]);

  function shoot() {
    if (phase !== "aim") return;
    if (raf.current) cancelAnimationFrame(raf.current);
    setPhase("shot");

    // One coherent model that matches what the player sees:
    //  - You stop the sweeping aim line at `pos` (0..100 across the goal).
    //  - The keeper commits to one third and dives there.
    //  - You score by placing the ball away from the keeper's dive.
    //  - "Clean strike" = you stopped the line near a deliberate spot (a corner
    //    or the centre), rather than catching it mid-sweep. Clean timing lets
    //    you commit confidently; sloppy timing wobbles the placement.
    //
    // The keeper reaches a band around where they dove. The width of that band
    // is what difficulty tunes: a clean shot placed outside the band is a goal,
    // a shot into the band is saved, and only genuinely marginal shots fall to
    // squad strength.

    // Nearest deliberate target (corner or centre) and how cleanly we hit it.
    const targets = [10, 50, 90];
    const nearestTarget = targets.reduce((a, b) =>
      Math.abs(b - pos) < Math.abs(a - pos) ? b : a
    );
    const aimError = Math.abs(pos - nearestTarget);
    // sweetHalfWidth scales the timing window: inside it = a committed, clean strike.
    const cleanStrike = aimError <= sweetHalfWidth;
    // Sloppy timing pushes the ball toward the middle of the goal (toward the keeper-friendly zone).
    const placedPos = cleanStrike
      ? pos
      : pos + (50 - pos) * Math.min(1, (aimError - sweetHalfWidth) / 25);

    // Keeper dives to one of three thirds. A stronger squad earns a keeper that
    // guesses your side slightly less often (better penalty taker draws the dive away).
    const keeperGuess = 20 + Math.floor(Math.random() * 3) * 30; // 20, 50, 80
    // Reach band: balanced difficulty. Keeper saves anything within ~18 of the dive.
    const reachBand = 18;
    const distFromKeeper = Math.abs(keeperGuess - placedPos);

    let success: boolean;
    if (distFromKeeper >= reachBand && cleanStrike) {
      // Well placed away from the dive, struck cleanly: goal.
      success = true;
    } else if (distFromKeeper < reachBand - 4) {
      // Hit right where the keeper went: saved.
      success = false;
    } else {
      // Marginal — clipped the edge of the reach, or placed well but timed poorly.
      // Resolve with squad strength plus a bonus for how far from the keeper it landed.
      const placement = Math.min(1, distFromKeeper / 50);
      success = Math.random() < Math.min(0.95, baseOdds * 0.6 + placement * 0.5);
    }

    // Animate: ball flies to where it was actually placed, keeper dives to guess.
    setResult({ success, ballX: placedPos, keeperX: keeperGuess });
    setTimeout(() => setPhase("result"), 650);
    setTimeout(() => onResolve(success), 1700);
  }

  // Build the pixel goal scene as an SVG.
  const goalSvg = (() => {
    const PXX = 4;
    const GW = 120;
    const GH = 70;
    const r: string[] = [];
    const rect = (x: number, y: number, w: number, h: number, f: string, o?: number) =>
      r.push(`<rect x="${x * PXX}" y="${y * PXX}" width="${w * PXX}" height="${h * PXX}" fill="${f}"${o != null ? ` opacity="${o}"` : ""} shape-rendering="crispEdges"/>`);
    // night sky + crowd haze
    rect(0, 0, GW, GH, "#0c1322");
    rect(0, 0, GW, 14, "#15203a");
    // distant crowd specks
    let s = 99;
    const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff), s / 0x7fffffff);
    for (let i = 0; i < 180; i++) {
      const cx = Math.floor(rnd() * GW);
      const cy = Math.floor(rnd() * 12);
      rect(cx, cy, 1, 1, ["#e0a93a", "#6fd06a", "#59a6d6", "#d96a8e", "#e8f0d8"][Math.floor(rnd() * 5)], 0.8);
    }
    // grass
    rect(0, 40, GW, GH - 40, "#2f7d3a");
    for (let i = 0; i < 8; i++) rect(i * 16, 40, 8, GH - 40, "#2a7034", 0.5);
    // goal frame
    const gx = 22;
    const gy = 14;
    const gw = 76;
    const gh = 26;
    rect(gx, gy, gw, 2, "#e8eef0"); // crossbar
    rect(gx, gy, 2, gh, "#e8eef0"); // left post
    rect(gx + gw - 2, gy, 2, gh, "#e8eef0"); // right post
    // net hint
    for (let i = gx + 4; i < gx + gw - 2; i += 4) rect(i, gy + 2, 1, gh - 2, "#9fb6c4", 0.25);
    for (let j = gy + 4; j < gy + gh; j += 4) rect(gx + 2, j, gw - 4, 1, "#9fb6c4", 0.2);
    // thirds markers along the goal line (aim guide)
    const goalLeft = gx + 4;
    const goalSpan = gw - 8;
    const markerX = goalLeft + (pos / 100) * goalSpan;
    // sweet zone shading (centre)
    const sweetL = goalLeft + ((50 - sweetHalfWidth) / 100) * goalSpan;
    const sweetW = (sweetHalfWidth * 2 / 100) * goalSpan;
    if (phase === "aim") rect(Math.round(sweetL), gy + gh - 3, Math.round(sweetW), 2, "#6fd06a", 0.5);

    // keeper
    const kx = result ? goalLeft + (result.keeperX / 100) * goalSpan : gx + gw / 2 - 3;
    const ky = gy + gh - 10;
    const diving = phase === "result" && result;
    if (diving) {
      // sprawled keeper
      rect(Math.round(kx) - 2, ky + 6, 8, 2, "#e0a93a");
      rect(Math.round(kx), ky + 3, 3, 4, "#e0a93a");
      rect(Math.round(kx), ky + 1, 2, 2, "#f0d0c0");
    } else {
      rect(Math.round(kx), ky, 3, 6, "#e0a93a");
      rect(Math.round(kx), ky - 2, 2, 2, "#f0d0c0");
      rect(Math.round(kx) - 1, ky + 1, 5, 1, "#e0a93a"); // arms out
    }

    // ball: at the spot (penalty mark) while aiming, flying to target on shot
    if (phase === "aim") {
      rect(gx + gw / 2 - 1, 54, 2, 2, "#f4f4f0");
      // aim marker line
      rect(Math.round(markerX), gy + 2, 1, gh - 2, "#f2c14e", 0.9);
      rect(Math.round(markerX) - 1, gy + gh - 2, 3, 2, "#f2c14e");
    } else if (result) {
      const bx = goalLeft + (result.ballX / 100) * goalSpan;
      const by = result.success ? gy + 6 : ky + 1;
      rect(Math.round(bx) - 1, Math.round(by), 2, 2, "#f4f4f0");
      // trail
      rect(gx + gw / 2 - 1, 54, 2, 2, "#f4f4f0", 0.3);
    }
    return `<svg viewBox="0 0 ${GW * PXX} ${GH * PXX}" width="100%" style="display:block;image-rendering:pixelated">${r.join("")}</svg>`;
  })();

  // The ENTIRE moment area is one big tap target. Tapping anywhere (the goal,
  // the button, the whole card) stops the sweeping marker and shoots in one
  // action — so you watch the goal and tap when the aim line is where you want,
  // no reaching for a separate button.
  return (
    <div
      className="card matchcard"
      style={{ cursor: phase === "aim" ? "pointer" : "default", userSelect: "none" }}
      onClick={shoot}
    >
      <div className="sp">{match.kind}</div>
      <div className="pr" style={{ flex: "none", marginBottom: 8 }}>
        {match.setup}
      </div>
      {phase === "aim" && (
        <div className="matchprompt pix" style={{ marginBottom: 6 }}>
          The aim line sweeps across the goal. Tap when it&apos;s where you want the ball.
        </div>
      )}
      <div
        style={{ border: "2px solid var(--line)", boxShadow: "var(--shadow)", lineHeight: 0, marginBottom: 10 }}
        dangerouslySetInnerHTML={{ __html: goalSvg }}
      />
      {phase === "result" && result ? (
        <div
          className="pix"
          style={{ textAlign: "center", fontSize: 18, color: result.success ? "var(--green)" : "var(--red)", marginBottom: 8 }}
        >
          {result.success ? "GOAL!" : "SAVED"}
        </div>
      ) : phase === "aim" ? (
        <button className="nx" style={{ pointerEvents: "none" }}>
          TAP ANYWHERE TO SHOOT ▶
        </button>
      ) : (
        <div className="matchprompt pix">…</div>
      )}
    </div>
  );
}

function EndingScreen({
  ending,
  stadium,
  fans,
  neighborhood,
  mood,
  runLog,
  earned,
  seeded,
  score,
  bestPosition,
  cultureSummary,
  onRestart,
}: {
  ending: { title: string; body: string; caption: string };
  stadium: StadiumState;
  fans: number;
  neighborhood: number;
  mood: Mood;
  runLog: { year: string; text: string }[];
  earned: { newlyEarned: string[]; all: string[] } | null;
  seeded: boolean;
  score: number;
  bestPosition: number;
  cultureSummary: string;
  onRestart: () => void;
}) {
  const newKeys = new Set(earned?.newlyEarned || []);
  const earnedThisRun = ACHIEVEMENTS.filter((a) => (earned?.all || []).includes(a.key) && newKeys.has(a.key));
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      <header className="hud">
        <h1 className="pix">THE CENTURY ENDS</h1>
        <div className="year">2024 · A hundred years on</div>
      </header>
      <Stadium
        material={stadium.material}
        roof={stadium.roof}
        tiers={stadium.tiers}
        crowd={fans}
        neighborhood={neighborhood}
        lights={stadium.lights}
        movedOut={stadium.movedOut}
        corporate={stadium.corporate}
        radio={stadium.radio}
        tv={stadium.tv}
        night={stadium.lights}
        mood={mood}
      />
      <div className="card">
        <div className="sp">After a hundred years</div>
        <div className="pr" style={{ flex: "none" }}>
          <p className="pix" style={{ fontSize: 12, color: "var(--gold)", lineHeight: 1.8 }}>
            {ending.title}
          </p>
          <p>{ending.body}</p>
          <p style={{ color: "var(--muted)", fontSize: 13 }}>{ending.caption}</p>
          <p style={{ color: "var(--muted)", fontSize: 13, fontStyle: "italic" }}>{cultureSummary}</p>
          <p style={{ color: "var(--green)", fontSize: 13 }}>
            Best league finish: {bestPosition === 1 ? "1st" : bestPosition === 2 ? "2nd" : bestPosition === 3 ? "3rd" : "4th"}
          </p>
          {seeded && (
            <p className="pix" style={{ fontSize: 11, color: "var(--amber)" }}>
              Daily score: {score}
            </p>
          )}
        </div>

        {earnedThisRun.length > 0 && (
          <div className="panel ach">
            <h3>Achievement unlocked</h3>
            {earnedThisRun.map((a) => (
              <div className="achrow" key={a.key}>
                <span className="achname">★ {a.name}</span>
                <span className="achdesc">{a.desc}</span>
              </div>
            ))}
          </div>
        )}

        <div className="panel history">
          <h3>The century, decision by decision</h3>
          {runLog.map((l, i) => (
            <div className="histrow" key={i}>
              <span className="histyear">{l.year}</span>
              <span className="histtext">{l.text}</span>
            </div>
          ))}
        </div>

        <div className="ch">
          <button className="c seal" onClick={onRestart}>
            Found another club →
          </button>
        </div>
      </div>
    </div>
  );
}

function PressureCard({
  event,
  onResolve,
}: {
  event: PressureEvent;
  onResolve: (fire: boolean) => void;
}) {
  if (event.kind === "fan_pressure") {
    return (
      <div className="card">
        <div className="sp">The boardroom</div>
        <div className="pr">
          A delegation from the supporters&apos; trust has been waiting outside. The form has been
          unacceptable. They want {event.managerName} gone before the next era starts.
        </div>
        <div className="ch">
          <button className="c" onClick={() => onResolve(true)}>
            Sack him. The fans come first.
            <small>Fans recover. Soul takes a knock. Back to the dugout.</small>
          </button>
          <button className="c" onClick={() => onResolve(false)}>
            Back him. Give him another era.
            <small>The fans are furious for now. Soul holds. He stays.</small>
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="card">
      <div className="sp">The phone</div>
      <div className="pr">
        A bigger club has called about {event.managerName}. They&apos;re offering him the kind of
        project he&apos;s always wanted. He hasn&apos;t said yes — but he hasn&apos;t said no.
      </div>
      <div className="ch">
        <button className="c" onClick={() => onResolve(false)}>
          Fight to keep him. Offer a new contract.
          <small>Costs money. He stays. The fans are glad.</small>
        </button>
        <button className="c" onClick={() => onResolve(true)}>
          Wish him well. Take the compensation.
          <small>He goes. A little money comes back. Back to the dugout.</small>
        </button>
      </div>
    </div>
  );
}

function ManagerEventCard({
  event,
  onResolve,
}: {
  event: PendingMgrEvt;
  onResolve: (choice: 0 | 1) => void;
}) {
  const def = MGR_ERA_EVENTS.find((e) => e.id === event.id)!;
  const pr = def.getPr(event.managerName, event.captainName);
  return (
    <div className="card">
      <div className="sp">{def.sp}</div>
      <div className="pr">{pr}</div>
      <div className="ch">
        <button className="c" onClick={() => onResolve(0)}>
          {def.ch0}
          <small>{def.note0}</small>
        </button>
        <button className="c" onClick={() => onResolve(1)}>
          {def.ch1}
          <small>{def.note1}</small>
        </button>
      </div>
    </div>
  );
}
