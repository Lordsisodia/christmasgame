import React, { useMemo, useState } from "react";
import { SafeAreaView, Text, TouchableOpacity, View } from "react-native";
import { PartyScreen } from "./screens/PartyScreen";
import { MultiplayerLobbyScreen } from "./screens/MultiplayerLobbyScreen";
import { MultiplayerRoundScreen } from "./screens/MultiplayerRoundScreen";
import { styles } from "./styles";
import { theme } from "./theme";
import { useMultiplayerSession } from "./hooks/useMultiplayerSession";

export default function RootApp() {
  const [showHints, setShowHints] = useState(true);
  const session = useMultiplayerSession();

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

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {screen === "join" && (
          <PartyScreen
            initialCode={session.initialCode}
            error={session.error}
            loading={session.loading}
            onJoin={({ name, code }) => session.join({ name, code })}
            onCreate={({ name, code }) => session.join({ name, code })}
          />
        )}

        {screen === "lobby" && (
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

        {screen === "round" && (
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

        {screen === "ended" && (
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

