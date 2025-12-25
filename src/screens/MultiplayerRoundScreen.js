import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { HandoutScreen } from "./HandoutScreen";
import { styles } from "../styles";
import { theme } from "../theme";

export function MultiplayerRoundScreen({
  me,
  sessionId,
  roundNumber,
  players,
  isAdmin,
  showHints,
  onKill,
  onNextRound,
  onReset,
  error,
}) {
  const alivePlayers = players.filter((p) => p.alive);
  const meAlive = Boolean(me?.alive);
  const round = me?.round;

  return (
    <ScrollView style={{ width: "100%" }} contentContainerStyle={{ paddingBottom: 12 }} showsVerticalScrollIndicator={false}>
      <View style={{ marginBottom: 10, width: "100%" }}>
        <View style={[styles.card, { gap: 6 }]}>
          <Text style={styles.hero}>ROUND {roundNumber || 1}</Text>
          <Text style={styles.subhero}>
            Code: <Text style={{ color: theme.accent, fontWeight: "900" }}>{sessionId}</Text> · Alive: {alivePlayers.length}
          </Text>
          {error ? <Text style={{ color: "#ffb59f", marginTop: 4 }}>⚠️ {error}</Text> : null}
        </View>
      </View>

      {!meAlive ? (
        <View style={[styles.card, { gap: 6, alignItems: "center" }]}>
          <Text style={styles.hero}>ELIMINATED</Text>
          <Text style={styles.subhero}>You’re out this round. Wait for the next game.</Text>
          {isAdmin && (
            <TouchableOpacity onPress={onReset} style={[styles.secondaryButton, { marginTop: 8 }]}>
              <Text style={styles.secondaryText}>Reset Game</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <>
          {round ? (
            <HandoutScreen
              player={me}
              isImpostor={Boolean(round?.isImpostor)}
              word={round?.word}
              hint={round?.hint}
              index={0}
              total={players.length}
              showNavigation={false}
            />
          ) : (
            <View style={[styles.card, { gap: 6, alignItems: "center" }]}>
              <Text style={styles.hero}>WAITING</Text>
              <Text style={styles.subhero}>Admin hasn’t started the game yet.</Text>
            </View>
          )}
        </>
      )}

      <View style={{ marginTop: 12, width: "100%" }}>
        <Text style={[styles.label, { marginBottom: 6 }]}>Players</Text>
        {players.map((p) => (
          <View key={p.id} style={[styles.row, { opacity: p.alive ? 1 : 0.4 }]}>
            <Text style={styles.inputIcon}>{p.id === me?.id ? "⭐️" : p.alive ? "🧑" : "💀"}</Text>
            <Text style={[styles.title, { flex: 1, fontSize: 16 }]}>{p.name}</Text>
            {isAdmin && p.alive && p.id !== me?.id ? (
              <TouchableOpacity onPress={() => onKill?.(p.id)} style={{ borderRadius: 10, overflow: "hidden" }}>
                <LinearGradient colors={["#ff8355", "#ff5c2a"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 8 }}>
                    <Text style={{ color: "#0b0c10", fontWeight: "900" }}>Kill</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ) : null}
          </View>
        ))}
      </View>

      {isAdmin ? (
        <View style={{ marginTop: 12, gap: 10 }}>
          <TouchableOpacity
            activeOpacity={0.9}
            disabled={alivePlayers.length < 2}
            onPress={onNextRound}
            style={{ borderRadius: 14, overflow: "hidden", opacity: alivePlayers.length < 2 ? 0.5 : 1 }}
          >
            <LinearGradient colors={[theme.accent, theme.accent2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <View style={[styles.primaryButton, { backgroundColor: "transparent", marginTop: 0 }]}>
                <Text style={[styles.primaryText, { color: "#0b0c10" }]}>Next Round ⮕</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={onReset} style={styles.secondaryButton}>
            <Text style={styles.secondaryText}>Reset Game</Text>
          </TouchableOpacity>

          <Text style={{ color: theme.muted, fontSize: 12, textAlign: "center" }}>
            Admin controls: kill a player, then start the next round to deal new words.
            {showHints ? "" : " (Hints disabled)"}
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

