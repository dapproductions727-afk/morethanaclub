"use client";

import { useState } from "react";
import type { Meters, Player, Mood, Manager } from "@/lib/types";
import { strength, titleChance, meterLabels, TECHS, MOOD_LABEL, MOOD_COLOR, cultureLabel } from "@/lib/engine";

export function MoodMeter({ mood, form }: { mood: Mood; form: number }) {
  // five faces on a strip, the active one lit.
  const order: Mood[] = ["furious", "restless", "content", "buoyant", "ecstatic"];
  const activeIdx = order.indexOf(mood);
  return (
    <div className="panel mood">
      <h3>Fan mood · {MOOD_LABEL[mood]}</h3>
      <div className="moodstrip">
        {order.map((m, i) => (
          <span
            key={m}
            className={`moodseg ${i === activeIdx ? "on" : ""}`}
            style={{ background: i === activeIdx ? MOOD_COLOR[m] : "#0a0d09" }}
            title={MOOD_LABEL[m]}
          />
        ))}
      </div>
    </div>
  );
}

export function ManagerPanel({ manager }: { manager: Manager | null }) {
  if (!manager) return null;
  return (
    <div className="panel mgr">
      <h3>Manager · {manager.style}</h3>
      <div className="mgrname">{manager.name}</div>
      <div className="mgrblurb">{manager.blurb}</div>
    </div>
  );
}

export function LeagueTable({
  rows,
}: {
  rows: { name: string; strength: number; isPlayer: boolean }[];
}) {
  return (
    <div className="panel league">
      <h3>The league</h3>
      {rows.map((r, i) => (
        <div className={`leaguerow ${r.isPlayer ? "you" : ""}`} key={r.name}>
          <span className="pos">{i + 1}</span>
          <span className="lname">{r.name}</span>
          <span className="lstr">{r.strength}</span>
        </div>
      ))}
    </div>
  );
}

export function NewsTicker({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="panel ticker">
      <h3>Club news</h3>
      {items.slice(-3).map((t, i) => (
        <div className="tickline" key={i}>
          ▸ {t}
        </div>
      ))}
    </div>
  );
}

export function MetersBar({ meters }: { meters: Meters }) {
  return (
    <div className="meters">
      {(Object.keys(meterLabels) as (keyof Meters)[]).map((k) => {
        const v = Math.max(0, Math.min(100, meters[k]));
        return (
          <div className={`meter ${k}`} key={k}>
            <div className="row">
              <span>{meterLabels[k]}</span>
              <span className="val">{Math.round(v)}</span>
            </div>
            <div className="bar">
              <span style={{ width: `${v}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function SquadPanel({ squad, trophies }: { squad: Player[]; trophies: number }) {
  const sorted = [...squad].sort((a, b) => b.rating - a.rating);
  const xi = sorted.slice(0, 11);
  const bench = sorted.slice(11);
  const s = strength(squad);
  const chance = titleChance(s);
  const pct = Math.min(100, Math.max(0, ((s - 100) / 200) * 100));
  const leaguePct = ((215 - 100) / 200) * 100;
  const barColor = s >= 215 ? "var(--gold)" : "var(--green)";

  return (
    <div className="panel squad">
      <h3>
        Starting XI ({squad.length} squad) · {trophies} trophy{trophies === 1 ? "" : "s"}
      </h3>
      {xi.map((p, i) => (
        <div className={`player ${p.foreign ? "foreign" : ""}`} key={`${p.name}-${i}`}>
          <span className="name">
            {p.name}{" "}
            <span className="tag">
              {p.age}y
              {p.foreign ? " · foreign" : ""}
              {p.storyTag === "captain" ? " · ★" : p.storyTag === "prospect" ? " · ↑" : p.storyTag === "veteran" ? " · vet" : ""}
            </span>
          </span>
          <span className="rate">{p.rating}</span>
        </div>
      ))}
      {bench.length > 0 && <div className="bench">+{bench.length} on the bench</div>}

      <div className="strength">
        <span>
          Strength <b>{s}</b>
        </span>
        <span>title odds ~{Math.round(chance * 100)}%</span>
      </div>
      <div className="strbar">
        <div className="track">
          <span style={{ width: `${pct}%`, background: barColor }} />
        </div>
        <div className="mark" style={{ left: `${leaguePct}%` }} />
        <div className="marklabel" style={{ left: `${leaguePct}%` }}>
          league
        </div>
      </div>
    </div>
  );
}

export function CultureStrip({ culture }: { culture: number }) {
  const label = cultureLabel(culture);
  const clamped = Math.max(-50, Math.min(50, culture));
  const pct = ((clamped + 50) / 100) * 100;
  const color = culture < -15 ? "var(--green)" : culture > 15 ? "var(--red)" : "var(--amber)";
  return (
    <div className="panel">
      <h3>Identity · {label}</h3>
      <div className="strbar">
        <div className="track">
          <span style={{ width: `${pct}%`, background: color }} />
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "var(--muted)", marginTop: 2 }}>
        <span>roots</span>
        <span>commercial</span>
      </div>
    </div>
  );
}

export function ReachStrip({ reach }: { reach: number }) {
  const tiers = ["The district", "The city", "The nation", "The continent", "The world"];
  const lit = Math.round(reach / 20);
  const label = tiers[Math.min(4, Math.max(0, lit - 1))] || "The district";
  return (
    <div className="panel reach">
      <h3>Reach · {label}</h3>
      <div className="dots">
        {Array.from({ length: 5 }).map((_, i) => (
          <span className={`dot ${i < lit ? "lit" : ""}`} key={i} />
        ))}
      </div>
      <div className="pct">{reach} / 100 — global reach</div>
    </div>
  );
}

export function TechTimeline({ unlocked }: { unlocked: Set<string> }) {
  // Show in chronological order by year.
  const ordered = [...TECHS].sort((a, b) => Number(a.year) - Number(b.year));
  const [selected, setSelected] = useState<string | null>(null);
  const active = ordered.find((t) => t.key === selected) ?? null;
  return (
    <div className="panel tech">
      <h3>Technology</h3>
      <div className="chips">
        {ordered.map((t) => (
          <button
            type="button"
            className={`chip ${unlocked.has(t.key) ? "on" : ""} ${selected === t.key ? "sel" : ""}`}
            key={t.key}
            title={t.blurb}
            aria-pressed={selected === t.key}
            onClick={() => setSelected((cur) => (cur === t.key ? null : t.key))}
          >
            {t.name} {unlocked.has(t.key) ? `'${t.year.slice(2)}` : "—"}
          </button>
        ))}
      </div>
      {active && (
        <div className="tech-history">
          <div className="tech-history-head">
            <strong>{active.name}</strong>
            <span className="tech-history-year">{active.year}</span>
            {!unlocked.has(active.key) && <span className="tech-history-lock">not yet unlocked</span>}
          </div>
          <p className="tech-history-blurb">{active.blurb}</p>
          <p className="tech-history-body">{active.history}</p>
        </div>
      )}
    </div>
  );
}
