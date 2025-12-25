export const WORDS = [
  // Player names
  "alex",
  "siso",
  "cam",
  "charlie",
  "parsa",
  "sina",
  // Locations / countries
  "vietnam",
  "india",
  "pakistan",
  "israel",
  "iran",
  "africa",
  "spain",
  "united kingdom",
  "london",
  // Extra fun words
  "ofm",
  "banana",
  "toaster",
  "llama",
  "socks",
  "leah mae plumber",
];

export const HINTS = {
  // Player names (no hints requested)
  alex: ["", ""],
  siso: ["", ""],
  cam: ["", ""],
  charlie: ["", ""],
  parsa: ["", ""],
  sina: ["", ""],
  // Locations / countries
  vietnam: ["pho", "moped"],
  india: ["spice", "bollywood"],
  pakistan: ["chai", "cricket"],
  israel: ["hummus", "desert"],
  iran: ["persian", "carpets"],
  africa: ["safari", "savanna"],
  spain: ["tapas", "flamenco"],
  "united kingdom": ["tea", "royalty"],
  london: ["big ben", "tube"],
  // Extra fun words
  ofm: ["banana mike", "crew"],
  banana: ["ofm", "split"],
  toaster: ["crumbs", "pop"],
  llama: ["wool", "spit"],
  socks: ["mismatch", "laundry"],
  "leah mae plumber": ["smile", "wrench"],
};

export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export const nameOf = (players, id) => players.find((p) => p.id === id)?.name ?? "Unknown";

export function applyScores(current, votes, impostorId) {
  // votes: array of { voterId, targetId }
  const next = { ...current };
  const impostorCaught = votes.some((v) => v.targetId === impostorId);

  // Each correct voter earns 1 point.
  votes.forEach((v) => {
    if (v.targetId === impostorId) next[v.voterId] = (next[v.voterId] ?? 0) + 1;
  });

  // Impostor gets 3 points if they escape, 1 point if they were caught.
  const impostorAward = impostorCaught ? 1 : 3;
  next[impostorId] = (next[impostorId] ?? 0) + impostorAward;

  return next;
}

export function scoresFor(players, existing) {
  const base = { ...existing };
  players.forEach((p) => {
    if (typeof base[p.id] !== "number") base[p.id] = 0;
  });
  return base;
}
