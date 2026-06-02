"use client";

import type { Mood } from "@/lib/types";

// The evolving pixel stadium. Pure SVG, no assets. It now reads the club's
// accumulated DECISIONS, not just the clock: rebuild and it grows, move out and
// the old ground is demolished and rebuilt beyond an empty car park, sell to
// the fund and a sterile glass bowl goes up with corporate signage. The crowd
// colour follows the fans' mood. This is the "growth you can see" from the
// design doc, swapped illustration by illustration as the century turns.

interface StadiumProps {
  built: number; // 0 wooden, 1 brick terrace, 2 concrete bowl, 3 glass cathedral
  crowd: number; // 0..100, drives how many spectator pixels show
  neighborhood: number; // 0..100, houses vs emptied lot
  lights: boolean;
  movedOut: boolean; // demolished old ground, built out of town
  corporate: boolean; // sold to the fund: signage + sterile look
  night: boolean;
  mood: Mood;
}

const PX = 4;

function Rect({
  x,
  y,
  w,
  h,
  fill,
  opacity,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  opacity?: number;
}) {
  return (
    <rect
      x={x * PX}
      y={y * PX}
      width={w * PX}
      height={h * PX}
      fill={fill}
      opacity={opacity}
      shapeRendering="crispEdges"
    />
  );
}

const MOOD_CROWD: Record<Mood, string[]> = {
  furious: ["#d9472e", "#a83320", "#e0a93a"],
  restless: ["#e0a93a", "#d9472e", "#c8b27a"],
  content: ["#7e9173", "#e0a93a", "#9fb38f"],
  buoyant: ["#6fd06a", "#e0a93a", "#59a6d6"],
  ecstatic: ["#f2c14e", "#6fd06a", "#59a6d6", "#d96a8e", "#e8f0d8"],
};

