import { useEffect, useState } from "react";
import { Animated, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { SuccessMark } from "./SuccessMark";
import * as Haptics from "expo-haptics";

import { NodoColors } from "@/core/theme/colors";

const particles = [
  { x: -66, y: -48, color: "#C41230", size: 9 },
  { x: -84, y: 4, color: "#F59E0B", size: 7 },
  { x: -55, y: 55, color: "#10B981", size: 8 },
  { x: 64, y: -51, color: "#F59E0B", size: 8 },
  { x: 85, y: 2, color: "#10B981", size: 9 },
  { x: 57, y: 57, color: "#C41230", size: 7 },
  { x: 0, y: -77, color: "#6366F1", size: 7 },
  { x: 3, y: 77, color: "#F59E0B", size: 6 },
];

export function ApplicationSuccess({ projectTitle, onContinue }: { projectTitle: string; onContinue: () => void }) {
  const insets = useSafeAreaInsets();
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 700,
      useNativeDriver: Platform.OS !== "web",
    });
    animation.start();
    if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    return () => animation.stop();
  }, [progress]);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]} accessibilityLiveRegion="polite">
      <View style={styles.illustration} accessible accessibilityLabel="Postulación enviada correctamente">
        {particles.map((particle, index) => (
          <Animated.View
            key={index}
            style={[
              styles.particle,
              {
                width: particle.size, height: particle.size, borderRadius: particle.size / 2,
                backgroundColor: particle.color,
                opacity: progress.interpolate({ inputRange: [0, 0.18, 0.8, 1], outputRange: [0, 1, 1, 0] }),
                transform: [
                  { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [0, particle.x] }) },
                  { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [0, particle.y] }) },
                ],
              },
            ]}
          />
        ))}
        <Animated.View style={{ transform: [{ scale: progress.interpolate({ inputRange: [0, 0.55, 1], outputRange: [0.4, 1.12, 1] }) }] }}>
          <SuccessMark />
        </Animated.View>
      </View>
      <Text style={styles.title}>¡Postulación enviada!</Text>
      <Text style={styles.message}>El líder de {projectTitle} revisará tu solicitud. Podrás consultar su estado en tu perfil.</Text>
      <Pressable onPress={onContinue} accessibilityRole="button" style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
        <Text style={styles.buttonText}>Ver proyecto</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28, backgroundColor: NodoColors.background },
  illustration: { width: 200, height: 200, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  particle: { position: "absolute" },
  checkCircle: { width: 96, height: 96, borderRadius: 48, alignItems: "center", justifyContent: "center", backgroundColor: "#10B981" },
  check: { color: "#FFFFFF", fontSize: 52, fontWeight: "800" },
  title: { color: NodoColors.textPrimary, fontSize: 24, fontWeight: "900", textAlign: "center", marginBottom: 12 },
  message: { color: NodoColors.textSecondary, fontSize: 15, lineHeight: 22, textAlign: "center", maxWidth: 360 },
  button: { backgroundColor: NodoColors.primary, borderRadius: 16, paddingVertical: 15, paddingHorizontal: 32, marginTop: 28 },
  buttonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  pressed: { opacity: 0.8, transform: [{ scale: 0.97 }] },
});
