import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { pick, HINTS, WORDS, scoresFor, applyScores } from "../utils/game";

export function usePartyState({ code, me, isHost, showHints }) {
  const [state, setState] = useState(null); // {players, status, roundNumber, currentHandout, scores, votes}
  const channel = useMemo(() => {
    if (!code) return null;
    return supabase.channel(`party:${code}`, { config: { broadcast: { ack: true } } });
  }, [code]);

  const broadcast = useCallback(
    (next) => {
      if (!channel) return;
      setState(next);
      channel.send({ type: "broadcast", event: "state", payload: next });
    },
    [channel]
  );

  useEffect(() => {
    if (!channel) return;

    const onState = (payload) => setState(payload);

    channel
      .on("broadcast", { event: "state" }, ({ payload }) => onState(payload))
      .on("broadcast", { event: "join" }, ({ payload }) => {
        if (!isHost) return;
        const incoming = payload?.player;
        if (!incoming?.id) return;
        const next = state || { players: [], status: "lobby", roundNumber: 1, scores: {} };
        if (next.players.some((p) => p.id === incoming.id)) return;
        const scores = { ...(next.scores || {}), [incoming.id]: 0 };
        broadcast({ ...next, players: [...next.players, incoming], scores });
      })
      .on("broadcast", { event: "request_state" }, () => {
        if (isHost && state) {
          channel.send({ type: "broadcast", event: "state", payload: state });
        }
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.send({ type: "broadcast", event: "request_state", payload: { requester: me?.id } });
          if (me?.id) {
            await channel.send({ type: "broadcast", event: "join", payload: { player: me } });
          }
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [broadcast, channel, isHost, me?.id, state]);

  const ensureJoined = useCallback(() => {
    if (!me || !state) return;
    if (state.players.some((p) => p.id === me.id)) return;
    if (!isHost) return;
    broadcast({ ...state, players: [...state.players, me] });
  }, [broadcast, isHost, me, state]);

  useEffect(() => {
    ensureJoined();
  }, [ensureJoined]);

  const startGame = useCallback(() => {
    if (!isHost || !state) return;
    const impostor = pick(state.players);
    const word = pick(WORDS);
    const hint = pick(HINTS[word]);
    const scores = scoresFor(state.players, state.scores || {});
    broadcast({
      ...state,
      status: "round",
      roundNumber: 1,
      currentHandout: { word, hint: showHints ? hint : null, impostorId: impostor.id, index: 0 },
      scores,
      votes: [],
      selection: null,
    });
  }, [broadcast, isHost, showHints, state]);

  const nextHandout = useCallback(() => {
    if (!isHost || !state) return;
    const { currentHandout, players, status } = state;

    // If we're in reveal, move to next round setup.
    if (status === "reveal") {
      const roundNumber = (state.roundNumber || 1) + 1;
      const impostor = pick(players);
      const word = pick(WORDS);
      const hint = pick(HINTS[word]);
      broadcast({
        ...state,
        status: "round",
        roundNumber,
        currentHandout: { word, hint: showHints ? hint : null, impostorId: impostor.id, index: 0 },
        votes: [],
        selection: null,
      });
      return;
    }

    if (status !== "round") return;

    const nextIndex = (currentHandout?.index ?? 0) + 1;
    if (nextIndex >= players.length) {
      // End of handouts, move to voting phase
      broadcast({ ...state, status: "vote", selection: null, votes: [] });
      return;
    }
    broadcast({ ...state, currentHandout: { ...currentHandout, index: nextIndex } });
  }, [broadcast, isHost, showHints, state]);

  const recordVotes = useCallback(
    (selectedId) => {
      if (!isHost || !state || state.status !== "vote") return;
      const votes = state.players.map((p) => ({ voterId: p.id, targetId: selectedId }));
      const scores = applyScores(state.scores || {}, votes, state.currentHandout?.impostorId);
      broadcast({
        ...state,
        status: "reveal",
        votes,
        scores,
      });
    },
    [broadcast, isHost, state]
  );

  return {
    state,
    broadcast,
    startGame,
    nextHandout,
    recordVotes,
  };
}