export default function Stadium({
  built,
  crowd,
  neighborhood,
  lights,
  movedOut,
  corporate,
  night,
  mood,
}: StadiumProps) {
  const W = 110;
  const H = 60;

  const sky = night ? "#0a0f1c" : "#2a3a4d";
  const skyHi = night ? "#11182e" : "#3c5168";
  const grass = corporate ? "#3a8f45" : "#2f7d3a";
  const grassDk = corporate ? "#2f7d3a" : "#256630";

  // Crowd density and colour-by-mood.
  const crowdRows = 3;
  const crowdCols = 22;
  const fillCount = Math.round((crowd / 100) * crowdRows * crowdCols);
  const crowdColors = MOOD_CROWD[mood];
  const crowdDots: { x: number; y: number; on: boolean }[] = [];
  let idx = 0;
  for (let r = 0; r < crowdRows; r++) {
    for (let col = 0; col < crowdCols; col++) {
      crowdDots.push({ x: 8 + col * 4, y: 8 + r * 3, on: idx < fillCount });
      idx++;
    }
  }

  const houseCount = Math.round((neighborhood / 100) * 9);

  return (
    <div
      style={{
        border: "2px solid var(--line)",
        boxShadow: "var(--shadow)",
        background: "#000",
        marginBottom: 12,
        lineHeight: 0,
        position: "relative",
      }}
    >
      <svg
        viewBox={`0 0 ${W * PX} ${H * PX}`}
        width="100%"
        style={{ display: "block", imageRendering: "pixelated" }}
        role="img"
        aria-label="The club's ground"
      >
        {/* sky */}
        <Rect x={0} y={0} w={W} h={H} fill={sky} />
        <Rect x={0} y={0} w={W} h={18} fill={skyHi} />

        {night ? (
          <>
            <Rect x={14} y={4} w={1} h={1} fill="#cdd6e6" />
            <Rect x={30} y={7} w={1} h={1} fill="#cdd6e6" />
            <Rect x={70} y={3} w={1} h={1} fill="#cdd6e6" />
            <Rect x={92} y={6} w={1} h={1} fill="#cdd6e6" />
            <Rect x={84} y={10} w={2} h={2} fill="#f2c14e" />
          </>
        ) : (
          <Rect x={88} y={5} w={5} h={5} fill="#f2c14e" />
        )}

        {/* neighborhood behind the far stand */}
        {Array.from({ length: 9 }).map((_, i) => {
          const hx = 6 + i * 11;
          const has = i < houseCount;
          return (
            <g key={`h${i}`}>
              {has ? (
                <>
                  <Rect x={hx} y={13} w={8} h={6} fill="#3a2e2a" />
                  <Rect x={hx} y={11} w={8} h={2} fill="#5a3a2e" />
                  <Rect x={hx + 2} y={15} w={2} h={2} fill={night ? "#e0a93a" : "#1c1410"} />
                </>
              ) : (
                // emptied lot: flat car park slab + a parked car pixel
                <>
                  <Rect x={hx} y={17} w={8} h={2} fill="#2c2c2c" />
                  <Rect x={hx + 2} y={16} w={3} h={1} fill="#444" />
                </>
              )}
            </g>
          );
        })}

        {/* When moved out, draw a demolished stub of the old ground in the gap */}
        {movedOut && (
          <>
            <Rect x={48} y={16} w={14} h={3} fill="#2a2420" />
            <Rect x={50} y={14} w={3} h={2} fill="#3a322c" />
            <Rect x={57} y={15} w={2} h={1} fill="#3a322c" />
          </>
        )}

        {/* far stand — grows by built tier */}
        {built === 0 && <Rect x={6} y={19} w={98} h={4} fill="#6b4a2c" />}
        {built === 1 && (
          <>
            <Rect x={6} y={17} w={98} h={6} fill="#7a3b2c" />
            <Rect x={6} y={17} w={98} h={1} fill="#9a4f3a" />
          </>
        )}
        {built === 2 && (
          <>
            <Rect x={4} y={15} w={102} h={8} fill="#5b6066" />
            <Rect x={4} y={15} w={102} h={1} fill="#7a8088" />
            {/* a simple scoreboard */}
            <Rect x={48} y={9} w={14} h={5} fill="#15110c" />
            <Rect x={50} y={11} w={2} h={1} fill="#e0a93a" />
            <Rect x={54} y={11} w={2} h={1} fill="#e0a93a" />
            <Rect x={58} y={11} w={2} h={1} fill="#e0a93a" />
          </>
        )}
        {built === 3 && (
          <>
            <Rect x={2} y={12} w={106} h={11} fill={corporate ? "#6b7280" : "#7d8aa0"} />
            <Rect x={2} y={12} w={106} h={2} fill={corporate ? "#9aa3ad" : "#aebccf"} />
            {Array.from({ length: 12 }).map((_, i) => (
              <Rect key={`g${i}`} x={6 + i * 8} y={15} w={5} h={5} fill={corporate ? "#7fb8d0" : "#9fd0e6"} />
            ))}
          </>
        )}

        {/* Corporate signage band when sold to the fund */}
        {corporate && (
          <>
            <Rect x={0} y={24} w={W} h={3} fill="#10131a" />
            {/* repeating sponsor blocks */}
            {Array.from({ length: 11 }).map((_, i) => (
              <Rect key={`s${i}`} x={2 + i * 10} y={25} w={6} h={1} fill={i % 2 ? "#d9472e" : "#59a6d6"} />
            ))}
          </>
        )}

        {/* crowd dots, coloured by mood */}
        {crowdDots.map((d, i) =>
          d.on ? <Rect key={`c${i}`} x={d.x} y={d.y} w={1} h={1} fill={crowdColors[i % crowdColors.length]} /> : null
        )}

        {/* floodlights */}
        {lights && (
          <>
            <Rect x={10} y={4} w={1} h={16} fill="#9aa0a6" />
            <Rect x={7} y={2} w={7} h={3} fill="#cfd6dc" />
            <Rect x={99} y={4} w={1} h={16} fill="#9aa0a6" />
            <Rect x={96} y={2} w={7} h={3} fill="#cfd6dc" />
            {night && (
              <>
                <Rect x={7} y={5} w={7} h={1} fill="#f6e8a0" opacity={0.6} />
                <Rect x={96} y={5} w={7} h={1} fill="#f6e8a0" opacity={0.6} />
              </>
            )}
          </>
        )}

        {/* pitch */}
        <Rect x={0} y={34} w={W} h={26} fill={grass} />
        {Array.from({ length: 6 }).map((_, i) => (
          <Rect key={`st${i}`} x={i * 20} y={34} w={10} h={26} fill={grassDk} />
        ))}
        <Rect x={54} y={34} w={1} h={26} fill="#cfe6cf" />
        <Rect x={50} y={44} w={9} h={1} fill="#cfe6cf" />
        <Rect x={50} y={49} w={9} h={1} fill="#cfe6cf" />
        <Rect x={50} y={45} w={1} h={4} fill="#cfe6cf" />
        <Rect x={58} y={45} w={1} h={4} fill="#cfe6cf" />
        <Rect x={1} y={43} w={1} h={8} fill="#e8f0d8" />
        <Rect x={108} y={43} w={1} h={8} fill="#e8f0d8" />

        {/* two tiny pixel players */}
        <Rect x={32} y={45} w={2} h={3} fill="#d9472e" />
        <Rect x={74} y={47} w={2} h={3} fill="#59a6d6" />
        <Rect x={53} y={46} w={1} h={1} fill="#e8f0d8" />
      </svg>
    </div>
  );
}
