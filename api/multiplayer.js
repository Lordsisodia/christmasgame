const crypto = require("crypto");

// NOTE:
// This intentionally stores game sessions in-memory (no database).
// On Vercel, this state persists only while the Serverless Function instance is warm.
// If the function cold-starts or scales to multiple instances, state can reset or split.

const STORE_KEY = "__CHRISTMASGAME_MULTIPLAYER_STORE__";

const WORDS = [
  "alex",
  "siso",
  "cam",
  "charlie",
  "parsa",
  "sina",
  "vietnam",
  "india",
  "pakistan",
  "israel",
  "iran",
  "africa",
  "spain",
  "united kingdom",
  "london",
  "ofm",
  "banana",
  "toaster",
  "llama",
  "socks",
  "leah mae plumber",
];

const HINTS = {
  alex: ["", ""],
  siso: ["", ""],
  cam: ["", ""],
  charlie: ["", ""],
  parsa: ["", ""],
  sina: ["", ""],
  vietnam: ["pho", "moped"],
  india: ["spice", "bollywood"],
  pakistan: ["chai", "cricket"],
  israel: ["hummus", "desert"],
  iran: ["persian", "carpets"],
  africa: ["safari", "savanna"],
  spain: ["tapas", "flamenco"],
  "united kingdom": ["tea", "royalty"],
  london: ["big ben", "tube"],
  ofm: ["banana mike", "crew"],
  banana: ["ofm", "split"],
  toaster: ["crumbs", "pop"],
  llama: ["wool", "spit"],
  socks: ["mismatch", "laundry"],
  "leah mae plumber": ["smile", "wrench"],
};

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function now() {
  return Date.now();
}

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

function badRequest(res, message) {
  return json(res, 400, { ok: false, error: message });
}

function forbidden(res, message) {
  return json(res, 403, { ok: false, error: message || "Forbidden" });
}

function notFound(res, message) {
  return json(res, 404, { ok: false, error: message || "Not found" });
}

function randomId(prefix) {
  return `${prefix}_${crypto.randomBytes(6).toString("hex")}`;
}

function sanitizeName(name) {
  const raw = String(name || "").trim();
  if (!raw) return null;
  return raw.slice(0, 18);
}

function normalizeSessionId(sessionId) {
  const raw = String(sessionId || "").trim().toUpperCase();
  // Keep it simple: A-Z 0-9, 4-10 chars.
  const cleaned = raw.replace(/[^A-Z0-9]/g, "");
  if (cleaned.length < 4 || cleaned.length > 10) return null;
  return cleaned;
}

function getStore() {
  if (!globalThis[STORE_KEY]) {
    globalThis[STORE_KEY] = {
      sessions: new Map(),
    };
  }
  return globalThis[STORE_KEY];
}

function cleanup(store) {
  const t = now();
  const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2h since last activity
  const PLAYER_TTL_MS = 3 * 60 * 1000; // 3m since last seen

  for (const [sessionId, session] of store.sessions.entries()) {
    if (t - session.updatedAt > SESSION_TTL_MS) {
      store.sessions.delete(sessionId);
      continue;
    }

    for (const [playerId, p] of session.players.entries()) {
      if (t - p.lastSeenAt > PLAYER_TTL_MS) {
        session.tokens.delete(p.token);
        session.players.delete(playerId);
      }
    }

    // If admin disappeared, promote earliest joined player.
    if (!session.players.has(session.adminPlayerId)) {
      const remaining = [...session.players.values()].sort((a, b) => a.joinedAt - b.joinedAt);
      session.adminPlayerId = remaining[0]?.id || null;
    }
  }
}

function ensureSession(store, sessionId) {
  if (store.sessions.has(sessionId)) return store.sessions.get(sessionId);
  const session = {
    id: sessionId,
    createdAt: now(),
    updatedAt: now(),
    adminPlayerId: null,
    status: "lobby", // lobby | round | ended
    roundNumber: 0,
    word: null,
    hint: null,
    impostorId: null,
    players: new Map(), // playerId -> {id,name,token,alive,joinedAt,lastSeenAt}
    tokens: new Map(), // token -> playerId
  };
  store.sessions.set(sessionId, session);
  return session;
}

function publicSessionState(session) {
  return {
    id: session.id,
    status: session.status,
    roundNumber: session.roundNumber,
    adminPlayerId: session.adminPlayerId,
    players: [...session.players.values()].map((p) => ({
      id: p.id,
      name: p.name,
      alive: p.alive,
    })),
    updatedAt: session.updatedAt,
  };
}

function playerView(session, playerId) {
  const p = session.players.get(playerId);
  if (!p) return null;
  const isAdmin = session.adminPlayerId === playerId;
  const isAlive = Boolean(p.alive);
  const isRound = session.status === "round" && session.word && session.impostorId;
  const isImpostor = isRound && session.impostorId === playerId;
  return {
    id: p.id,
    name: p.name,
    isAdmin,
    alive: isAlive,
    round: isRound
      ? {
          isImpostor,
          word: isAlive && !isImpostor ? session.word : null,
          hint: isAlive && isImpostor ? session.hint : null,
        }
      : null,
  };
}

function startOrNextRound(session, { showHints }) {
  const alivePlayers = [...session.players.values()].filter((p) => p.alive);
  if (alivePlayers.length < 2) {
    session.status = "ended";
    session.word = null;
    session.hint = null;
    session.impostorId = null;
    session.updatedAt = now();
    return;
  }

  const word = pick(WORDS);
  const hintPool = HINTS[word] || [""];
  const hint = showHints ? pick(hintPool) : null;
  const impostor = pick(alivePlayers);

  session.status = "round";
  session.roundNumber = (session.roundNumber || 0) + 1;
  session.word = word;
  session.hint = hint;
  session.impostorId = impostor.id;
  session.updatedAt = now();
}

