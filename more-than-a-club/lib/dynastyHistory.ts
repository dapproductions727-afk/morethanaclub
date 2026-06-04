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
  seeded: boolean;
}

function toRoman(n: number): string {
  const vals = [10, 9, 5, 4, 1];
  const syms = ["X", "IX", "V", "IV", "I"];
  let result = "";
  for (let i = 0; i < vals.length; i++) {
    while (n >= vals[i]) {
      result += syms[i];
      n -= vals[i];
    }
  }
  return result;
}

export function readClubs(): ClubRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(DYNASTY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as ClubRecord[];
  } catch {
    return [];
  }
}

export function appendClub(r: Omit<ClubRecord, "foundedLabel">): void {
  if (typeof window === "undefined") return;
  try {
    const clubs = readClubs();
    const record: ClubRecord = { ...r, foundedLabel: `Century ${toRoman(clubs.length + 1)}` };
    clubs.push(record);
    if (clubs.length > MAX_CLUBS) clubs.splice(0, clubs.length - MAX_CLUBS);
    window.localStorage.setItem(DYNASTY_KEY, JSON.stringify(clubs));
  } catch {
    /* ignore */
  }
}
