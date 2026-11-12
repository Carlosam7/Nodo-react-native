import { Pressable, StyleSheet, Text } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

export function PublishedBanner({ onDismiss }: { onDismiss: () => void }) {
  const x = useSharedValue(0);
  const gesture = Gesture.Pan().activeOffsetX([-15, 15]).failOffsetY([-20, 20])
    .onUpdate((event) => { x.value = event.translationX; })
    .onEnd((event) => { if (Math.abs(event.translationX) > 80) runOnJS(onDismiss)(); else x.value = withSpring(0); });
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }], opacity: Math.max(0.3, 1 - Math.abs(x.value) / 300) }));
  return <GestureDetector gesture={gesture}><Animated.View style={animatedStyle}>
    <Pressable onPress={onDismiss} style={styles.banner} accessibilityRole="button" accessibilityLabel="Iniciativa publicada. Toca o desliza para cerrar">
      <Text style={styles.text}>Iniciativa publicada correctamente · Cerrar</Text>
    </Pressable>
  </Animated.View></GestureDetector>;
}
const styles = StyleSheet.create({
  banner: { backgroundColor: "#DCFCE7", borderRadius: 12, padding: 12, marginHorizontal: 20, marginBottom: 12 },
  text: { color: "#166534", fontWeight: "700", textAlign: "center" },
});
