import React, { useEffect, useState } from "react";
import { SafeAreaView, Text, TouchableOpacity, View } from "react-native";
import { styles } from "./src/styles";
import { LobbyScreen } from "./src/screens/LobbyScreen";
import { HandoutScreen } from "./src/screens/HandoutScreen";
import { PartyScreen } from "./src/screens/PartyScreen";
import { VotingScreen } from "./src/screens/VotingScreen";
import { RevealScreen } from "./src/screens/RevealScreen";
import { SummaryScreen } from "./src/screens/SummaryScreen";
import { usePartyState } from "./src/hooks/usePartyState";
import { theme } from "./src/theme";

const randomId = () => `p-${Math.random().toString(16).slice(2, 8)}`;

export default function App() {
  const [rounds, setRounds] = useState(3);
  const [showHints, setShowHints] = useState(true);
  const [screen, setScreen] = useState("party"); // party | lobby | handout | vote | reveal | summary
  const [partyCode, setPartyCode] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [me, setMe] = useState(null);

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
