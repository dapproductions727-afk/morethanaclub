import type { Region } from "./types";

// Six founding regions. Each sets identity, starting meters, the squad, the
// youth name pool, and a modifier that amplifies certain costs unconditionally
// or by charter tag. All ported verbatim from the prototype.

export const REGIONS: Record<string, Region> = {
  enclave: {
    name: "Basque enclave",
    place: "Bilbao",
    flavor:
      "A region with its own language and its own memory. Your players are the argument the culture survives.",
    start: { money: 35, soul: 75, fans: 60 },
    squad: [
      { name: "Zubizarreta", age: 33, rating: 10, foreign: false },
      { name: "Larrauri", age: 31, rating: 11, foreign: false },
      { name: "Aguirre", age: 28, rating: 14, foreign: false },
      { name: "Mendieta", age: 27, rating: 13, foreign: false },
      { name: "Goikoetxea", age: 26, rating: 13, foreign: false },
      { name: "Llorente", age: 25, rating: 12, foreign: false },
      { name: "Ziganda", age: 29, rating: 12, foreign: false },
      { name: "Orbaiz", age: 24, rating: 12, foreign: false },
      { name: "Alkiza", age: 30, rating: 11, foreign: false },
      { name: "Etxeberria", age: 27, rating: 13, foreign: false },
      { name: "Urzaiz", age: 26, rating: 12, foreign: false },
      { name: "Luengo", age: 23, rating: 11, foreign: false },
      { name: "Sota", age: 22, rating: 10, foreign: false },
      { name: "Bilbao", age: 21, rating: 10, foreign: false },
      { name: "Iraola", age: 20, rating: 9, foreign: false },
      { name: "Garai", age: 19, rating: 9, foreign: false },
      { name: "Ozaeta", age: 18, rating: 8, foreign: false },
      { name: "Beristain", age: 17, rating: 8, foreign: false },
      { name: "Larrazabal", age: 19, rating: 9, foreign: false },
      { name: "Mugica", age: 18, rating: 8, foreign: false },
    ],
    youthPool: ["Garai", "Ozaeta", "Beristain", "Iraola", "Etxebarria", "Bilbao", "Larrazabal", "Mugica", "Iribar", "Uribe", "Rekarte", "Agirre", "Zubikarai", "Arteaga", "Aduriz", "Susaeta", "Lekue", "Villalibre", "Unai", "Mikel"],
    // Every soul loss costs 50% more — identity is the enclave's currency.
    mod: (d) => {
      if ((d.soul ?? 0) < 0) d.soul = Math.round((d.soul as number) * 1.5);
    },
  },

  milltown: {
    name: "Northern mill town",
    place: "Bradford",
    flavor:
      "Built on the factory whistle and the shift change. The men who built this club still work the same jobs their fathers did.",
    start: { money: 30, soul: 60, fans: 80 },
    squad: [
      { name: "Southall", age: 33, rating: 10, foreign: false },
      { name: "Crawford", age: 31, rating: 11, foreign: false },
      { name: "Fletcher", age: 28, rating: 14, foreign: false },
      { name: "Cooper", age: 27, rating: 13, foreign: false },
      { name: "Sugden", age: 26, rating: 13, foreign: false },
      { name: "Briggs", age: 25, rating: 12, foreign: false },
      { name: "Hartley", age: 29, rating: 12, foreign: false },
      { name: "Crowther", age: 24, rating: 12, foreign: false },
      { name: "Emmott", age: 30, rating: 11, foreign: false },
      { name: "Mallinson", age: 27, rating: 13, foreign: false },
      { name: "Holdsworth", age: 26, rating: 12, foreign: false },
      { name: "Mills", age: 23, rating: 11, foreign: false },
      { name: "Shaw", age: 22, rating: 10, foreign: false },
      { name: "Thornton", age: 21, rating: 10, foreign: false },
      { name: "Whitaker", age: 20, rating: 9, foreign: false },
      { name: "Greenwood", age: 19, rating: 9, foreign: false },
      { name: "Barraclough", age: 18, rating: 8, foreign: false },
      { name: "Ainsworth", age: 17, rating: 8, foreign: false },
      { name: "Howarth", age: 19, rating: 9, foreign: false },
      { name: "Sutcliffe", age: 18, rating: 8, foreign: false },
    ],
    youthPool: ["Hartley", "Briggs", "Sugden", "Crowther", "Mallinson", "Emmott", "Holdsworth", "Thornton", "Whitaker", "Greenwood", "Barraclough", "Ainsworth", "Howarth", "Sutcliffe", "Dewhurst", "Longbottom", "Beaumont", "Sykes", "Priestley", "Firth"],
    // Every fan loss costs 50% more — the community doesn't forgive as easily.
    mod: (d) => {
      if ((d.fans ?? 0) < 0) d.fans = Math.round((d.fans as number) * 1.5);
    },
  },

  docktown: {
    name: "Dock town",
    place: "Hull",
    flavor:
      "A port on a working river, founded by stevedores and ship workers. Union men who didn't trust bosses. The fans are the members and the members are the vote.",
    start: { money: 25, soul: 65, fans: 80 },
    squad: [
      { name: "Larkin", age: 33, rating: 10, foreign: false },
      { name: "Doherty", age: 31, rating: 11, foreign: false },
      { name: "Flanagan", age: 28, rating: 14, foreign: false },
      { name: "Murphy", age: 27, rating: 13, foreign: false },
      { name: "Walsh", age: 26, rating: 13, foreign: false },
      { name: "O'Brien", age: 25, rating: 12, foreign: false },
      { name: "Rafferty", age: 29, rating: 12, foreign: false },
      { name: "Quinn", age: 24, rating: 12, foreign: false },
      { name: "Brennan", age: 30, rating: 11, foreign: false },
      { name: "Connolly", age: 27, rating: 13, foreign: false },
      { name: "Hennessy", age: 26, rating: 12, foreign: false },
      { name: "Burke", age: 23, rating: 11, foreign: false },
      { name: "Gallagher", age: 22, rating: 10, foreign: false },
      { name: "Doyle", age: 21, rating: 10, foreign: false },
      { name: "Nolan", age: 20, rating: 9, foreign: false },
      { name: "McCarthy", age: 19, rating: 9, foreign: false },
      { name: "Byrne", age: 18, rating: 8, foreign: false },
      { name: "Carey", age: 17, rating: 8, foreign: false },
      { name: "Duffy", age: 19, rating: 9, foreign: false },
      { name: "Kelly", age: 18, rating: 8, foreign: false },
    ],
    youthPool: ["Larkin", "Doherty", "Quinn", "Brennan", "Gallagher", "Doyle", "Nolan", "McCarthy", "Byrne", "Carey", "Duffy", "Kelly", "Regan", "Tierney", "Moran", "Cullen", "Boyle", "Higgins", "Keane", "Sheridan"],
    // Fan losses cost 60% more — the fans are your voters. Let them dwindle and you lose control.
    mod: (d, tags) => {
      if ((d.fans ?? 0) < 0) d.fans = Math.round((d.fans as number) * 1.6);
      if (tags.includes("ownership") && (d.soul ?? 0) < 0) d.soul = Math.round((d.soul as number) * 1.4);
    },
  },

  cathedral: {
    name: "Cathedral city",
    place: "Canterbury",
    flavor:
      "Founded by clergymen and schoolmasters. Amateur to the bone. Money was vulgar. The shirt is clean and the ground has a name worth keeping.",
    start: { money: 20, soul: 80, fans: 45 },
    squad: [
      { name: "Worthington", age: 33, rating: 10, foreign: false },
      { name: "Pemberton", age: 31, rating: 11, foreign: false },
      { name: "Clifford", age: 28, rating: 14, foreign: false },
      { name: "Harrington", age: 27, rating: 13, foreign: false },
      { name: "Sanderson", age: 26, rating: 13, foreign: false },
      { name: "Whitfield", age: 25, rating: 12, foreign: false },
      { name: "Halstead", age: 29, rating: 12, foreign: false },
      { name: "Mercer", age: 24, rating: 12, foreign: false },
      { name: "Goodfellow", age: 30, rating: 11, foreign: false },
      { name: "Langford", age: 27, rating: 13, foreign: false },
      { name: "Mortimer", age: 26, rating: 12, foreign: false },
      { name: "Huxley", age: 23, rating: 11, foreign: false },
      { name: "Fairfax", age: 22, rating: 10, foreign: false },
      { name: "Norwood", age: 21, rating: 10, foreign: false },
      { name: "Cavendish", age: 20, rating: 9, foreign: false },
      { name: "Prentice", age: 19, rating: 9, foreign: false },
      { name: "Chadwick", age: 18, rating: 8, foreign: false },
      { name: "Alderton", age: 17, rating: 8, foreign: false },
      { name: "Elsworth", age: 19, rating: 9, foreign: false },
      { name: "Ashby", age: 18, rating: 8, foreign: false },
    ],
    youthPool: ["Pemberton", "Clifford", "Sanderson", "Halstead", "Goodfellow", "Langford", "Huxley", "Fairfax", "Norwood", "Cavendish", "Prentice", "Chadwick", "Alderton", "Elsworth", "Ashby", "Westbrook", "Dunmore", "Grantham", "Ferrers", "Osgood"],
    // Commercial compromises drain soul 70% more — every small betrayal accelerates the rot.
    mod: (d, tags) => {
      if (tags.includes("commercial") && (d.soul ?? 0) < 0) d.soul = Math.round((d.soul as number) * 1.7);
    },
  },

  capital: {
    name: "Capital-city club",
    place: "Warsaw",
    flavor:
      "Founded in the national capital, big enough to be a symbol the whole country reads. The only town where the villain is the state itself.",
    start: { money: 40, soul: 60, fans: 85 },
    squad: [
      { name: "Wisniewski", age: 33, rating: 10, foreign: false },
      { name: "Kowalski", age: 31, rating: 11, foreign: false },
      { name: "Lewandowski", age: 28, rating: 14, foreign: false },
      { name: "Wojcik", age: 27, rating: 13, foreign: false },
      { name: "Kaminski", age: 26, rating: 13, foreign: false },
      { name: "Zielinski", age: 25, rating: 12, foreign: false },
      { name: "Dabrowski", age: 29, rating: 12, foreign: false },
      { name: "Szymanski", age: 24, rating: 12, foreign: false },
      { name: "Mazur", age: 30, rating: 11, foreign: false },
      { name: "Krawczyk", age: 27, rating: 13, foreign: false },
      { name: "Piotrowicz", age: 26, rating: 12, foreign: false },
      { name: "Adamczyk", age: 23, rating: 11, foreign: false },
      { name: "Michalski", age: 22, rating: 10, foreign: false },
      { name: "Nowak", age: 21, rating: 10, foreign: false },
      { name: "Grabowski", age: 20, rating: 9, foreign: false },
      { name: "Pawlak", age: 19, rating: 9, foreign: false },
      { name: "Jankowski", age: 18, rating: 8, foreign: false },
      { name: "Walczak", age: 17, rating: 8, foreign: false },
      { name: "Rutkowski", age: 19, rating: 9, foreign: false },
      { name: "Wozniak", age: 18, rating: 8, foreign: false },
    ],
    youthPool: ["Kowalski", "Lewandowski", "Kaminski", "Dabrowski", "Szymanski", "Mazur", "Krawczyk", "Adamczyk", "Michalski", "Nowak", "Grabowski", "Pawlak", "Jankowski", "Walczak", "Rutkowski", "Wozniak", "Zawadzki", "Jakubowski", "Majewski", "Kwiatkowski"],
    // Surrendering control to power costs soul 70% more — take the money and you become propaganda.
    mod: (d, tags) => {
      if (tags.includes("ownership") && (d.soul ?? 0) < 0) d.soul = Math.round((d.soul as number) * 1.7);
    },
  },

  immigrant: {
    name: "Immigrant quarter",
    place: "Marseille",
    flavor:
      "Founded in a poor, mixed migrant district by people the city looked down on. Outsiders made good. The club is the district's proof it exists.",
    start: { money: 20, soul: 85, fans: 60 },
    squad: [
      { name: "Bianchi", age: 33, rating: 10, foreign: false },
      { name: "Ferreira", age: 31, rating: 11, foreign: false },
      { name: "Morales", age: 28, rating: 14, foreign: false },
      { name: "Santos", age: 27, rating: 13, foreign: false },
      { name: "Greco", age: 26, rating: 13, foreign: false },
      { name: "Martini", age: 25, rating: 12, foreign: false },
      { name: "Rossi", age: 29, rating: 12, foreign: false },
      { name: "Fernandez", age: 24, rating: 12, foreign: false },
      { name: "Esposito", age: 30, rating: 11, foreign: false },
      { name: "Romano", age: 27, rating: 13, foreign: false },
      { name: "Costa", age: 26, rating: 12, foreign: false },
      { name: "Oliveira", age: 23, rating: 11, foreign: false },
      { name: "Silva", age: 22, rating: 10, foreign: false },
      { name: "Carvalho", age: 21, rating: 10, foreign: false },
      { name: "Alves", age: 20, rating: 9, foreign: false },
      { name: "Pereira", age: 19, rating: 9, foreign: false },
      { name: "Gomes", age: 18, rating: 8, foreign: false },
      { name: "Nunes", age: 17, rating: 8, foreign: false },
      { name: "Sousa", age: 19, rating: 9, foreign: false },
      { name: "Moreira", age: 18, rating: 8, foreign: false },
    ],
    youthPool: ["Ferreira", "Santos", "Greco", "Martini", "Fernandez", "Romano", "Costa", "Oliveira", "Silva", "Carvalho", "Alves", "Pereira", "Gomes", "Nunes", "Sousa", "Moreira", "Lopes", "Monteiro", "Barbosa", "Rodrigues"],
    // Commercial success prices out the community — fan losses from commercial decisions cost 60% more.
    mod: (d, tags) => {
      if (tags.includes("commercial") && (d.fans ?? 0) < 0) d.fans = Math.round((d.fans as number) * 1.6);
    },
  },
};
