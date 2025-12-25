import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { styles } from "../styles";
import { theme } from "../theme";

export function MultiplayerLobbyScreen({ sessionId, shareUrl, me, players, adminPlayerId, isAdmin, onStart, onLeave, error }) {
  return (
    <ScrollView style={[styles.card, { flexGrow: 0 }]} contentContainerStyle={{ paddingBottom: 12 }} showsVerticalScrollIndicator={false}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={styles.hero}>LOBBY</Text>
          <Text style={styles.subhero}>First player is admin · Admin starts rounds</Text>
        </View>
        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: "#1a1e2a", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.line }}>
          <Text style={{ fontSize: 20 }}>{isAdmin ? "👑" : "👤"}</Text>
        </View>
      </View>

      <View style={{ marginTop: 10, gap: 6 }}>
        <View style={{ paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: theme.line, backgroundColor: "#111624" }}>
          <Text style={{ color: theme.muted, fontWeight: "800" }}>Session Code</Text>
          <Text style={{ color: theme.text, fontSize: 22, fontWeight: "900", marginTop: 2 }}>{sessionId}</Text>
          <Text style={{ color: theme.muted, marginTop: 4, fontSize: 12 }}>Share link:</Text>
          <Text style={{ color: theme.accent, fontSize: 12 }} selectable>
            {shareUrl || "—"}
          </Text>
        </View>

        {error ? (
          <View style={{ padding: 10, borderRadius: 12, borderWidth: 1, borderColor: "#ff5c2a40", backgroundColor: "#1b1210" }}>
            <Text style={{ color: "#ffb59f", fontWeight: "700" }}>⚠️ {error}</Text>
            <Text style={{ color: "#ffb59f", marginTop: 2, fontSize: 12 }}>
              If the server restarted, the session may have reset. Re-join with the same code.
            </Text>
          </View>
        ) : null}
      </View>

      <View style={{ marginTop: 12 }}>
        <Text style={[styles.label, { marginBottom: 6 }]}>Players</Text>
        {players.map((p) => (
          <View key={p.id} style={[styles.row, { opacity: p.alive ? 1 : 0.5 }]}>
            <Text style={styles.inputIcon}>{p.id === me?.id ? "⭐️" : "👤"}</Text>
            <Text style={[styles.title, { flex: 1, fontSize: 16 }]}>{p.name}</Text>
            {p.id === me?.id ? (
              <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: "#161925" }}>
                <Text style={{ color: theme.muted, fontWeight: "800", fontSize: 11 }}>You</Text>
              </View>
            ) : null}
            {p.id === adminPlayerId && (
              <View style={{ marginLeft: 8, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: "#161925" }}>
                <Text style={{ color: theme.muted, fontWeight: "800", fontSize: 11 }}>Admin</Text>
              </View>
            )}
          </View>
        ))}
      </View>

      <View style={{ marginTop: 12, gap: 10 }}>
        <TouchableOpacity
          activeOpacity={0.9}
          disabled={!isAdmin}
          onPress={onStart}
          style={{ borderRadius: 14, overflow: "hidden", opacity: isAdmin ? 1 : 0.5 }}
        >
          <LinearGradient colors={[theme.accent, theme.accent2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={[styles.primaryButton, { backgroundColor: "transparent", marginTop: 0 }]}>
              <Text style={[styles.primaryText, { color: "#0b0c10" }]}>
                {isAdmin ? "Start Game ⮕" : "Waiting for Admin…"}
              </Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity onPress={onLeave} style={[styles.secondaryButton, { marginTop: 2 }]}>
          <Text style={styles.secondaryText}>Leave Session</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
