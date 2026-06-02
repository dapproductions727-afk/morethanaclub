"use client";

import type { Mood } from "@/lib/types";

// The evolving pixel stadium. Pure SVG, no assets. It reads the club's
// accumulated DECISIONS, not just the clock: rebuild and it grows, move out and
// the old ground is demolished beyond an empty car park, sell to the fund and a
// sterile glass bowl goes up with corporate signage. The crowd is dense, multi-
// row, and coloured by the fans' mood. The pitch has stripes, markings, players,
// a ref and a ball. This is the "growth you can see" from the design doc.

interface StadiumProps {
  built: number; // 0 wooden, 1 brick terrace, 2 concrete bowl, 3 glass cathedral
  crowd: number; // 0..100
  neighborhood: number; // 0..100
  lights: boolean;
  movedOut: boolean;
  corporate: boolean;
  night: boolean;
  mood: Mood;
}

const PX = 5;
const W = 128;
const H = 72;

const MOOD_CROWD: Record<Mood, string[]> = {
  furious: ["#d9472e", "#a83320", "#c0563a", "#7a2418"],
  restless: ["#e0a93a", "#d9472e", "#c8943a", "#b07a2a"],
  content: ["#7e9173", "#9fb38f", "#6f8466", "#e0a93a"],
  buoyant: ["#6fd06a", "#8fe08a", "#4fa84a", "#e0a93a"],
  ecstatic: ["#f2c14e", "#6fd06a", "#59a6d6", "#d96a8e", "#e8f0d8", "#f29d4e"],
};

// Tiny seeded RNG so the crowd is stable per render (no flicker).
function makeRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

