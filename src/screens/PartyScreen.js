import React, { useMemo, useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { styles } from "../styles";
import { theme } from "../theme";

const randomCode = () => Math.random().toString().slice(2, 8);
const randomName = () => `Player ${Math.floor(Math.random() * 900 + 100)}`;

export function PartyScreen({ onCreate, onJoin, initialCode = "", error = "", loading = false }) {
  const [name, setName] = useState(randomName());
  const [code, setCode] = useState(initialCode || "");
  const [creating, setCreating] = useState(false);

  const validCode = useMemo(() => code.trim().length >= 4, [code]);

  return (
    <View style={[styles.card, { gap: 12 }]}>
      <Text style={styles.hero}>JOIN A PARTY</Text>
      <Text style={styles.subhero}>Everyone opens the Vercel link on their own phone.</Text>

      <View style={styles.row}>
        <Text style={styles.inputIcon}>👤</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor={theme.muted}
        />
      </View>

      <View style={styles.row}>
        <Text style={styles.inputIcon}>🔑</Text>
        <TextInput
          style={styles.input}
          value={code}
          onChangeText={(t) => setCode(t.toUpperCase())}
          placeholder="Party code"
          autoCapitalize="characters"
          placeholderTextColor={theme.muted}
        />
      </View>

      <TouchableOpacity
        activeOpacity={0.9}
        disabled={!validCode || loading}
        onPress={() => onJoin?.({ name, code: code.trim() })}
        style={{ borderRadius: 14, overflow: "hidden", opacity: validCode && !loading ? 1 : 0.5 }}
      >
        <LinearGradient colors={[theme.accent, theme.accent2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={[styles.primaryButton, { backgroundColor: "transparent", marginTop: 0 }]}>
            <Text style={[styles.primaryText, { color: "#0b0c10" }]}>{loading ? "Joining…" : "Join Party ⮕"}</Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.9}
        disabled={loading}
        onPress={() => {
          setCreating(true);
          const newCode = randomCode();
          setCode(newCode);
          onCreate?.({ name, code: newCode });
        }}
        style={{ marginTop: 4, borderRadius: 12, borderWidth: 1, borderColor: theme.line, padding: 12, backgroundColor: "#0f1320", opacity: loading ? 0.5 : 1 }}
      >
        <Text style={{ color: theme.accent, fontWeight: "800", textAlign: "center" }}>
          {creating ? "Created!" : "Create New Party"}
        </Text>
        <Text style={{ color: theme.muted, textAlign: "center", marginTop: 2 }}>Share the 6-digit code with friends.</Text>
      </TouchableOpacity>

      {error ? (
        <View style={{ marginTop: 10, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: "#ff5c2a40", backgroundColor: "#1b1210" }}>
          <Text style={{ color: "#ffb59f", fontWeight: "700" }}>⚠️ {error}</Text>
        </View>
      ) : null}
    </View>
  );
}
