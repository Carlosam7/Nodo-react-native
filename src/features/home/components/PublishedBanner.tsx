import { Pressable, StyleSheet, Text } from "react-native";

export function PublishedBanner({ onDismiss }: { onDismiss: () => void }) {
  return <Pressable onPress={onDismiss} style={styles.banner} accessibilityRole="button" accessibilityLabel="Iniciativa publicada. Cerrar mensaje"><Text style={styles.text}>Iniciativa publicada correctamente · Cerrar</Text></Pressable>;
}
const styles = StyleSheet.create({
  banner: { backgroundColor: "#DCFCE7", borderRadius: 12, padding: 12, marginHorizontal: 20, marginBottom: 12 },
  text: { color: "#166534", fontWeight: "700", textAlign: "center" },
});