export default function Stadium({ built, crowd, neighborhood, lights, movedOut, corporate, night, mood }: StadiumProps) {
  const rects: string[] = [];
  const R = (x: number, y: number, w: number, h: number, fill: string, o?: number) => {
    rects.push(
      `<rect x="${x * PX}" y="${y * PX}" width="${w * PX}" height="${h * PX}" fill="${fill}"${
        o != null ? ` opacity="${o}"` : ""
      } shape-rendering="crispEdges"/>`
    );
  };

  const sky = night ? "#0a0e1a" : "#3a5570";
  const skyHi = night ? "#141d33" : "#587896";
  const skyMid = night ? "#0f1626" : "#48688a";
  const grass = corporate ? "#3f9a4a" : "#34843d";
  const grassDk = corporate ? "#358a40" : "#2a7034";
  const grassLt = corporate ? "#4aa854" : "#3d9447";
  const cc = MOOD_CROWD[mood];
  const fillP = crowd / 100;
  const houseCount = Math.round((neighborhood / 100) * 11);

  // sky
  R(0, 0, W, H, sky);
  R(0, 0, W, 8, skyHi);
  R(0, 8, W, 6, skyMid);

  // sun / moon + stars / clouds
  if (night) {
    const stars: [number, number][] = [[12, 3], [28, 6], [44, 2], [60, 5], [78, 3], [96, 7], [110, 4], [120, 2], [18, 9], [88, 9]];
    stars.forEach(([sx, sy]) => R(sx, sy, 1, 1, "#cdd6e6"));
    R(104, 5, 3, 3, "#e8eaf0");
    R(105, 5, 2, 3, "#f2f4fa");
  } else {
    R(102, 4, 6, 6, "#ffe9a0");
    R(103, 3, 4, 8, "#ffe9a0", 0.5);
    R(20, 5, 10, 2, "#7e96ad", 0.5);
    R(24, 4, 6, 2, "#8aa2b8", 0.5);
    R(70, 7, 12, 2, "#7e96ad", 0.4);
  }

  // distant skyline
  const sky2 = night ? "#0c1322" : "#2f4a63";
  for (let i = 0; i < 14; i++) {
    const bx = 2 + i * 9;
    const bh = 3 + ((i * 7) % 5);
    R(bx, 18 - bh, 7, bh, sky2);
    if (night && i % 3 === 0) R(bx + 2, 18 - bh + 1, 1, 1, "#caa84a");
  }

  // terraced houses / emptied lots
  for (let i = 0; i < 11; i++) {
    const hx = 3 + i * 11;
    if (i < houseCount) {
      R(hx, 15, 9, 8, "#4a342a");
      R(hx, 13, 9, 2, "#6a3e2c");
      R(hx - 1, 13, 1, 2, "#5a3424");
      R(hx + 3, 17, 2, 3, night ? "#e8b84a" : "#241810");
      R(hx + 6, 17, 1, 3, night ? "#caa040" : "#1c130c");
      R(hx, 22, 9, 1, "#2a1d16");
    } else {
      R(hx, 20, 9, 3, "#222426");
      R(hx + 1, 19, 3, 1, "#3a4048");
      R(hx + 5, 19, 2, 1, "#48323a");
    }
  }

  // demolished stub if moved out
  if (movedOut) {
    R(54, 18, 18, 4, "#241f1b");
    R(56, 16, 3, 2, "#352c25");
    R(64, 17, 2, 1, "#352c25");
    R(69, 16, 2, 2, "#2c241e");
    R(54, 22, 18, 1, "#15110d");
  }

  // ===== main stand =====
  const standTop = built >= 3 ? 14 : built >= 2 ? 17 : built >= 1 ? 20 : 23;
  const standBot = 31;
  if (built === 0) {
    R(8, standTop, 112, standBot - standTop, "#7a5530");
    for (let i = 0; i < 112; i += 2) R(8 + i, standTop, 1, standBot - standTop, "#6b4a28");
    R(6, standTop - 2, 116, 2, "#8a6038");
    R(6, standTop - 3, 116, 1, "#5a3c22");
  } else if (built === 1) {
    R(6, standTop, 116, standBot - standTop, "#7c3b2c");
    for (let i = 0; i < 116; i += 4) R(6 + i, standTop, 1, standBot - standTop, "#6a3024");
    for (let j = standTop; j < standBot; j += 2) R(6, j, 116, 1, "#8a4636", 0.5);
    R(4, standTop - 3, 120, 3, "#9a4f3a");
    R(4, standTop - 4, 120, 1, "#5e2e22");
  } else if (built === 2) {
    R(4, standTop, 120, standBot - standTop, "#5e646b");
    R(4, standTop, 120, 1, "#7c838c");
    R(4, standTop + 3, 120, 1, "#4a5057", 0.6);
    R(2, standTop - 4, 124, 4, "#41464c");
    R(2, standTop - 4, 124, 1, "#6a7178");
    R(2, standTop - 1, 124, 1, "#2e3237");
  } else {
    const base = corporate ? "#5a6068" : "#6f7d92";
    const hi = corporate ? "#8a929c" : "#a6b6cc";
    R(2, standTop, 124, standBot - standTop, base);
    R(2, standTop, 124, 2, hi);
    for (let i = 0; i < 15; i++) R(6 + i * 8, standTop + 3, 6, standBot - standTop - 6, corporate ? "#6fa6c0" : "#9fd0e6");
    for (let i = 0; i < 15; i++) R(6 + i * 8, standTop + 3, 6, 1, "#cfe8f4", 0.7);
    R(0, standTop - 5, 128, 5, corporate ? "#3c4147" : "#4a5260");
    R(0, standTop - 5, 128, 1, hi);
  }

  // pillars
  if (built >= 1 && built <= 2) {
    R(10, standTop, 1, standBot - standTop, "#2e2620", 0.5);
    R(118, standTop, 1, standBot - standTop, "#2e2620", 0.5);
    R(64, standTop, 1, standBot - standTop, "#2e2620", 0.4);
  }

  // scoreboard
  if (built >= 2) {
    R(56, standTop - 4, 16, 4, "#0d1410");
    R(56, standTop - 4, 16, 1, "#2a3a2a");
    R(58, standTop - 3, 2, 2, "#e0a93a");
    R(61, standTop - 3, 2, 2, "#e0a93a");
    R(66, standTop - 3, 2, 2, "#6fd06a");
    R(69, standTop - 3, 1, 2, "#6fd06a");
  }

  // banners (only when the crowd isn't a sterile corporate bowl)
  if (!corporate) {
    const flagcols = ["#d9472e", "#e0a93a", "#6fd06a", "#59a6d6", "#d96a8e"];
    for (let i = 0; i < 12; i++) R(8 + i * 10, standBot - 1, 3, 2, flagcols[i % flagcols.length]);
  }

  // crowd: dense, multi-row, depth-faded, mood-coloured
  const rows = built >= 2 ? 6 : built >= 1 ? 5 : 4;
  const cols = 56;
  const rng = makeRng(1337 + built * 7);
  for (let row = 0; row < rows; row++) {
    const cy = standTop + 1 + row * ((standBot - standTop - 1) / rows);
    // back rows (low row index) a touch sparser for depth
    const depth = 0.7 + (row / rows) * 0.3;
    for (let col = 0; col < cols; col++) {
      const cx = 9 + col * 2 + (row % 2);
      if (cx > 120) continue;
      const edge = 1 - (Math.abs(col - cols / 2) / (cols / 2)) * 0.35;
      if (rng() < fillP * edge * depth) {
        R(cx, Math.round(cy), 1, 1, cc[Math.floor(rng() * cc.length)]);
      }
    }
  }

  // turnstiles
  R(14, standBot, 4, 1, "#2a2420");
  R(58, standBot, 6, 1, "#2a2420");
  R(108, standBot, 4, 1, "#2a2420");

  // floodlights
  if (lights) {
    R(12, 3, 1, standTop - 3, "#9aa0a6");
    R(11, 2, 1, standTop - 2, "#7e848a", 0.6);
    R(8, 1, 8, 3, "#cfd6dc");
    R(115, 3, 1, standTop - 3, "#9aa0a6");
    R(114, 2, 1, standTop - 2, "#7e848a", 0.6);
    R(112, 1, 8, 3, "#cfd6dc");
    if (night) {
      R(8, 4, 8, 2, "#fff4c0", 0.5);
      R(6, 6, 12, 2, "#fff4c0", 0.18);
      R(112, 4, 8, 2, "#fff4c0", 0.5);
      R(110, 6, 12, 2, "#fff4c0", 0.18);
    }
  }

  // corporate sponsor band
  if (corporate) {
    R(0, 33, W, 3, "#0c0f16");
    for (let i = 0; i < 13; i++) R(2 + i * 10, 34, 7, 1, i % 2 ? "#d9472e" : "#59a6d6");
    R(0, 33, W, 1, "#1a2030");
  }

  // ===== pitch =====
  const pitchTop = 37;
  R(0, pitchTop, W, H - pitchTop, grass);
  for (let i = 0; i < 8; i++) R(i * 16, pitchTop, 8, H - pitchTop, i % 2 ? grassDk : grassLt, 0.5);
  R(0, pitchTop, W, 2, "#1a1d22");
  if (corporate) {
    for (let i = 0; i < 16; i++) R(i * 8, pitchTop, 6, 1, i % 2 ? "#d9472e" : "#e0a93a", 0.8);
  } else {
    for (let i = 0; i < 16; i++) R(i * 8, pitchTop, 6, 1, "#c8b27a", 0.4);
  }
  const mLine = "#e6f2e6";
  R(63, pitchTop + 2, 1, H - pitchTop - 2, mLine, 0.85);
  R(56, pitchTop + 14, 16, 1, mLine, 0.85);
  R(56, pitchTop + 22, 16, 1, mLine, 0.85);
  R(55, pitchTop + 15, 1, 7, mLine, 0.85);
  R(72, pitchTop + 15, 1, 7, mLine, 0.85);
  R(0, pitchTop + 10, 10, 1, mLine, 0.7);
  R(0, pitchTop + 22, 10, 1, mLine, 0.7);
  R(10, pitchTop + 10, 1, 12, mLine, 0.7);
  R(118, pitchTop + 10, 10, 1, mLine, 0.7);
  R(118, pitchTop + 22, 10, 1, mLine, 0.7);
  R(118, pitchTop + 10, 1, 12, mLine, 0.7);
  R(0, pitchTop + 14, 2, 4, "#f0f6f0");
  R(126, pitchTop + 14, 2, 4, "#f0f6f0");

  // players, ref, ball
  const reds: [number, number][] = [[30, pitchTop + 8], [44, pitchTop + 18], [22, pitchTop + 24], [54, pitchTop + 12]];
  const blues: [number, number][] = [[80, pitchTop + 10], [92, pitchTop + 20], [70, pitchTop + 26], [100, pitchTop + 14]];
  reds.forEach(([px, py]) => {
    R(px, py, 1, 1, "#f0d0c0");
    R(px, py + 1, 2, 2, "#d9472e");
    R(px, py + 3, 2, 1, "#1a1a1a");
  });
  blues.forEach(([px, py]) => {
    R(px, py, 1, 1, "#f0d0c0");
    R(px, py + 1, 2, 2, "#3a6fd0");
    R(px, py + 3, 2, 1, "#1a1a1a");
  });
  R(48, pitchTop + 15, 1, 1, "#f0d0c0");
  R(48, pitchTop + 16, 1, 2, "#e0d040");
  R(60, pitchTop + 16, 1, 1, "#f4f4f0");

  const svg = `<svg viewBox="0 0 ${W * PX} ${H * PX}" width="100%" style="display:block;image-rendering:pixelated" role="img" aria-label="The club's ground">${rects.join(
    ""
  )}</svg>`;

  return (
    <div
      style={{
        border: "2px solid var(--line)",
        boxShadow: "var(--shadow)",
        background: "#000",
        marginBottom: 12,
        lineHeight: 0,
      }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
