import React, { useEffect, useState } from "react";
import { SafeAreaView, Text, TouchableOpacity, View } from "react-native";
import { styles } from "./styles";
import { LobbyScreen } from "./screens/LobbyScreen";
import { HandoutScreen } from "./screens/HandoutScreen";
import { PartyScreen } from "./screens/PartyScreen";
import { VotingScreen } from "./screens/VotingScreen";
import { RevealScreen } from "./screens/RevealScreen";
import { SummaryScreen } from "./screens/SummaryScreen";
import { usePartyState } from "./hooks/usePartyState";
import { theme } from "./theme";
import { supabaseReady } from "./lib/supabase";
import { HINTS, WORDS, pick, scoresFor } from "./utils/game";

const randomId = () => `p-${Math.random().toString(16).slice(2, 8)}`;
const DEFAULT_PLAYERS = [
  { id: "p1", name: "alex" },
  { id: "p2", name: "siso" },
  { id: "p3", name: "cam" },
  { id: "p4", name: "charlie" },
];

export default function RootApp() {
  const [rounds, setRounds] = useState(3);
  const [showHints, setShowHints] = useState(true);
  const [screen, setScreen] = useState("party"); // party | lobby | handout | vote | reveal | summary
  const [partyCode, setPartyCode] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [me, setMe] = useState(null);
  const [localPlayers, setLocalPlayers] = useState(DEFAULT_PLAYERS);
  const [localScores, setLocalScores] = useState(() => Object.fromEntries(DEFAULT_PLAYERS.map((p) => [p.id, 0])));
  const [localGame, setLocalGame] = useState(null);
  const [localScreen, setLocalScreen] = useState("lobby"); // lobby | handout

  const { state: partyState, broadcast, startGame, nextHandout, recordVotes } = usePartyState({
    code: partyCode,
    me,
    isHost,
    showHints,
  });

  // Host seeds initial state once.
  useEffect(() => {
    if (isHost && partyCode && me && !partyState) {
      broadcast({
        players: [me],
        status: "lobby",
        roundNumber: 1,
        scores: { [me.id]: 0 },
      });
    }
  }, [broadcast, isHost, me, partyCode, partyState]);

  const players = partyState?.players || [];
  const currentHandout = partyState?.currentHandout;

  const setPlayers = (nextPlayers) => {
    if (!isHost || !partyState) return;
    broadcast({ ...partyState, players: nextPlayers });
  };

  const handleCreate = ({ name, code }) => {
    const player = { id: randomId(), name: name || "Host" };
    setIsHost(true);
    setMe(player);
    setPartyCode(code);
    setScreen("lobby");
  };

  const handleJoin = ({ name, code }) => {
    const player = { id: randomId(), name: name || "Player" };
    setIsHost(false);
    setMe(player);
    setPartyCode(code);
    setScreen("lobby");
  };

  const handleStart = () => {
    startGame();
    setScreen("handout");
  };

  const handleNext = () => {
    nextHandout();
  };

  const handleVoteComplete = (selectedId) => {
    if (!isHost) return;
    recordVotes(selectedId);
    setScreen("reveal");
  };

  const handleRevealNext = () => {
    // After reveal, start next round handouts.
    nextHandout();
    setScreen("handout");
  };

  const targetPlayer = currentHandout && players[currentHandout.index || 0];
  const isMyTurn = targetPlayer && me && targetPlayer.id === me.id;
  const isImpostor = me && currentHandout && me.id === currentHandout.impostorId;

  // ---------- Fallback: no Supabase env, use pass-the-phone local mode ----------
  if (!supabaseReady) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
          <View style={[styles.card, { marginBottom: 10 }]}>            
            <Text style={styles.hero}>Multiplayer off (no Supabase env)</Text>
            <Text style={styles.subhero}>Using local pass-the-phone flow.</Text>
          </View>
          {localScreen === "lobby" && (
            <LobbyScreen
              players={localPlayers}
              setPlayers={setLocalPlayers}
              rounds={rounds}
              setRounds={setRounds}
              showHints={showHints}
              setShowHints={setShowHints}
              onStart={() => {
                const word = pick(WORDS);
                const impostor = pick(localPlayers);
                const hint = pick(HINTS[word]);
                const baseScores = scoresFor(localPlayers, localScores);
                setLocalGame({
                  players: localPlayers,
                  word,
                  hint,
                  impostorId: impostor.id,
                  roleIndex: 0,
                  roundNumber: 1,
                  scores: baseScores,
                });
                setLocalScreen("handout");
              }}
            />
          )}
          {localScreen === "handout" && localGame && (
            <HandoutScreen
              player={localGame.players[localGame.roleIndex]}
              isImpostor={localGame.players[localGame.roleIndex].id === localGame.impostorId}
              word={localGame.word}
              hint={showHints ? localGame.hint : null}
              index={localGame.roleIndex}
              total={localGame.players.length}
              onNext={() => {
                const next = localGame.roleIndex + 1;
                if (next >= localGame.players.length) {
                  const roundNumber = (localGame.roundNumber || 1) + 1;
                  const word = pick(WORDS);
                  const impostor = pick(localPlayers);
                  const hint = pick(HINTS[word]);
                  setLocalGame({
                    players: localPlayers,
                    word,
                    hint,
                    impostorId: impostor.id,
                    roleIndex: 0,
                    roundNumber,
                    scores: localGame.scores,
                  });
                  return;
                }
                setLocalGame({ ...localGame, roleIndex: next });
              }}
            />
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {screen === "party" && <PartyScreen onCreate={handleCreate} onJoin={handleJoin} />}

        {screen === "lobby" && (
          <View style={{ width: "100%", gap: 10 }}>
            {partyCode ? (
              <View style={{ alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: theme.line, backgroundColor: "#111624" }}>
                <Text style={{ color: theme.muted, fontWeight: "700" }}>Party Code: {partyCode}</Text>
              </View>
            ) : null}
            <LobbyScreen
              players={players}
              setPlayers={setPlayers}
              rounds={rounds}
              setRounds={setRounds}
              showHints={showHints}
              setShowHints={setShowHints}
              onStart={isHost ? handleStart : null}
            />
          </View>
        )}

        {screen === "handout" && partyState && currentHandout && (
          <>
            {isMyTurn ? (
              <HandoutScreen
                player={me}
                isImpostor={isImpostor}
                word={!isImpostor ? currentHandout.word : null}
                hint={isImpostor ? currentHandout.hint : null}
                index={currentHandout.index + 1}
                total={players.length}
                onNext={() => {
                  handleNext();
                  if (currentHandout.index + 1 >= players.length - 1) {
                    setScreen("vote");
                  }
                }}
                showNavigation={isHost}
              />
            ) : (
              <View style={[styles.card, { alignItems: "center", gap: 8 }]}>                
                <Text style={styles.hero}>Stand by</Text>
                <Text style={styles.subhero}>Waiting for your turn.</Text>
                {isHost && (
                  <TouchableOpacity onPress={() => {
                    handleNext();
                    if (currentHandout.index + 1 >= players.length - 1) {
                      setScreen("vote");
                    }
                  }} style={[styles.primaryButton, { marginTop: 10 }]}>                    
                    <Text style={styles.primaryText}>Next Player</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </>
        )}

        {screen === "vote" && partyState && (
          <VotingScreen
            players={players}
            selected={partyState?.selection}
            onSelect={(id) => isHost && broadcast({ ...partyState, selection: id })}
            onConfirm={() => handleVoteComplete(partyState?.selection)}
            round={partyState?.roundNumber || 1}
            maxRounds={rounds}
          />
        )}

        {screen === "reveal" && partyState && (
          <RevealScreen
            players={players}
            impostorId={partyState?.currentHandout?.impostorId}
            votes={partyState?.votes || []}
            scores={partyState?.scores || {}}
            onNext={handleRevealNext}
            onEnd={() => setScreen("summary")}
          />
        )}

        {screen === "summary" && partyState && (
          <SummaryScreen players={players} scores={partyState?.scores || {}} onRestart={() => setScreen("party")} />
        )}
      </View>
    </SafeAreaView>
  );
}
