import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "christmasgame/multiplayer";

const API_BASE = (process.env.EXPO_PUBLIC_API_BASE || "").replace(/\/+$/, "");

async function apiCall(payload) {
  const url = `${API_BASE || ""}/api/multiplayer`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  let data = {};
  try {
    data = JSON.parse(text);
  } catch {
    data = {};
  }
  if (!res.ok || !data?.ok) {
    const message = data?.error || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

function getInitialSessionCodeFromUrl() {
  if (typeof window === "undefined") return "";
  try {
    const params = new URLSearchParams(window.location.search);
    return (params.get("code") || "").toUpperCase();
  } catch {
    return "";
  }
}

function setUrlCode(code) {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    url.searchParams.set("code", code);
    window.history.replaceState({}, "", url.toString());
  } catch {
    // no-op
  }
}

export function useMultiplayerSession() {
  const [sessionId, setSessionId] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [playerToken, setPlayerToken] = useState("");
  const [session, setSession] = useState(null);
  const [me, setMe] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const pollingRef = useRef(null);

  const initialCode = useMemo(() => getInitialSessionCodeFromUrl(), []);

  // Load saved credentials once.
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const saved = JSON.parse(raw);
        if (saved?.sessionId) setSessionId(saved.sessionId);
        if (saved?.playerId) setPlayerId(saved.playerId);
        if (saved?.playerToken) setPlayerToken(saved.playerToken);
      } catch {
        // ignore
      }
    })();
  }, []);

  const saveCreds = useCallback(async (next) => {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        sessionId: next.sessionId,
        playerId: next.playerId,
        playerToken: next.playerToken,
      })
    );
  }, []);

  const clearCreds = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setSessionId("");
    setPlayerId("");
    setPlayerToken("");
    setSession(null);
    setMe(null);
    setError("");
  }, []);

  const join = useCallback(
    async ({ code, name }) => {
      setLoading(true);
      setError("");
      try {
        const data = await apiCall({ op: "join", sessionId: code, name });
        setSessionId(data.sessionId);
        setPlayerId(data.playerId);
        setPlayerToken(data.playerToken);
        setSession(data.session);
        setMe(data.me);
        setUrlCode(data.sessionId);
        await saveCreds({ sessionId: data.sessionId, playerId: data.playerId, playerToken: data.playerToken });
      } catch (err) {
        setError(err.message || "Failed to join");
      } finally {
        setLoading(false);
      }
    },
    [saveCreds]
  );

  const refresh = useCallback(async () => {
    if (!sessionId || !playerToken) return;
    try {
      const data = await apiCall({ op: "state", sessionId, playerToken });
      setSession(data.session);
      setMe(data.me);
      setError("");
    } catch (err) {
      setError(err.message || "Disconnected");
    }
  }, [playerToken, sessionId]);

  // Poll server state (keeps function warm and syncs session).
  useEffect(() => {
    if (!sessionId || !playerToken) return;
    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      await refresh();
    };

    tick();
    pollingRef.current = setInterval(tick, 900);

    return () => {
      cancelled = true;
      if (pollingRef.current) clearInterval(pollingRef.current);
      pollingRef.current = null;
    };
  }, [playerToken, refresh, sessionId]);

  const startGame = useCallback(async ({ showHints }) => {
    if (!sessionId || !playerToken) return;
    setLoading(true);
    setError("");
    try {
      await apiCall({ op: "start", sessionId, playerToken, showHints: Boolean(showHints) });
      await refresh();
    } catch (err) {
      setError(err.message || "Failed to start");
    } finally {
      setLoading(false);
    }
  }, [playerToken, refresh, sessionId]);

  const killPlayer = useCallback(async ({ targetPlayerId }) => {
    if (!sessionId || !playerToken) return;
    setLoading(true);
    setError("");
    try {
      await apiCall({ op: "kill", sessionId, playerToken, targetPlayerId });
      await refresh();
    } catch (err) {
      setError(err.message || "Failed to kill");
    } finally {
      setLoading(false);
    }
  }, [playerToken, refresh, sessionId]);

  const nextRound = useCallback(async ({ showHints }) => {
    if (!sessionId || !playerToken) return;
    setLoading(true);
    setError("");
    try {
      await apiCall({ op: "nextRound", sessionId, playerToken, showHints: Boolean(showHints) });
      await refresh();
    } catch (err) {
      setError(err.message || "Failed to start next round");
    } finally {
      setLoading(false);
    }
  }, [playerToken, refresh, sessionId]);

  const reset = useCallback(async () => {
    if (!sessionId || !playerToken) return;
    setLoading(true);
    setError("");
    try {
      await apiCall({ op: "reset", sessionId, playerToken });
      await refresh();
    } catch (err) {
      setError(err.message || "Failed to reset");
    } finally {
      setLoading(false);
    }
  }, [playerToken, refresh, sessionId]);

  const isConnected = Boolean(sessionId && playerToken);
  const isAdmin = Boolean(me?.isAdmin);

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    if (!sessionId) return "";
    return `${window.location.origin}/?code=${sessionId}`;
  }, [sessionId]);

  return {
    initialCode,
    isConnected,
    isAdmin,
    sessionId,
    playerId,
    playerToken,
    session,
    me,
    shareUrl,
    loading,
    error,
    join,
    refresh,
    startGame,
    killPlayer,
    nextRound,
    reset,
    clearCreds,
  };
}
