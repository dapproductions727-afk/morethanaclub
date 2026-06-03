"use client";

import type { Mood, StadiumMaterial, StadiumRoof } from "@/lib/types";

// The evolving pixel ground. Pure SVG, no assets. Each decision in the game
// bolts a new visible feature onto the structure, the way the floodlights do:
// open wooden bleachers become a covered stand, then brick, then concrete with
// a cantilever roof, then a glass cathedral. Radio adds a broadcast mast; TV
// adds a tower and camera gantry. A club that refuses to modernise stays as
// humble bleachers all century, and that refusal is visible too.

interface StadiumProps {
  material: StadiumMaterial;
  roof: StadiumRoof;
  tiers: number;
  crowd: number; // 0..100
  neighborhood: number; // 0..100
  lights: boolean;
  movedOut: boolean;
  corporate: boolean;
  radio: boolean;
  tv: boolean;
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

export default function Stadium({
  material,
  roof,
  tiers,
  crowd,
  neighborhood,
  lights,
  movedOut,
  corporate,
  radio,
  tv,
  night,
  mood,
}: StadiumProps) {
  const a: string[] = [];
  const R = (x: number, y: number, w: number, h: number, f: string, o?: number) =>
    a.push(
      `<rect x="${x * PX}" y="${y * PX}" width="${w * PX}" height="${h * PX}" fill="${f}"${
        o != null ? ` opacity="${o}"` : ""
      } shape-rendering="crispEdges"/>`
    );

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
  if (night) {
    ([[12, 3], [28, 6], [44, 2], [60, 5], [78, 3], [96, 7], [110, 4], [120, 2], [18, 9], [88, 9]] as [number, number][]).forEach(
      ([x, y]) => R(x, y, 1, 1, "#cdd6e6")
    );
    R(104, 5, 3, 3, "#e8eaf0");
    R(105, 5, 2, 3, "#f2f4fa");
  } else {
    R(102, 4, 6, 6, "#ffe9a0");
    R(103, 3, 4, 8, "#ffe9a0", 0.5);
    R(20, 5, 10, 2, "#7e96ad", 0.5);
    R(24, 4, 6, 2, "#8aa2b8", 0.5);
    R(70, 7, 12, 2, "#7e96ad", 0.4);
  }
  // skyline
  const sky2 = night ? "#0c1322" : "#2f4a63";
  for (let i = 0; i < 14; i++) {
    const bx = 2 + i * 9;
    const bh = 3 + ((i * 7) % 5);
    R(bx, 18 - bh, 7, bh, sky2);
    if (night && i % 3 === 0) R(bx + 2, 18 - bh + 1, 1, 1, "#caa84a");
  }

  // radio mast (behind stand, with signal waves)
  if (radio) {
    const mx = 20;
    R(mx, 2, 1, 16, "#8a9098");
    R(mx - 1, 2, 3, 1, "#aab0b8");
    R(mx - 2, 5, 5, 1, "#8a9098", 0.7);
    R(mx - 1, 9, 3, 1, "#8a9098", 0.7);
    R(mx + 3, 3, 1, 1, "#f2c14e", 0.9);
    R(mx + 5, 2, 1, 1, "#f2c14e", 0.6);
    R(mx + 4, 5, 1, 1, "#f2c14e", 0.7);
    R(mx - 3, 3, 1, 1, "#f2c14e", 0.9);
    R(mx - 5, 2, 1, 1, "#f2c14e", 0.6);
    R(mx - 4, 5, 1, 1, "#f2c14e", 0.7);
  }
  // TV broadcast tower (behind stand, taller, with dish)
  if (tv) {
    const tx = 108;
    R(tx, 1, 1, 17, "#9aa0a8");
    R(tx - 1, 1, 3, 1, "#b0b6be");
    R(tx - 2, 4, 5, 1, "#7e848c", 0.7);
    R(tx - 2, 8, 5, 1, "#7e848c", 0.7);
    R(tx - 2, 12, 5, 1, "#7e848c", 0.7);
    R(tx + 1, 3, 2, 2, "#cfd6dc");
    R(tx + 3, 3, 1, 2, "#e8eef4", 0.8);
    if (night) R(tx, 0, 1, 1, "#d9472e");
  }

  // houses / emptied lots
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
  if (movedOut) {
    R(54, 18, 18, 4, "#241f1b");
    R(56, 16, 3, 2, "#352c25");
    R(64, 17, 2, 1, "#352c25");
    R(69, 16, 2, 2, "#2c241e");
    R(54, 22, 18, 1, "#15110d");
  }

  const standBot = 31;
  const standTop =
    tiers === 2 ? 13 : material === "glass" ? 15 : material === "concrete" ? 17 : material === "brick" ? 19 : material === "wood" ? 21 : 23;

  // materials
  if (material === "bleacher") {
    R(12, standBot - 9, 104, 9, "#3d7a42", 0.5); // grass bank shade
    for (let s = 0; s < 5; s++) {
      const yy = standBot - 1 - s * 2;
      R(13, yy, 102, 1, "#9a6e3c");
      R(13, yy + 1, 102, 1, "#6b4a28");
    }
    for (let lx = 16; lx <= 112; lx += 16) R(lx, standBot - 1, 1, 2, "#5a3c22");
    R(11, standBot - 9, 2, 10, "#5a3c22");
    R(115, standBot - 9, 2, 10, "#5a3c22");
  } else if (material === "wood") {
    R(10, standTop, 108, standBot - standTop, "#7a5530");
    for (let i = 0; i < 108; i += 2) R(10 + i, standTop, 1, standBot - standTop, "#6b4a28");
  } else if (material === "brick") {
    R(8, standTop, 112, standBot - standTop, "#7c3b2c");
    for (let i = 0; i < 112; i += 4) R(8 + i, standTop, 1, standBot - standTop, "#6a3024");
    for (let j = standTop; j < standBot; j += 2) R(8, j, 112, 1, "#8a4636", 0.5);
  } else if (material === "concrete") {
    R(4, standTop, 120, standBot - standTop, "#6e6a62");
    R(4, standTop, 120, 1, "#8a857a");
    R(4, standTop + 3, 120, 1, "#56524a", 0.6);
  } else if (material === "glass") {
    const base = corporate ? "#5a6068" : "#6f7d92";
    const hi = corporate ? "#8a929c" : "#a6b6cc";
    R(2, standTop, 124, standBot - standTop, base);
    R(2, standTop, 124, 2, hi);
    for (let i = 0; i < 15; i++) R(6 + i * 8, standTop + 3, 6, standBot - standTop - 6, corporate ? "#6fa6c0" : "#9fd0e6");
    for (let i = 0; i < 15; i++) R(6 + i * 8, standTop + 3, 6, 1, "#cfe8f4", 0.7);
  }

  // second tier (new stand)
  if (tiers === 2 && material !== "bleacher") {
    const tTop = standTop - 6;
    const col = material === "glass" ? (corporate ? "#4a5058" : "#5f6d82") : material === "concrete" ? "#5c584f" : "#6a3024";
    R(6, tTop, 116, 6, col);
    R(6, tTop, 116, 1, "#8a929c", 0.5);
  }

  // roofs
  const roofRef = tiers === 2 ? standTop - 6 : standTop;
  if (roof === "wood") {
    R(8, standTop - 2, 112, 2, "#8a6038");
    R(8, standTop - 3, 112, 1, "#5a3c22");
  } else if (roof === "pitch") {
    R(4, standTop - 3, 120, 3, "#9a4f3a");
    R(4, standTop - 4, 120, 1, "#5e2e22");
  } else if (roof === "cantilever") {
    R(2, roofRef - 4, 124, 4, "#4a4640");
    R(2, roofRef - 4, 124, 1, "#726c60");
    R(2, roofRef - 1, 124, 1, "#322e28");
  } else if (roof === "glass") {
    const hi = corporate ? "#8a929c" : "#a6b6cc";
    R(0, roofRef - 5, 128, 5, corporate ? "#3c4147" : "#4a5260");
    R(0, roofRef - 5, 128, 1, hi);
  }
  if ((material === "brick" || material === "wood") && roof !== "none") {
    R(12, standTop, 1, standBot - standTop, "#2e2620", 0.5);
    R(116, standTop, 1, standBot - standTop, "#2e2620", 0.5);
  }

  // TV camera gantry on the roof
  if (tv) {
    const gy = roofRef - (roof === "cantilever" || roof === "glass" ? 5 : 4);
    R(40, gy - 2, 3, 2, "#2a2e34");
    R(41, gy - 3, 1, 1, "#59a6d6");
    R(84, gy - 2, 3, 2, "#2a2e34");
    R(85, gy - 3, 1, 1, "#59a6d6");
    R(40, gy, 1, 2, "#3a3e44");
    R(86, gy, 1, 2, "#3a3e44");
  }

  // scoreboard from concrete on
  if (material === "concrete" || material === "glass") {
    const sy = roofRef - 4;
    R(56, sy, 16, 4, "#0d1410");
    R(56, sy, 16, 1, "#2a3a2a");
    R(58, sy + 1, 2, 2, "#e0a93a");
    R(61, sy + 1, 2, 2, "#e0a93a");
    R(66, sy + 1, 2, 2, "#6fd06a");
    R(69, sy + 1, 1, 2, "#6fd06a");
  }

  // crowd with clustering + standing figures
  const baseRows = material === "bleacher" ? 4 : material === "wood" ? 4 : material === "brick" ? 5 : 6;
  const cols = 56;
  let seed = 1337 + material.length * 13;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  const crowdTop = material === "bleacher" ? standBot - 9 : standTop + 1;
  const crowdBot = standBot - 1;
  for (let row = 0; row < baseRows; row++) {
    const cy = crowdTop + row * ((crowdBot - crowdTop) / baseRows);
    const depth = 0.7 + (row / baseRows) * 0.3;
    for (let col = 0; col < cols; col++) {
      const cx = 11 + col * 2 + (row % 2);
      if (cx > 118) continue;
      const edge = 1 - (Math.abs(col - cols / 2) / (cols / 2)) * 0.3;
      const wave = 0.75 + 0.25 * Math.sin(col / 6 + row * 1.3);
      if (rnd() < fillP * edge * depth * wave) {
        const c2 = cc[Math.floor(rnd() * cc.length)];
        R(cx, Math.round(cy), 1, 1, c2);
        if ((mood === "ecstatic" || mood === "buoyant") && rnd() < 0.06) R(cx, Math.round(cy) - 1, 1, 1, c2);
      }
    }
  }
  if (tiers === 2 && material !== "bleacher") {
    const utop = standTop - 5;
    for (let col = 0; col < cols; col++) {
      const cx = 11 + col * 2;
      if (cx > 118) continue;
      if (rnd() < fillP * 0.8 * (0.75 + 0.25 * Math.sin(col / 5))) R(cx, utop, 1, 1, cc[Math.floor(rnd() * cc.length)]);
    }
  }

  // floodlights
  if (lights) {
    const lt = tiers === 2 ? standTop - 6 : standTop;
    R(12, 3, 1, lt - 3, "#9aa0a6");
    R(11, 2, 1, lt - 2, "#7e848a", 0.6);
    R(8, 1, 8, 3, "#cfd6dc");
    R(115, 3, 1, lt - 3, "#9aa0a6");
    R(114, 2, 1, lt - 2, "#7e848a", 0.6);
    R(112, 1, 8, 3, "#cfd6dc");
    if (night) {
      R(8, 4, 8, 2, "#fff4c0", 0.5);
      R(6, 6, 12, 2, "#fff4c0", 0.18);
      R(112, 4, 8, 2, "#fff4c0", 0.5);
      R(110, 6, 12, 2, "#fff4c0", 0.18);
    }
  }

  // corporate band
  if (corporate) {
    R(0, 33, W, 3, "#0c0f16");
    for (let i = 0; i < 13; i++) R(2 + i * 10, 34, 7, 1, i % 2 ? "#d9472e" : "#59a6d6");
    R(0, 33, W, 1, "#1a2030");
  }

  // pitch
  const pt = 37;
  R(0, pt, W, H - pt, grass);
  for (let i = 0; i < 8; i++) R(i * 16, pt, 8, H - pt, i % 2 ? grassDk : grassLt, 0.5);
  R(0, pt, W, 2, "#1a1d22");
  if (corporate) {
    for (let i = 0; i < 16; i++) R(i * 8, pt, 6, 1, i % 2 ? "#d9472e" : "#e0a93a", 0.8);
  } else {
    for (let i = 0; i < 16; i++) R(i * 8, pt, 6, 1, "#c8b27a", 0.4);
  }
  const m = "#e6f2e6";
  R(63, pt + 2, 1, H - pt - 2, m, 0.85);
  R(56, pt + 14, 16, 1, m, 0.85);
  R(56, pt + 22, 16, 1, m, 0.85);
  R(55, pt + 15, 1, 7, m, 0.85);
  R(72, pt + 15, 1, 7, m, 0.85);
  R(0, pt + 10, 10, 1, m, 0.7);
  R(0, pt + 22, 10, 1, m, 0.7);
  R(10, pt + 10, 1, 12, m, 0.7);
  R(118, pt + 10, 10, 1, m, 0.7);
  R(118, pt + 22, 10, 1, m, 0.7);
  R(118, pt + 10, 1, 12, m, 0.7);
  R(0, pt + 14, 2, 4, "#f0f6f0");
  R(126, pt + 14, 2, 4, "#f0f6f0");
  const reds: [number, number][] = [[30, pt + 8], [44, pt + 18], [22, pt + 24], [54, pt + 12]];
  const blues: [number, number][] = [[80, pt + 10], [92, pt + 20], [70, pt + 26], [100, pt + 14]];
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
  R(48, pt + 15, 1, 1, "#f0d0c0");
  R(48, pt + 16, 1, 2, "#e0d040");
  R(60, pt + 16, 1, 1, "#f4f4f0");

  const svg = `<svg viewBox="0 0 ${W * PX} ${H * PX}" width="100%" style="display:block;image-rendering:pixelated" role="img" aria-label="The club's ground">${a.join(
    ""
  )}</svg>`;

  const animClass =
    mood === "furious" ? "stad-furious"
    : mood === "ecstatic" ? "stad-ecstatic"
    : night && lights ? "stad-lit"
    : night ? "stad-night"
    : "stad-day";

  return (
    <div
      className={animClass}
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
