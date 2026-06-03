import type { Scene, BigMatch } from "./types";

// The 14 heavy decisions of the century. All prose is verbatim from the
// prototype. {PLACE} is filled at render time; ${STR} is replaced with the
// live squad strength. Each choice mutates state through the RunContext.
//
// The `tech` field marks the technology that arrives in that era — radio, then
// television, floodlights, data, cameras. It drives the Civ-style tech timeline
// and the look of the stadium scene. It is presentational; the meter math is
// unchanged from the original design.

export const scenes: Scene[] = [
  {
    sp: "The centre-forward",
    year: "{PLACE} · 1906",
    seasons: 4,
    pr: "The Football League has fixed wages at four pounds a week — an honest working wage, they say. Your best player earns the same as the worst man in the division. A wealthy First Division club to the south has come for him. The fee alone would change your decade.",
    ch: [
      {
        t: "Sell him. The fee builds something lasting.",
        note: "The money comes in. The crowd takes a long time to forgive.",
        tags: ["commercial"],
        run: (c) => {
          c.meters.money += 18;
          c.meters.fans -= 12;
          c.meters.soul -= 5;
          c.removeBestLocal();
        },
      },
      {
        t: "Hold him. Some things aren't for sale.",
        note: "He stays. The money doesn't. The crowd remembers.",
        tags: [],
        run: (c) => {
          c.meters.money -= 8;
          c.meters.soul += 15;
          c.meters.fans += 10;
        },
      },
    ],
  },

  {
    sp: "The war office",
    year: "{PLACE} · 1914",
    seasons: 3,
    pr: "The telegram has been circulating for weeks. Half your squad has already enlisted. The league says play on. Will you release the rest to serve, or petition to keep them?",
    ch: [
      {
        t: "Release them. Let them go.",
        note: "The club empties. Soul holds.",
        tags: [],
        run: (c) => {
          c.meters.soul += 20;
          c.meters.fans += 10;
          // Release the three best local players to serve.
          c.removeBestLocal();
          c.removeBestLocal();
          c.removeBestLocal();
        },
      },
      {
        t: "Petition to keep the squad together. The league needs clubs.",
        note: "You play on. The neighbourhood never forgets.",
        tags: ["commercial"],
        run: (c) => {
          c.meters.money += 10;
          c.meters.soul -= 10;
          c.meters.fans -= 25;
        },
      },
    ],
  },

  {
    sp: "The women's side",
    year: "{PLACE} · 1921",
    seasons: 3,
    pr: "Your women's team drew a bigger crowd than the men last Boxing Day. Now the FA has banned women from Football League grounds, calling the game 'quite unsuitable for females.' Obey, or defy them?",
    ch: [
      {
        t: "Defy the ban. The crowds chose them.",
        note: "You lose the ground and the FA's favour. The town never forgets you stood with the women.",
        tags: ["regime"],
        run: (c) => {
          c.meters.money -= 20;
          c.meters.soul += 20;
          c.meters.fans += 20;
          c.setFlag("defiedBan", true);
        },
      },
      {
        t: "Obey. Shut the women's side down.",
        note: "The money holds. A thread of the club quietly dies.",
        tags: [],
        run: (c) => {
          c.meters.money += 5;
          c.meters.soul -= 15;
          c.meters.fans -= 10;
        },
      },
    ],
  },

  {
    sp: "The wireless",
    year: "{PLACE} · 1927",
    seasons: 4,
    tech: "radio",
    pr: "A man from the wireless service wants to read your match commentary live across the county. No cameras, just a voice in front parlours from here to the coast. The board has never heard of such a thing.",
    ch: [
      {
        t: "Let them broadcast. The voice travels.",
        note: "A little money, and your name carries past the district for the first time.",
        tags: ["commercial"],
        run: (c) => {
          c.meters.money += 8;
          c.meters.fans += 5;
          c.meters.soul -= 3;
        },
      },
      {
        t: "Keep it to the ground. You had to be there.",
        note: "Nothing changes. The match belongs only to the people who paid the gate.",
        tags: [],
        run: (c) => {
          c.meters.soul += 6;
          c.meters.fans += 4;
        },
      },
    ],
  },

  {
    sp: "The board",
    year: "{PLACE} · 1930s",
    seasons: 6,
    pr: "Your senior men are ageing. Pour money into the academy now, or save it?",
    ch: [
      {
        t: "Fund the academy and promote a club man to coach.",
        note: "Costs money. Future locals get better.",
        tags: ["homegrown-hold"],
        run: (c) => {
          c.meters.money -= 15;
          c.meters.soul += 10;
          c.boostUnder(25, 2);
        },
      },
      {
        t: "Hire a famous manager from abroad instead.",
        note: "Results now. The club's own people are passed over.",
        tags: ["glamour", "commercial"],
        run: (c) => {
          c.meters.money -= 10;
          c.meters.soul -= 8;
          c.boostUnder(30, 1);
        },
      },
    ],
  },

  {
    sp: "The broadcaster",
    year: "{PLACE} · 1950",
    seasons: 6,
    pr: "The national broadcaster wants to carry your home matches live. Your board says the terraces will empty. The broadcaster says the whole country will know your name.",
    ch: [
      {
        t: "Sign the deal.",
        note: "The money comes in. The ground starts to thin.",
        tags: ["commercial"],
        run: (c) => {
          c.meters.money += 15;
          c.meters.fans -= 15;
          c.meters.soul -= 5;
        },
      },
      {
        t: "Refuse. The gate is the club.",
        note: "The terraces stay full. The money stays small.",
        tags: [],
        run: (c) => {
          c.meters.money -= 10;
          c.meters.fans += 10;
          c.meters.soul += 5;
        },
      },
    ],
  },

  {
    sp: "The floodlights",
    year: "{PLACE} · 1958",
    seasons: 4,
    tech: "floodlights",
    bigMatch: {
      kind: "Floodlit friendly",
      setup: "The first match under the new lights. A famous touring side, a full house, and a chance late on to win it in front of everyone.",
      prompt: "Tap to shoot — aim wide of the keeper.",
      rewardWin: { fans: 10, money: 6, soul: 4 },
      rewardLose: { fans: 1, money: 2, soul: -1 },
    },
    pr: "Four steel pylons and the night becomes playable. Midweek matches under the lights pull crowds the Saturday gate never could. The installation is not cheap, and the old guard says football is a daylight game.",
    ch: [
      {
        t: "Raise the pylons. Play under the lights.",
        note: "Costs money up front. Midweek crowds follow.",
        tags: [],
        run: (c) => {
          c.meters.money -= 12;
          c.meters.fans += 18;
          c.meters.soul += 4;
        },
      },
      {
        t: "Daylight only. The game was fine as it was.",
        note: "You save the money. The midweek crowds go to clubs that lit up.",
        tags: [],
        run: (c) => {
          c.meters.money += 4;
          c.meters.fans -= 8;
        },
      },
    ],
  },

  {
    sp: "The camera crew",
    year: "{PLACE} · 1965",
    seasons: 6,
    tech: "television",
    bigMatch: {
      kind: "Cup final",
      setup: "Wembley. The first time the cameras carry you to the whole country. 1–1, the last minute, a corner swings in.",
      prompt: "Tap when the ball drops to your striker's boot.",
      rewardWin: { fans: 14, money: 8, soul: 6, trophy: true },
      rewardLose: { fans: 2, money: 3, soul: -2 },
    },
    pr: "Television money is different from radio money. They want to move your Saturday match to Sunday evening for a bigger audience. You'd earn more than a decade of gate receipts. The men who stand behind the goal have worked Sundays since 1945.",
    ch: [
      {
        t: "Take the money. Shift the kick-off.",
        note: "The cheque clears. The old supporters drift away.",
        tags: ["commercial"],
        run: (c) => {
          c.meters.money += 25;
          c.meters.fans -= 25;
          c.meters.soul -= 5;
        },
      },
      {
        t: "Refuse. Saturday is Saturday.",
        note: "The money goes elsewhere. The faithful stay.",
        tags: [],
        run: (c) => {
          c.meters.money -= 15;
          c.meters.soul += 15;
          c.meters.fans += 10;
        },
      },
    ],
  },

  {
    sp: "The terraces",
    year: "{PLACE} · 1975",
    seasons: 5,
    bigMatch: {
      kind: "Promotion decider",
      setup: "Win the last game and you go up. The away end is packed three deep. A loose ball drops on the edge of the box with minutes left.",
      prompt: "Tap to shoot for the corner.",
      rewardWin: { fans: 13, money: 7, soul: 5 },
      rewardLose: { fans: -6, money: 1, soul: -2 },
    },
    pr: "The supporters' association has drafted a proposal: two seats on the board, one vote in three. They say the club was built with their money and their fathers' money before that. The board says it will slow everything down.",
    ch: [
      {
        t: "Grant it. The board belongs to them too.",
        note: "Decisions slow. The supporters become the club.",
        tags: ["ownership-hold"],
        run: (c) => {
          c.meters.soul += 15;
          c.meters.fans += 20;
          c.meters.money -= 10;
        },
      },
      {
        t: "Refuse. Governance is for governors.",
        note: "The board stays clean. Something sours on the terraces.",
        tags: ["ownership"],
        run: (c) => {
          c.meters.soul -= 8;
          c.meters.fans -= 25;
          c.meters.money += 10;
        },
      },
    ],
  },

  {
    sp: "The inquiry",
    year: "{PLACE} · 1985",
    seasons: 5,
    pr: "A crush in the old wooden stand. Three supporters dead, dozens hurt. The safety report says the ground must close or be rebuilt. A developer has land on the edge of town and will fund a new stadium if you move.",
    ch: [
      {
        t: "Take the developer's money. Build new, build out of town.",
        note: "The money solves the problem. The neighbourhood is left behind.",
        tags: ["commercial", "move"],
        fx: { stadium: "moveOut" },
        run: (c) => {
          c.meters.money += 20;
          c.meters.fans -= 35;
          c.meters.soul -= 8;
        },
      },
      {
        t: "Rebuild the old ground. Stay where you are.",
        note: "It costs everything, and you must borrow to do it. The ground is still yours.",
        tags: ["stay-hold", "debt"],
        fx: { stadium: "rebuild" },
        run: (c) => {
          c.meters.money -= 25;
          c.meters.fans += 15;
          c.meters.soul += 15;
        },
      },
    ],
  },

  {
    sp: "The new stand",
    year: "{PLACE} · 1990",
    seasons: 4,
    pr: "The terrace is full every week and the waiting list is long. A bigger stand would let thousands more working people in at the old prices. But it can't be built without borrowing.",
    ch: [
      {
        t: "Build it. Borrow the money.",
        note: "More fans, cheap seats. The club takes on debt.",
        tags: ["gate-hold", "debt"],
        fx: { stadium: "newStand" },
        run: (c) => {
          c.meters.fans += 25;
          c.meters.money -= 10;
          c.meters.soul += 5;
        },
      },
      {
        t: "Don't build. Stay small and solvent.",
        note: "No debt. The waiting list stays a waiting list.",
        tags: ["debt-hold"],
        run: (c) => {
          c.meters.money += 5;
          c.meters.fans -= 10;
        },
      },
      {
        conflict: true,
        cond: () => swore("affordable") && swore("debtfree"),
        t: "Your charter forbids both the debt and the price rise. Choose which clause to break.",
        note: "Raise prices to fund it without borrowing: keeps debt-free, breaks affordable gate.",
        tags: ["commercial"],
        run: (c) => {
          c.meters.money += 15;
          c.meters.fans -= 20;
          c.meters.soul -= 10;
          c.setFlag("charterBroken", true);
        },
      },
    ],
  },

  {
    sp: "The agent",
    year: "{PLACE} · 1995 · the Bosman ruling",
    seasons: 5,
    bigMatch: {
      kind: "Relegation decider",
      setup: "The final day. Lose and you go down. The ground is a wall of noise. A penalty, the keeper guesses, you step up.",
      prompt: "Tap to strike when the keeper commits.",
      rewardWin: { fans: 12, money: 6, soul: 8 },
      rewardLose: { fans: -16, money: -8, soul: -6 },
    },
    pr: "A court freed players to cross borders cheap. Your best men are old and the academy is thin. Strength is just ${STR}. Sign a foreign star?",
    ch: [
      {
        t: "Sign him. Break the charter, just once.",
        note: "+ a strong outsider. Soul falls hard. The dice tilt your way.",
        tags: ["outsider"],
        run: (c) => {
          c.addPlayer({ name: "da Silva", age: 26, rating: 16, foreign: true });
          c.addPlayer({ name: "Cardoso", age: 24, rating: 15, foreign: true });
          c.meters.soul -= 30;
          c.meters.money -= 10;
          c.setFlag("charterBroken", true);
        },
      },
      {
        t: "Hold the line. Local only, whatever it costs.",
        note: "Soul holds. You go into the season as a long shot.",
        tags: ["outsider-hold"],
        run: (c) => {
          c.meters.soul += 15;
          c.meters.fans += 10;
        },
      },
    ],
  },

  {
    sp: "The consortium",
    year: "{PLACE} · 2005",
    seasons: 5,
    bigMatch: {
      kind: "European night",
      setup: "A continental giant under the lights, the tie level on aggregate. One chance breaks late, the goalkeeper off his line.",
      prompt: "Tap to shoot — beat the keeper.",
      rewardWin: { fans: 14, money: 10, soul: 3 },
      rewardLose: { fans: 3, money: 3, soul: -1 },
    },
    pr: "A media consortium will finance a title challenge: signings, wages, a new training ground. Strength is ${STR}. The repayment terms are generous until the revenue projections miss. Clubs have done this and won. Some have since ceased to exist.",
    ch: [
      {
        t: "Take the loan. Chase the title.",
        note: "You buy a chance. The debt is someone else's problem, until it isn't.",
        tags: ["ownership", "commercial", "debt"],
        run: (c) => {
          c.addPlayer({ name: "Sánchez", age: 27, rating: 17, foreign: false });
          c.meters.money += 20;
          c.meters.fans -= 20;
          c.meters.soul -= 5;
        },
      },
      {
        t: "Decline. Win with what you have or not at all.",
        note: "No debt. No shortcut.",
        tags: ["ownership-hold", "debt-hold"],
        run: (c) => {
          c.meters.soul += 15;
          c.meters.fans += 5;
        },
      },
    ],
  },

  {
    sp: "The women's game returns",
    year: "{PLACE} · 2012",
    seasons: 4,
    pr: () =>
      defiedBanFlag()
        ? "A professional women's league is forming. The club that defied the ban in 1921 is the obvious home for a side. The history is yours to claim."
        : "A professional women's league is forming. Backing a side would cost money up front, with a slow and uncertain return.",
    ch: [
      {
        t: "Back a women's side properly.",
        note: () =>
          defiedBanFlag()
            ? "Cheaper and stronger: the history is already yours."
            : "Costs money now. Soul and fans grow over time.",
        tags: ["regime-hold"],
        run: (c) => {
          const disc = defiedBanFlag() ? 0 : 1;
          c.meters.money -= 10 + 10 * disc;
          c.meters.soul += 15 + 5 * (1 - disc);
          c.meters.fans += 15 + 5 * (1 - disc);
        },
      },
      {
        t: "Leave it to others.",
        note: "No cost. No claim on the future of the game.",
        tags: [],
        run: (c) => {
          c.meters.soul -= 5;
        },
      },
    ],
  },

  {
    sp: "The fund",
    year: "{PLACE} · 2015 · the stadium era",
    seasons: 5,
    tech: "data",
    bigMatch: {
      kind: "Title decider",
      setup: "Win and the league is yours for the first time in living memory. Stoppage time, 2–2, a half-chance falls on the edge of the box.",
      prompt: "Tap at the top of the strike for the corner.",
      rewardWin: { fans: 16, money: 12, soul: 4, trophy: true },
      rewardLose: { fans: 4, money: 4, soul: -2 },
    },
    pr: "A sovereign wealth fund will buy you and make you champions. The old ground, and the neighbourhood around it, would go.",
    ch: [
      {
        t: "Sell. Win at last.",
        note: "Money and stars. The community doesn't forgive.",
        tags: ["outsider", "ownership", "regime", "move"],
        fx: { stadium: "sellToFund" },
        run: (c) => {
          c.addPlayer({ name: "Okafor", age: 25, rating: 18, foreign: true });
          c.addPlayer({ name: "Diallo", age: 23, rating: 17, foreign: true });
          c.addPlayer({ name: "Ferreira", age: 27, rating: 16, foreign: true });
          c.meters.money += 30;
          c.meters.soul -= 15;
          c.meters.fans -= 35;
          c.setFlag("charterBroken", true);
        },
      },
      {
        t: "Refuse. Stay poor, stay home, stay ours.",
        note: "Soul and fans hold. The dice stay long.",
        tags: ["outsider-hold", "ownership-hold", "regime-hold", "stay-hold"],
        run: (c) => {
          c.meters.soul += 15;
          c.meters.fans += 15;
          c.meters.money -= 15;
        },
      },
    ],
  },

  {
    sp: "The invitation",
    year: "{PLACE} · 2020",
    seasons: 4,
    tech: "streaming",
    bigMatch: {
      kind: "The derby",
      setup: "The old enemy, the rivals who took the money you refused. Their fans have travelled. Stoppage time, level, a chance at the near post.",
      prompt: "Tap to shoot — silence the away end.",
      rewardWin: { fans: 15, money: 6, soul: 6 },
      rewardLose: { fans: -8, money: 1, soul: -3 },
    },
    pr: "An envelope arrives. Twelve clubs are forming a closed European competition. Guaranteed matches, guaranteed money, no promotion, no relegation. A standing invitation to the top table, forever. Your city would be on the poster.",
    ch: [
      {
        t: "Sign it. This is what the club has been building toward.",
        note: "The money is transformative. Half the supporters never come back.",
        tags: ["ownership", "commercial"],
        run: (c) => {
          c.meters.money += 30;
          c.meters.fans -= 40;
          c.meters.soul -= 8;
          c.setFlag("charterBroken", true);
        },
      },
      {
        t: "Refuse. Publicly.",
        note: "The top table closes without you. The terraces sing your name.",
        tags: ["ownership-hold"],
        run: (c) => {
          c.meters.soul += 20;
          c.meters.fans += 25;
          c.meters.money -= 20;
        },
      },
    ],
  },
];

// These two read live game flags. They are wired by the engine at runtime so
// the scene conditions and notes can reflect the current state. Default to safe
// values until the engine binds them.
let _swore: (k: string) => boolean = () => false;
let _defiedBan: () => boolean = () => false;

export function bindSceneHooks(sworeFn: (k: string) => boolean, defiedBanFn: () => boolean) {
  _swore = sworeFn;
  _defiedBan = defiedBanFn;
}

function swore(k: string): boolean {
  return _swore(k);
}
function defiedBanFlag(): boolean {
  return _defiedBan();
}
