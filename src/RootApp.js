import React, { useMemo, useState } from "react";
import { SafeAreaView, Text, TouchableOpacity, View } from "react-native";
import { PartyScreen } from "./screens/PartyScreen";
import { MultiplayerLobbyScreen } from "./screens/MultiplayerLobbyScreen";
import { MultiplayerRoundScreen } from "./screens/MultiplayerRoundScreen";
import { styles } from "./styles";
import { theme } from "./theme";
import { useMultiplayerSession } from "./hooks/useMultiplayerSession";
import { LobbyScreen } from "./screens/LobbyScreen";
import { HandoutScreen } from "./screens/HandoutScreen";
import { HINTS, WORDS, pick, scoresFor } from "./utils/game";

const DEFAULT_PLAYERS = [
  { id: "p1", name: "alex" },
  { id: "p2", name: "siso" },
  { id: "p3", name: "cam" },
  { id: "p4", name: "charlie" },
];

export default function RootApp() {
  const [mode, setMode] = useState("multi"); // multi | solo
  const [showHints, setShowHints] = useState(true);
  const session = useMultiplayerSession();

  // local (solo phone) state
  const [localPlayers, setLocalPlayers] = useState(DEFAULT_PLAYERS);
  const [localScores, setLocalScores] = useState(() => Object.fromEntries(DEFAULT_PLAYERS.map((p) => [p.id, 0])));
  const [localGame, setLocalGame] = useState(null);
  const [localScreen, setLocalScreen] = useState("lobby"); // lobby | handout

  const status = session.session?.status || "lobby";
  const players = session.session?.players || [];
  const roundNumber = session.session?.roundNumber || 0;
  const adminPlayerId = session.session?.adminPlayerId || null;

  const me = session.me;
  const isAdmin = session.isAdmin;

  const screen = useMemo(() => {
    if (!session.isConnected) return "join";
    if (status === "lobby") return "lobby";
    if (status === "round") return "round";
    if (status === "ended") return "ended";
    return "lobby";
  }, [session.isConnected, status]);

  const startLocalGame = () => {
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
  };

  const nextLocalHandout = () => {
    if (!localGame) return;
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
  };

  const ModeSelector = () => (
    <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
      {[
        { key: "multi", title: "Multi-Phone", desc: "Join via code; first join is admin" },
        { key: "solo", title: "Solo (Pass-phone)", desc: "One phone, hand to each player" },
      ].map((opt) => (
        <TouchableOpacity
          key={opt.key}
          style={[
            styles.card,
            {
              flex: 1,
              borderColor: mode === opt.key ? theme.accent : theme.line,
              borderWidth: 1.2,
              padding: 12,
            },
          ]}
          onPress={() => setMode(opt.key)}
        >
          <Text style={[styles.title, { fontSize: 16 }]}>{opt.title}</Text>
          <Text style={[styles.subhero, { marginTop: 4 }]}>{opt.desc}</Text>
          {mode === opt.key ? <Text style={{ color: theme.accent, marginTop: 4 }}>Selected</Text> : null}
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <ModeSelector />

        {mode === "solo" && (
          <>
            {localScreen === "lobby" && (
              <LobbyScreen
                players={localPlayers}
                setPlayers={setLocalPlayers}
                rounds={3}
                setRounds={() => {}}
                showHints={showHints}
                setShowHints={setShowHints}
                onStart={startLocalGame}
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
                onNext={nextLocalHandout}
              />
            )}
            <TouchableOpacity onPress={() => setLocalScreen("lobby")} style={[styles.secondaryButton, { marginTop: 12 }]}>
              <Text style={styles.secondaryText}>Back to Lobby</Text>
            </TouchableOpacity>
          </>
        )}

        {mode === "multi" && screen === "join" && (
          <PartyScreen
            initialCode={session.initialCode}
            error={session.error}
            loading={session.loading}
            onJoin={({ name, code }) => session.join({ name, code })}
            onCreate={({ name, code }) => session.join({ name, code })}
          />
        )}

        {mode === "multi" && screen === "lobby" && (
          <View style={{ width: "100%", gap: 10 }}>
            {isAdmin ? (
              <View style={[styles.card, { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }]}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.label}>Admin Settings</Text>
                  <Text style={[styles.subhero, { marginTop: 2 }]}>Hints for impostor</Text>
                </View>
                <TouchableOpacity
                  style={styles.toggle}
                  onPress={() => setShowHints((v) => !v)}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: showHints }}
                >
                  <View style={[styles.knob, showHints && styles.knobOn]} />
                </TouchableOpacity>
              </View>
            ) : null}

            <MultiplayerLobbyScreen
              sessionId={session.sessionId}
              shareUrl={session.shareUrl}
              me={me}
              players={players}
              adminPlayerId={adminPlayerId}
              isAdmin={isAdmin}
              error={session.error}
              onStart={() => session.startGame({ showHints })}
              onLeave={session.clearCreds}
            />
          </View>
        )}

        {mode === "multi" && screen === "round" && (
          <MultiplayerRoundScreen
            me={me}
            sessionId={session.sessionId}
            roundNumber={roundNumber}
            players={players}
            isAdmin={isAdmin}
            showHints={showHints}
            error={session.error}
            onKill={(id) => session.killPlayer({ targetPlayerId: id })}
            onNextRound={() => session.nextRound({ showHints })}
            onReset={session.reset}
          />
        )}

        {mode === "multi" && screen === "ended" && (
          <View style={[styles.card, { gap: 10, alignItems: "center" }]}>
            <Text style={styles.hero}>GAME OVER</Text>
            <Text style={styles.subhero}>Session ended (not enough players alive).</Text>
            <Text style={{ color: theme.muted, fontSize: 12 }} selectable>
              Code: {session.sessionId}
            </Text>
            {isAdmin ? (
              <TouchableOpacity onPress={session.reset} style={[styles.primaryButton, { marginTop: 6 }]}>
                <Text style={styles.primaryText}>Reset to Lobby</Text>
              </TouchableOpacity>
            ) : (
              <Text style={{ color: theme.muted, fontSize: 12 }}>Waiting for admin to reset.</Text>
            )}
            <TouchableOpacity onPress={session.clearCreds} style={[styles.secondaryButton, { marginTop: 4 }]}>
              <Text style={styles.secondaryText}>Leave Session</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
