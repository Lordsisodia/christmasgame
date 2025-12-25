const crypto = require("crypto");

// Stateless session: all game state travels in a signed blob (no DB, no in-memory store needed).
// Tradeoffs: tampering is prevented by HMAC, but the last-writer-wins (admin actions) model assumes low contention.

const SECRET = process.env.MULTIPLAYER_SECRET || "local-dev-secret-please-change";
const SESSION_MAX_AGE_MS = 2 * 60 * 60 * 1000; // 2 hours

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
const now = () => Date.now();

const base64url = (buf) =>
  Buffer.from(buf).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

function signPayload(obj) {
  const json = JSON.stringify(obj);
  const sig = crypto.createHmac("sha256", SECRET).update(json).digest();
  return `${base64url(json)}.${base64url(sig)}`;
}

function verifyPayload(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) throw new Error("Missing session blob");
  const [payloadB64, sigB64] = token.split(".");
  const jsonStr = Buffer.from(payloadB64.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
  const expectedSig = crypto.createHmac("sha256", SECRET).update(jsonStr).digest();
  const providedSig = Buffer.from(sigB64.replace(/-/g, "+").replace(/_/g, "/"), "base64");
  if (!crypto.timingSafeEqual(expectedSig, providedSig)) throw new Error("Invalid signature");
  const obj = JSON.parse(jsonStr);
  if (now() - (obj.updatedAt || 0) > SESSION_MAX_AGE_MS) throw new Error("Session expired");
  return obj;
}

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Origin", "*");
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
  const cleaned = raw.replace(/[^A-Z0-9]/g, "");
  if (cleaned.length < 4 || cleaned.length > 10) return null;
  return cleaned;
}

function newSession(sessionId) {
  return {
    id: sessionId,
    createdAt: now(),
    updatedAt: now(),
    adminPlayerId: null,
    status: "lobby", // lobby | round | ended
    roundNumber: 0,
    word: null,
    hint: null,
    impostorId: null,
    players: [], // {id,name,token,alive,joinedAt,lastSeenAt}
  };
}

function publicSessionState(session) {
  return {
    id: session.id,
    status: session.status,
    roundNumber: session.roundNumber,
    adminPlayerId: session.adminPlayerId,
    players: session.players.map((p) => ({ id: p.id, name: p.name, alive: p.alive })),
    updatedAt: session.updatedAt,
  };
}

function playerView(session, playerId) {
  const p = session.players.find((x) => x.id === playerId);
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
  const alive = session.players.filter((p) => p.alive);
  const word = pick(WORDS);
  const hintPool = HINTS[word] || [""];
  const hint = showHints ? pick(hintPool) : null;
  const impostor = pick(alive);

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

function loadSession(blob, allowMissing = false) {
  if (!blob) {
    if (allowMissing) return null;
    throw new Error("Missing session blob");
  }
  return verifyPayload(blob);
}

function updateSessionBlob(session) {
  session.updatedAt = now();
  return signPayload(session);
}

module.exports = async (req, res) => {
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Cache-Control", "no-store");
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
  if (!op) return badRequest(res, "Missing op");

  // join does not require existing session blob
  if (op === "join") {
    const sessionId = normalizeSessionId(body.sessionId);
    if (!sessionId) return badRequest(res, "Invalid sessionId (use 4-10 letters/numbers)");
    const name = sanitizeName(body.name);
    if (!name) return badRequest(res, "Name required");

    const session = newSession(sessionId);
    const playerId = randomId("p");
    const token = randomId("t");
    const joinedAt = now();
    session.players.push({
      id: playerId,
      name,
      token,
      alive: true,
      joinedAt,
      lastSeenAt: joinedAt,
    });
    session.adminPlayerId = playerId;

    const sessionBlob = updateSessionBlob(session);
    return json(res, 200, {
      ok: true,
      sessionId,
      sessionBlob,
      playerId,
      playerToken: token,
      isAdmin: true,
      session: publicSessionState(session),
      me: playerView(session, playerId),
    });
  }

  // state-only ops require session blob
  let session;
  try {
    session = loadSession(body.sessionBlob);
  } catch (err) {
    return badRequest(res, err.message);
  }

  const playerToken = String(body.playerToken || "").trim();
  const player = session.players.find((p) => p.token === playerToken);
  if (!player) return forbidden(res, "Unknown player token");

  player.lastSeenAt = now();

  // STATE
  if (op === "state") {
    const sessionBlob = updateSessionBlob(session);
    return json(res, 200, {
      ok: true,
      session: publicSessionState(session),
      sessionBlob,
      me: playerView(session, player.id),
      serverTime: now(),
    });
  }

  // RENAME
  if (op === "rename") {
    const name = sanitizeName(body.name);
    if (!name) return badRequest(res, "Name required");
    player.name = name;
    const sessionBlob = updateSessionBlob(session);
    return json(res, 200, { ok: true, session: publicSessionState(session), sessionBlob, me: playerView(session, player.id) });
  }

  const isAdmin = session.adminPlayerId === player.id;
  if (!isAdmin) return forbidden(res, "Only admin can perform this action");

  // START
  if (op === "start") {
    if (session.status !== "lobby") return badRequest(res, "Game already started");
    const alive = session.players.filter((p) => p.alive);
    if (alive.length < 2) return badRequest(res, "Need at least 2 players to start");
    startOrNextRound(session, { showHints: Boolean(body.showHints) });
    const sessionBlob = updateSessionBlob(session);
    return json(res, 200, { ok: true, session: publicSessionState(session), sessionBlob });
  }

  // KILL
  if (op === "kill") {
    const targetId = String(body.targetPlayerId || "").trim();
    const target = session.players.find((p) => p.id === targetId);
    if (!target) return notFound(res, "Target player not found");
    target.alive = false;
    const aliveCount = session.players.filter((p) => p.alive).length;
    if (aliveCount < 2) {
      session.status = "ended";
      session.word = null;
      session.hint = null;
      session.impostorId = null;
    }
    const sessionBlob = updateSessionBlob(session);
    return json(res, 200, { ok: true, session: publicSessionState(session), sessionBlob });
  }

  // NEXT ROUND
  if (op === "nextRound") {
    if (session.status === "ended") return badRequest(res, "Game has ended");
    const alive = session.players.filter((p) => p.alive);
    if (alive.length < 2) return badRequest(res, "Need at least 2 players alive");
    startOrNextRound(session, { showHints: Boolean(body.showHints) });
    const sessionBlob = updateSessionBlob(session);
    return json(res, 200, { ok: true, session: publicSessionState(session), sessionBlob });
  }

  // RESET
  if (op === "reset") {
    session.status = "lobby";
    session.roundNumber = 0;
    session.word = null;
    session.hint = null;
    session.impostorId = null;
    session.players.forEach((p) => (p.alive = true));
    const sessionBlob = updateSessionBlob(session);
    return json(res, 200, { ok: true, session: publicSessionState(session), sessionBlob });
  }

  return badRequest(res, `Unknown op: ${op}`);
};