async function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) reject(new Error("Body too large"));
    });
    req.on("end", () => resolve(raw));
    req.on("error", reject);
  });
}

async function readJson(req) {
  const raw = await readBody(req);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Invalid JSON body");
  }
}

module.exports = async (req, res) => {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.end();
  }

  if (req.method !== "POST") {
    return json(res, 405, { ok: false, error: "Method not allowed" });
  }

  let body;
  try {
    body = await readJson(req);
  } catch (err) {
    return badRequest(res, err.message);
  }

  const op = String(body.op || "").trim();
  const store = getStore();
  cleanup(store);

  if (!op) return badRequest(res, "Missing op");

  // ---- join ----
  if (op === "join") {
    const sessionId = normalizeSessionId(body.sessionId);
    if (!sessionId) return badRequest(res, "Invalid sessionId (use 4-10 letters/numbers)");
    const name = sanitizeName(body.name);
    if (!name) return badRequest(res, "Name required");

    const session = ensureSession(store, sessionId);
    if (session.status !== "lobby") {
      return badRequest(res, "Game already started — ask the admin to reset");
    }
    const playerId = randomId("p");
    const token = randomId("t");
    const joinedAt = now();
    const p = {
      id: playerId,
      name,
      token,
      alive: true,
      joinedAt,
      lastSeenAt: joinedAt,
    };

    session.players.set(playerId, p);
    session.tokens.set(token, playerId);
    if (!session.adminPlayerId) session.adminPlayerId = playerId;
    session.updatedAt = now();

    return json(res, 200, {
      ok: true,
      sessionId,
      playerId,
      playerToken: token,
      isAdmin: session.adminPlayerId === playerId,
      session: publicSessionState(session),
      me: playerView(session, playerId),
    });
  }

  // ---- state / keepalive ----
  if (op === "state") {
    const sessionId = normalizeSessionId(body.sessionId);
    if (!sessionId) return badRequest(res, "Invalid sessionId");
    const token = String(body.playerToken || "").trim();
    if (!token) return badRequest(res, "Missing playerToken");

    const session = store.sessions.get(sessionId);
    if (!session) return notFound(res, "Session not found (it may have reset)");

    const playerId = session.tokens.get(token);
    if (!playerId) return forbidden(res, "Unknown player token");

    const player = session.players.get(playerId);
    if (!player) return forbidden(res, "Player not found");

    player.lastSeenAt = now();
    session.updatedAt = now();

    return json(res, 200, {
      ok: true,
      session: publicSessionState(session),
      me: playerView(session, playerId),
      serverTime: now(),
    });
  }

  // ---- rename ----
  if (op === "rename") {
    const sessionId = normalizeSessionId(body.sessionId);
    if (!sessionId) return badRequest(res, "Invalid sessionId");
    const token = String(body.playerToken || "").trim();
    if (!token) return badRequest(res, "Missing playerToken");
    const name = sanitizeName(body.name);
    if (!name) return badRequest(res, "Name required");

    const session = store.sessions.get(sessionId);
    if (!session) return notFound(res, "Session not found");

    const playerId = session.tokens.get(token);
    if (!playerId) return forbidden(res, "Unknown player token");
    const player = session.players.get(playerId);
    if (!player) return forbidden(res, "Player not found");

    player.name = name;
    player.lastSeenAt = now();
    session.updatedAt = now();

    return json(res, 200, { ok: true, session: publicSessionState(session), me: playerView(session, playerId) });
  }

  // ---- admin actions ----
  const sessionId = normalizeSessionId(body.sessionId);
  if (!sessionId) return badRequest(res, "Invalid sessionId");
  const token = String(body.playerToken || "").trim();
  if (!token) return badRequest(res, "Missing playerToken");

  const session = store.sessions.get(sessionId);
  if (!session) return notFound(res, "Session not found");

  const playerId = session.tokens.get(token);
  if (!playerId) return forbidden(res, "Unknown player token");
  if (session.adminPlayerId !== playerId) return forbidden(res, "Only the admin can do this");

  if (op === "start") {
    if (session.status !== "lobby") return badRequest(res, "Game already started");
    startOrNextRound(session, { showHints: Boolean(body.showHints) });
    return json(res, 200, { ok: true, session: publicSessionState(session) });
  }

  if (op === "kill") {
    const targetId = String(body.targetPlayerId || "").trim();
    if (!targetId) return badRequest(res, "Missing targetPlayerId");
    const target = session.players.get(targetId);
    if (!target) return notFound(res, "Target player not found");
    target.alive = false;
    session.updatedAt = now();

    // If fewer than 2 alive, end the game.
    const aliveCount = [...session.players.values()].filter((p) => p.alive).length;
    if (aliveCount < 2) {
      session.status = "ended";
      session.word = null;
      session.hint = null;
      session.impostorId = null;
    }

    return json(res, 200, { ok: true, session: publicSessionState(session) });
  }

  if (op === "nextRound") {
    if (session.status === "ended") return badRequest(res, "Game has ended");
    startOrNextRound(session, { showHints: Boolean(body.showHints) });
    return json(res, 200, { ok: true, session: publicSessionState(session) });
  }

  if (op === "reset") {
    session.status = "lobby";
    session.roundNumber = 0;
    session.word = null;
    session.hint = null;
    session.impostorId = null;
    for (const p of session.players.values()) p.alive = true;
    session.updatedAt = now();
    return json(res, 200, { ok: true, session: publicSessionState(session) });
  }

  return badRequest(res, `Unknown op: ${op}`);
};
