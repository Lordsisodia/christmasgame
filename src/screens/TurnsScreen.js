import React from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { styles } from "../styles";
import { theme } from "../theme";

export function TurnsScreen({ round, maxRounds, speaker, clueInput, setClueInput, onSubmit, turnIndex, totalTurns }) {
  return (
    <View style={styles.card}>
      <Text style={styles.hero}>CLUE ROUND</Text>
      <Text style={styles.subhero}>Rounds {round}/{maxRounds}</Text>
      <Text style={styles.title}>Speaker: {speaker?.name}</Text>
      <Text style={styles.helper}>Say one related word aloud. Keep the phone face-down.</Text>
      <TextInput
        style={styles.input}
        value={clueInput}
        onChangeText={setClueInput}
        placeholder="Enter clue to log (optional)"
        placeholderTextColor={theme.muted}
      />
      <TouchableOpacity style={styles.primaryButton} onPress={onSubmit}>
        <Text style={styles.primaryText}>Next Speaker →</Text>
      </TouchableOpacity>
      <Text style={styles.helper}>Turn {turnIndex + 1} of {totalTurns}</Text>
    </View>
  );
}
