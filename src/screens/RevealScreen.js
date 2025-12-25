import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { styles } from "../styles";
import { nameOf } from "../utils/game";

export function RevealScreen({ players, impostorId, votes, scores, onNext, onEnd }) {
  const impostorCaught = votes.some((v) => v.targetId === impostorId);

  const summaryLine = impostorCaught
    ? "Crew caught the impostor. +1 to correct voters, +1 to impostor."
    : "Impostor escaped. +3 to impostor.";

  return (
    <ScrollView style={styles.card}>
      <Text style={styles.hero}>ROUND RESULTS</Text>
      <Text style={styles.title}>Impostor: {nameOf(players, impostorId)}</Text>
      <Text style={[styles.subhero, { marginBottom: 10 }]}>
        {impostorCaught ? "They were voted out." : "They were not caught."}
      </Text>

      <Text style={styles.helper}>Votes</Text>
      {votes.map((v, idx) => (
        <Text key={idx} style={styles.rowText}>
          {nameOf(players, v.voterId)} → {nameOf(players, v.targetId)}
        </Text>
      ))}

      <Text style={[styles.helper, { marginTop: 12 }]}>{summaryLine}</Text>

      <Text style={[styles.helper, { marginTop: 12 }]}>Scores</Text>
      {players.map((p) => (
        <Text key={p.id} style={styles.rowText}>
          {p.name}: {scores[p.id] ?? 0} pts
        </Text>
      ))}
      <View style={styles.rowSpread}>
        <TouchableOpacity style={styles.secondaryButton} onPress={onEnd}>
          <Text style={styles.secondaryText}>End Game</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryButton} onPress={onNext}>
          <Text style={styles.primaryText}>Next Round</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
