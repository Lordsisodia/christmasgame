import React, { useState } from "react";
import { ScrollView, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { styles } from "../styles";
import { theme } from "../theme";

export function LobbyScreen({ players, setPlayers, rounds, setRounds, showHints, setShowHints, onStart }) {
  const [focusedId, setFocusedId] = useState(null);
  const { width } = useWindowDimensions();
  const isCompact = width < 380;

  const editName = (id, name) => {
    setPlayers(players.map((p) => (p.id === id ? { ...p, name } : p)));
  };
  const addPlayer = () => {
    const idx = players.length + 1;
    setPlayers([...players, { id: `p${idx}`, name: `Player ${idx}` }]);
  };
  const removePlayer = (id) => {
    if (players.length <= 3) return;
    setPlayers(players.filter((p) => p.id !== id));
  };

  return (
    <ScrollView
      style={[styles.card, { flexGrow: 0, flexShrink: 1, flexBasis: "auto", width: "100%", maxWidth: isCompact ? 400 : 420 }]}
      contentContainerStyle={{ paddingBottom: 10, paddingTop: 6, flexGrow: 0, paddingHorizontal: isCompact ? 6 : 2 }}
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.hero, { fontSize: isCompact ? 24 : 26, lineHeight: isCompact ? 28 : 30 }]} maxFontSizeMultiplier={1.1}>
            PLAY WITH FRIENDS
          </Text>
          <Text style={styles.subhero}>Tap pencil to rename · 3–10 players</Text>
        </View>
        <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: "#1a1e2a", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.line }}>
          <Text style={{ fontSize: 18 }}>🕵️‍♂️</Text>
        </View>
      </View>

      <View style={{ alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, backgroundColor: "#161925", borderRadius: 999, borderWidth: 1, borderColor: theme.line, marginBottom: 10 }}>
        <Text style={{ color: theme.muted, fontWeight: "700", fontSize: 11 }}>Step 1 of 5 · Lobby</Text>
      </View>

      {players.map((p) => (
        <View key={p.id} style={styles.row}>
          <Text style={styles.inputIcon}>👤</Text>
          <TextInput
            style={[
              styles.input,
              focusedId === p.id && { borderColor: theme.accent, shadowColor: theme.accent, shadowOpacity: 0.4, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } },
            ]}
            value={p.name}
            onChangeText={(t) => editName(p.id, t)}
            placeholder="Name"
            placeholderTextColor={theme.muted}
            onFocus={() => setFocusedId(p.id)}
            onBlur={() => setFocusedId(null)}
          />
          <TouchableOpacity onPress={() => removePlayer(p.id)}>
            <Text style={{ color: theme.accent, fontSize: 18, paddingHorizontal: 8 }}>−</Text>
          </TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity onPress={addPlayer} activeOpacity={0.9} style={{ marginTop: 2, borderRadius: 10, overflow: "hidden" }}>
        <LinearGradient colors={[theme.accent, theme.accent2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
          <View style={{ paddingVertical: 10, alignItems: "center" }}>
            <Text style={{ color: "#0b0c10", fontWeight: "800" }}>＋ Add player</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>

      <View style={[styles.rowSpread, { marginVertical: 10, flexDirection: isCompact ? "column" : "row", alignItems: isCompact ? "flex-start" : "center", gap: isCompact ? 10 : 0 }]}>        
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={styles.label}>Rounds</Text>
          {[3, 5].map((n) => (
            <TouchableOpacity
              key={n}
              style={[styles.pill, rounds === n && styles.pillActive]}
              onPress={() => setRounds(n)}
            >
              <Text style={rounds === n ? styles.pillTextActive : styles.pillText}>{n}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text style={styles.label}>Hint</Text>
          <TouchableOpacity style={styles.toggle} onPress={() => setShowHints(!showHints)}>
            <View style={[styles.knob, showHints && styles.knobOn]} />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        activeOpacity={0.9}
        disabled={!onStart}
        onPress={onStart}
        style={{ marginTop: 12, borderRadius: 14, overflow: "hidden", opacity: onStart ? 1 : 0.5 }}
      >
        <LinearGradient colors={[theme.accent, theme.accent2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={[styles.primaryButton, { backgroundColor: "transparent", marginTop: 0 }]}>
            <Text style={[styles.primaryText, { color: "#0b0c10" }]}>Start Game ⮕</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>
      <Text style={[styles.helper, { marginTop: 4, marginBottom: 2 }]}>Players can join from their own phones with the party code.</Text>
    </ScrollView>
  );
}
