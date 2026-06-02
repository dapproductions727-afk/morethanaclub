import type { Manager } from "./types";

// Managers you hire between eras. Each is a tactical bet: better odds now vs.
// developing your own players, or holding the club's soul. A light
// Championship Manager touch on top of the boardroom game.

export const MANAGERS: Manager[] = [
  {
    key: "tracksuit",
    name: "The tracksuit coach",
    style: "Youth & graft",
    blurb: "Came up through the club. Believes in the academy and the long game. The locals trust him.",
    oddsMod: 0.95,
    youthBonus: 2,
    soulPerEra: 3,
    fansPerEra: 1,
  },
  {
    key: "tactician",
    name: "The continental tactician",
    style: "System & control",
    blurb: "Notebooks, video, a back three nobody understands yet. Wins more, costs more, feels less like yours.",
    oddsMod: 1.12,
    youthBonus: 0,
    soulPerEra: -2,
    fansPerEra: 1,
  },
  {
    key: "showman",
    name: "The showman",
    style: "Attack & spectacle",
    blurb: "Cavalier football, end to end, the crowd loves it even when it loses. Defends like a saloon door.",
    oddsMod: 1.08,
    youthBonus: 0,
    soulPerEra: 0,
    fansPerEra: 4,
  },
  {
    key: "sergeant",
    name: "The old sergeant",
    style: "Defence & discipline",
    blurb: "Hard to beat, hard to watch. Grinds out 1–0s and keeps you up when the wheels come off.",
    oddsMod: 1.04,
    youthBonus: 1,
    soulPerEra: 1,
    fansPerEra: -1,
  },
];

export function managerByKey(key: string | null): Manager | null {
  if (!key) return null;
  return MANAGERS.find((m) => m.key === key) || null;
}
