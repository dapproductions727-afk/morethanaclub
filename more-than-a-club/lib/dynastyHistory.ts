// Append-only clubs wall: every finished century is recorded here so the
// player can see the dynasty they're building across runs.

const DYNASTY_KEY = "mtac.dynasty.v1";
const MAX_CLUBS = 20;

export interface ClubRecord {
  region: string;
  story: string;
  rules: string[];
  trophies: number;
  charterBroken: boolean;
  survived: boolean;
  endingTitle: string;
  soul: number;
  fans: number;
  money: number;
  foundedLabel: string;
  endedAt: number;
  seeded?: boolean;
}

function toRoman(n: number): string {
  const vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const syms = ["M", "CM", "D", "CD", "C", "XC", "L", "XL", "X", "IX", "V", "IV", "I"];
  let result = "";
  let remaining = n;
  for (let i = 0; i < vals.length; i++) {
    while (remaining >= vals[i]) {
      result += syms[i];
      remaining -= vals[i];
    }
  }
  return result;
}

function readAll(): ClubRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(DYNASTY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ClubRecord[];
  } catch {
    return [];
  }
}

function writeAll(clubs: ClubRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DYNASTY_KEY, JSON.stringify(clubs));
  } catch {
    /* ignore */
  }
}

export function appendClub(r: Omit<ClubRecord, "foundedLabel">): void {
  const all = readAll();
  const record: ClubRecord = { ...r, foundedLabel: `Century ${toRoman(all.length + 1)}` };
  all.push(record);
  if (all.length > MAX_CLUBS) all.splice(0, all.length - MAX_CLUBS);
  writeAll(all);
}

export function readClubs(): ClubRecord[] {
  return readAll();
}
