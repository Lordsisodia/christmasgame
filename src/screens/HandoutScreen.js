import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { styles } from "../styles";
import { theme } from "../theme";

export function HandoutScreen({ player, isImpostor, word, hint, index, total, onNext, showNavigation = true }) {
  const [revealed, setRevealed] = useState(false);
  const [hidden, setHidden] = useState(false);
  const swipeStart = useRef(null);
  const revealAnim = useRef(new Animated.Value(0)).current;
  const badgeAnim = useRef(new Animated.Value(0)).current;
  const { width } = useWindowDimensions();
  const isCompact = width < 380;

  const handleReveal = () => {
    setHidden(false);
    setRevealed(true);
    Animated.parallel([
      Animated.spring(revealAnim, { toValue: 1, useNativeDriver: true, speed: 8, bounciness: 8 }),
      Animated.timing(badgeAnim, { toValue: 1, duration: 320, easing: Easing.out(Easing.ease), useNativeDriver: true }),
    ]).start();
  };

  const handleHide = () => {
    setRevealed(false);
    setHidden(true);
  };

  const handleSwipeGrant = (e) => {
    swipeStart.current = e.nativeEvent.pageY;
  };

  const handleSwipeRelease = (e) => {
    if (swipeStart.current === null) return;
    const dy = e.nativeEvent.pageY - swipeStart.current;
    if (dy < -25) {
      handleReveal();
    }
    swipeStart.current = null;
  };

  useEffect(() => {
    revealAnim.setValue(0);
    badgeAnim.setValue(0);
  }, [player.id]);

  return (
    <View style={[styles.handoutShell, { alignItems: "center", paddingHorizontal: 16, width: "100%" }]}>
      <LinearGradient
        colors={["rgba(255,122,26,0.18)", "rgba(255,155,75,0.05)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ borderRadius: 22, padding: 1.5, width: "100%", maxWidth: isCompact ? 400 : 420 }}
      >
        <View style={[styles.handoutCard, { borderRadius: 20, minHeight: 360, padding: isCompact ? 16 : 20 }]}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
            <View>
              <Text style={[styles.hero, { fontSize: isCompact ? 24 : 26, lineHeight: isCompact ? 28 : 30 }]} maxFontSizeMultiplier={1.1}>
                WHO IS THE IMPOSTOR
              </Text>
              <Text style={[styles.subhero, { marginBottom: 6 }]}>Player {index + 1} of {total}</Text>
              <Text style={[styles.title, { fontSize: isCompact ? 22 : 24, marginBottom: 6 }]}>{player.name}</Text>
            </View>
            <Animated.Text
              style={{
                fontSize: 26,
                transform: [{ translateY: badgeAnim.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }],
                opacity: badgeAnim,
              }}
            >
              🕵️‍♂️
            </Animated.Text>
          </View>
          <View style={{ flexDirection: "column", gap: 8, marginTop: 10, width: "100%" }}>
            <View style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: "#161925", width: "100%", alignItems: "center" }}>
              <Text style={{ color: theme.muted, fontWeight: "700", fontSize: 12 }}>Keep phone face-down</Text>
            </View>
            <View style={{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: "#161925", width: "100%", alignItems: "center" }}>
              <Text style={{ color: theme.muted, fontWeight: "700", fontSize: 12 }}>Swipe up to reveal</Text>
            </View>
          </View>

          {!revealed ? (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={handleReveal}
              onStartShouldSetResponder={() => true}
              onResponderGrant={handleSwipeGrant}
              onResponderRelease={handleSwipeRelease}
              style={{ borderRadius: 12, overflow: "hidden", marginTop: 12, width: "100%" }}
            >
              <LinearGradient colors={[theme.accent, theme.accent2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <View style={{ paddingVertical: 14, alignItems: "center" }}>
                  <Text style={{ color: "#0b0c10", fontWeight: "800" }}>Swipe Up / Tap to Reveal</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <Animated.View
              style={[
                styles.poster,
                {
                  marginTop: 12,
                  transform: [
                    { translateY: revealAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
                    { scale: revealAnim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
                  ],
                  opacity: revealAnim,
                },
              ]}
            >
              <LinearGradient
                colors={
                  isImpostor
                    ? ["#ff8355", "#ff5c2a"]
                    : ["#0f3a2a", "#0c2d21"]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.posterInner}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text style={styles.posterEmoji}>{isImpostor ? "😈" : "🛡️"}</Text>
                    <View>
                      <Text style={[styles.posterTitle, { letterSpacing: 0.5 }]}>
                        {isImpostor ? "YOU ARE THE IMPOSTOR!" : "YOU ARE SAFE"}
                      </Text>
                      <Text style={[styles.posterSubtitle, { color: isImpostor ? "#ffe9df" : "#cfeee0" }]}>
                        {isImpostor ? "Blend in. Find the word." : "Secret word below—keep quiet."}
                      </Text>
                    </View>
                  </View>
                  <View style={{ marginTop: 12 }}>
                    {isImpostor ? (
                      hint && <Text style={[styles.posterSubtitle, { color: "#ffe9df" }]}>Hint: {hint}</Text>
                    ) : (
                      <Text style={[styles.posterSubtitle, { color: "#cfeee0", fontSize: 16 }]}>Word: {word}</Text>
                    )}
                  </View>
                </View>
              </LinearGradient>
            </Animated.View>
          )}

          {showNavigation && (
            <View style={{ flexDirection: isCompact ? "column" : "row", gap: 10, marginTop: 12, width: "100%" }}>
              <TouchableOpacity
                style={[styles.secondaryButton, { flex: 1, opacity: revealed ? 1 : 0.7 }]}
                disabled={!revealed}
                onPress={handleHide}
              >
                <Text style={styles.secondaryText}>Hide</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  { flex: 1, backgroundColor: hidden ? theme.accent : "#3a3a3a" },
                ]}
                disabled={!hidden}
                onPress={() => {
                  setRevealed(false);
                  setHidden(false);
                  onNext?.();
                }}
              >
                <Text style={[styles.primaryText, { color: hidden ? "#0b0c10" : "#888" }]}>Next Player</Text>
              </TouchableOpacity>
            </View>
          )}
          <Text style={{ color: theme.muted, fontSize: 12, marginTop: 10, textAlign: "center" }}>
            Favorite video game? Keep a poker face.
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
}
