"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Meters, Player, Founding, FlagKey, RunContext, Mood, Manager, BigMatch } from "@/lib/types";
import { REGIONS } from "@/lib/regions";
import { STORIES, RULES } from "@/lib/charter";
import { scenes, bindSceneHooks } from "@/lib/scenes";
import { MANAGERS, managerByKey } from "@/lib/managers";
import { rollEvent, type EventCtx } from "@/lib/events";
import { leagueTable, playerPosition, RIVALS } from "@/lib/rivals";
import { ACHIEVEMENTS, recordRun, getUnlockedAchievements, type RunSummary } from "@/lib/progress";
import { mulberry32, seedFromString, todaySeedString, seededFounding, seededScore } from "@/lib/seed";
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
  computeEnding,
  moodFromForm,
  formDelta,
  nextForm,
  deriveStadium,
} from "@/lib/engine";
import Stadium from "@/components/Stadium";
import { MetersBar, SquadPanel, ReachStrip, TechTimeline, MoodMeter, ManagerPanel, NewsTicker, LeagueTable } from "@/components/Hud";

type Phase = "boot" | "founding" | "summary" | "manager" | "scene" | "seasons" | "match" | "ending";

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
  const [news, setNews] = useState<string[]>([]);

  // Season run-through state.
  const [seasonInEra, setSeasonInEra] = useState(0);
  const [seasonsLeft, setSeasonsLeft] = useState(0);
  const [seasonLog, setSeasonLog] = useState<{ text: string; cls: string }[]>([]);
  const [sceneNote, setSceneNote] = useState("");
  const [flashText, setFlashText] = useState<string | null>(null);

  // Match-moment state.
  const [pendingMatch, setPendingMatch] = useState<BigMatch | null>(null);

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
  const place = founding.region ? REGIONS[founding.region].place : "";
  const manager = managerByKey(managerKey);
  const mood: Mood = moodFromForm(form);
  const lightsOn = unlockedTech.has("floodlights");
  const neighborhoodVal = movedOut
    ? clamp(Math.round(meters.fans * 0.2))
    : clamp(Math.round(meters.fans * 0.6 + meters.soul * 0.4));
  const stadium = deriveStadium({ era: current, rebuilt, newStand, movedOut, corporate, lights: lightsOn });
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
  function endOfEra(latestSquad: Player[], latestMeters: Meters) {
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
      finalizeRun(withMgr);
    } else {
      setPhase("scene");
    }
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
    if (r.won) logEvent("Champions of the league.");

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
    setForm((f) => nextForm(f, formDelta(r)));

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
      setTimeout(() => endOfEra(nextSquad, nextMeters), 1100);
    }
  }

  // Resolve a tap-to-play match moment. `quality` 0..1 from the tap timing.
  function resolveMatch(quality: number) {
    const m = pendingMatch;
    if (!m) return;
    // Base on squad odds, lifted by tap quality.
    const base = playSeason(squad, manager?.oddsMod || 1, seedRng.current).chance;
    const success = seedRng.current() < Math.min(0.92, base + quality * 0.55);
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
    setForm((f) => nextForm(f, success ? 3 : -2));
    setReach(nextReach);
    setMeters(nextMeters);

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
    setTimeout(() => endOfEra(squad, nextMeters), 1300);
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

  const hudGame = (
    <>
      <header className="hud">
        <h1 className="pix">MORE THAN A CLUB</h1>
        <div className="year">{yearLine}</div>
      </header>
      <Stadium
        built={stadium.built}
        crowd={meters.fans}
        neighborhood={neighborhoodVal}
        lights={stadium.lights}
        movedOut={stadium.movedOut}
        corporate={stadium.corporate}
        night={lightsOn}
        mood={mood}
      />
      <MetersBar meters={meters} />
      <MoodMeter mood={mood} form={form} />
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

      {phase === "boot" && <BootScreen onStart={() => setPhase("founding")} onDaily={startSeeded} />}

      {phase === "founding" && (
        <FoundingScreen step={foundingStep} founding={founding} onPick={pickFounding} onSeal={sealCharter} />
      )}

      {phase === "summary" && <SummaryScreen founding={founding} onBegin={beginCentury} />}

      {phase === "manager" && <ManagerScreen onHire={hireManager} />}

      {(phase === "scene" || phase === "seasons") && scene && (
        <>
          {hudGame}
          <div className="card">
            <div className="sp">{sceneTitle}</div>
            {phase === "scene" && (
              <>
                <div className="pr">
                  {(typeof scene.pr === "function" ? scene.pr() : scene.pr).replace("${STR}", String(strength(squad)))}
                </div>
                <div className="ch">
                  {visibleChoices(scene).map((o) => {
                    const noteText = typeof o.note === "function" ? o.note() : o.note || "";
                    return (
                      <button
                        key={o._idx}
                        className={`c ${o.conflict ? "conflict" : ""}`}
                        onClick={() => chooseOption(o._idx as number)}
                      >
                        {o.t}
                        <small>{noteText}</small>
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {phase === "seasons" && (
              <>
                <div className="fo">{sceneNote}</div>
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
          <MatchMoment match={pendingMatch} onResolve={resolveMatch} />
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
          onRestart={restart}
        />
      )}
    </div>
  );
}

// =====================================================================
// SUB-SCREENS
// =====================================================================

function BootScreen({ onStart, onDaily }: { onStart: () => void; onDaily: () => void }) {
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
        <button className="c seal" onClick={onStart}>
          Found a club <span className="blink">▌</span>
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
function MatchMoment({ match, onResolve }: { match: BigMatch; onResolve: (quality: number) => void }) {
  const [pos, setPos] = useState(0);
  const [dir, setDir] = useState(1);
  const [done, setDone] = useState(false);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    let p = 0;
    let d = 1;
    const tick = () => {
      p += d * 1.7;
      if (p >= 100) {
        p = 100;
        d = -1;
      }
      if (p <= 0) {
        p = 0;
        d = 1;
      }
      setPos(p);
      setDir(d);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, []);

  function tap() {
    if (done) return;
    setDone(true);
    if (raf.current) cancelAnimationFrame(raf.current);
    // Sweet spot is the centre (50). Quality is how close you stopped.
    const quality = Math.max(0, 1 - Math.abs(pos - 50) / 50);
    setTimeout(() => onResolve(quality), 500);
  }

  return (
    <div className="card matchcard">
      <div className="sp">{match.kind}</div>
      <div className="pr" style={{ flex: "none", marginBottom: 14 }}>
        {match.setup}
      </div>
      <div className="matchbar" onClick={tap}>
        <div className="matchtrack">
          <div className="matchsweet" />
          <div className="matchmarker" style={{ left: `${pos}%` }} />
        </div>
      </div>
      <div className="matchprompt pix">{done ? "…" : match.prompt}</div>
      {!done && (
        <button className="nx" onClick={tap}>
          STRIKE ▶
        </button>
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
  onRestart,
}: {
  ending: { title: string; body: string; caption: string };
  stadium: { built: number; movedOut: boolean; corporate: boolean; lights: boolean };
  fans: number;
  neighborhood: number;
  mood: Mood;
  runLog: { year: string; text: string }[];
  earned: { newlyEarned: string[]; all: string[] } | null;
  seeded: boolean;
  score: number;
  bestPosition: number;
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
        built={stadium.built}
        crowd={fans}
        neighborhood={neighborhood}
        lights={stadium.lights}
        movedOut={stadium.movedOut}
        corporate={stadium.corporate}
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
