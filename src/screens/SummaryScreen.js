import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { styles } from "../styles";

export function SummaryScreen({ players, scores, onRestart }) {
  return (
    <View style={styles.card}>
      <Text style={styles.hero}>Final Scores</Text>
      {players.map((p) => (
        <Text key={p.id} style={styles.rowText}>
          {p.name}: {scores[p.id] ?? 0} pts
        </Text>
      ))}
      <TouchableOpacity style={styles.primaryButton} onPress={onRestart}>
        <Text style={styles.primaryText}>Play Again</Text>
      </TouchableOpacity>
    </View>
  );
}
