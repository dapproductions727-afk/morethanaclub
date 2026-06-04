import type { Story, Rule } from "./types";

// Founding stories: who built the club and why. Each grants a small bonus and
// a modifier that amplifies certain betrayals. Ported verbatim.

export const STORIES: Record<string, Story> = {
  cooperative: {
    name: "Workers' cooperative",
    flavor: "Every member holds a vote. The club belongs to no one person. The charter says so.",
    bonus: { soul: 10 },
    mod: (d, tags) => {
      if (tags.includes("ownership") && (d.soul ?? 0) < 0) d.soul = Math.round((d.soul as number) * 1.4);
    },
  },
  students: {
    name: "Students' club",
    flavor: "Founded by idealists with more conviction than money. The principles came first. The trophies were always secondary.",
    bonus: { money: 10 },
    mod: (d, tags) => {
      if (tags.includes("commercial") && (d.soul ?? 0) < 0) d.soul = Math.round((d.soul as number) * 1.4);
    },
  },
  factory: {
    name: "Factory team",
    flavor: "The works side. Men who clocked off and played. The club and the shift are the same people.",
    bonus: { fans: 10 },
    mod: (d, tags) => {
      if (tags.includes("commercial") && (d.fans ?? 0) < 0) d.fans = Math.round((d.fans as number) * 1.4);
    },
  },
  church: {
    name: "Church team",
    flavor: "Founded by clergy and choirboys to keep young men out of the pub. Money was always a little vulgar.",
    bonus: { soul: 15 },
    mod: (d, tags) => {
      if (tags.includes("commercial") && (d.soul ?? 0) < 0) d.soul = Math.round((d.soul as number) * 1.5);
    },
  },
  merchants: {
    name: "Merchants' club",
    flavor: "Built by local shopkeepers and traders. Comfortable with a ledger. Comfortable, perhaps, with a deal.",
    bonus: { money: 20 },
    mod: (d, tags) => {
      if (tags.includes("ownership") && (d.soul ?? 0) < 0) d.soul = Math.round((d.soul as number) * 1.3);
    },
  },
  benefactor: {
    name: "The benefactor's club",
    flavor: "One man's fortune, one man's vision. He wanted trophies above everything else. Built to win, and built to keep winning for as long as the money held.",
    bonus: { money: 20 },
    mod: (d, tags) => {
      // Commercial ambition and big signings were always the plan — they sting the soul less.
      if ((tags.includes("outsider") || tags.includes("commercial")) && (d.soul ?? 0) < 0) {
        d.soul = Math.round((d.soul as number) * 0.55);
      }
      // Without community roots, selling control or moving hits the fans harder.
      if ((tags.includes("move") || tags.includes("ownership")) && (d.fans ?? 0) < 0) {
        d.fans = Math.round((d.fans as number) * 1.35);
      }
    },
  },
};

// Charter rules: up to three sworn into the founding document. Each grants a
// bonus, amplifies a matching betrayal, and rewards holding the line via *-hold
// tags. Ported verbatim.

export const RULES: Record<string, Rule> = {
  local: {
    name: "No outsiders",
    note: "Only players from this region wear our shirt.",
    bonus: { soul: 10 },
    mod: (d, tags) => {
      if (tags.includes("outsider") && (d.soul ?? 0) < 0) d.soul = Math.round((d.soul as number) * 1.5);
      if (tags.includes("outsider-hold")) {
        d.soul = (d.soul ?? 0) + 10;
        d.fans = (d.fans ?? 0) + 5;
      }
    },
  },
  ownership: {
    name: "Fan ownership",
    note: "One member, one vote. Never sold without a majority ballot.",
    bonus: { fans: 10 },
    mod: (d, tags) => {
      if (tags.includes("ownership") && (d.soul ?? 0) < 0) {
        d.soul = Math.round((d.soul as number) * 1.4);
        if ((d.fans ?? 0) < 0) d.fans = Math.round((d.fans as number) * 1.3);
      }
      if (tags.includes("ownership-hold")) {
        d.soul = (d.soul ?? 0) + 10;
        d.fans = (d.fans ?? 0) + 10;
      }
    },
  },
  stayput: {
    name: "Stay in the place",
    note: "Never move the ground, never leave the district.",
    bonus: { fans: 10 },
    mod: (d, tags) => {
      if (tags.includes("move") && (d.soul ?? 0) < 0) d.soul = Math.round((d.soul as number) * 1.6);
      if (tags.includes("move") && (d.fans ?? 0) < 0) d.fans = Math.round((d.fans as number) * 1.4);
      if (tags.includes("stay-hold")) {
        d.soul = (d.soul ?? 0) + 10;
        d.fans = (d.fans ?? 0) + 8;
      }
    },
  },
  affordable: {
    name: "Affordable gate",
    note: "Tickets a working person can pay for. Every era.",
    bonus: { fans: 15 },
    mod: (d, tags) => {
      if (tags.includes("commercial") && (d.fans ?? 0) < 0) d.fans = Math.round((d.fans as number) * 1.5);
      if (tags.includes("gate-hold")) {
        d.fans = (d.fans ?? 0) + 10;
        d.money = (d.money ?? 0) - 5;
      }
    },
  },
  homegrown: {
    name: "Promote from within",
    note: "Managers and staff come up through the club. No glamour hires.",
    bonus: { soul: 10 },
    mod: (d, tags) => {
      if (tags.includes("glamour") && (d.soul ?? 0) < 0) d.soul = Math.round((d.soul as number) * 1.5);
      if (tags.includes("homegrown-hold")) {
        d.soul = (d.soul ?? 0) + 8;
      }
    },
  },
  politics: {
    name: "The people's politics",
    note: "The club stands for something. It will not be co-opted.",
    bonus: { soul: 10, fans: 5 },
    mod: (d, tags) => {
      if (tags.includes("regime") && (d.soul ?? 0) < 0) d.soul = Math.round((d.soul as number) * 1.7);
      if (tags.includes("regime-hold")) {
        d.soul = (d.soul ?? 0) + 12;
        d.fans = (d.fans ?? 0) + 8;
      }
    },
  },
  debtfree: {
    name: "Debt-free",
    note: "The club never borrows, never mortgages itself.",
    bonus: { money: 5 },
    mod: (d, tags) => {
      if (tags.includes("debt") && (d.soul ?? 0) < 0) d.soul = Math.round((d.soul as number) * 1.4);
      if (tags.includes("debt-hold")) {
        d.soul = (d.soul ?? 0) + 8;
        d.money = (d.money ?? 0) + 5;
      }
    },
  },
};
