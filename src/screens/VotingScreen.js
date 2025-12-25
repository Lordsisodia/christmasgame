import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { styles } from "../styles";

export function VotingScreen({ players, selected, onSelect, onConfirm, round, maxRounds }) {
  return (
    <View style={styles.card}>
      <Text style={styles.hero}>WHO IS THE IMPOSTOR?</Text>
      <Text style={styles.subhero}>Round {round}/{maxRounds}</Text>
      <View style={styles.grid}>
        {players.map((p) => (
          <TouchableOpacity
            key={p.id}
            style={[styles.tile, selected === p.id && styles.tileActive]}
            onPress={() => onSelect(p.id)}
          >
            <Text style={styles.tileText}>{p.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity style={styles.primaryButton} onPress={onConfirm}>
        <Text style={styles.primaryText}>Reveal Results ▶</Text>
      </TouchableOpacity>
    </View>
  );
}
