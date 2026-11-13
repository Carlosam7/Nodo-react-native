import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { NodoColors } from "@/core/theme/colors";

const colors = ["#C41230", "#E76F51", "#F4A261", "#E9C46A", "#2A9D8F", "#16A34A", "#0EA5E9", "#1E3A8A", "#4338CA", "#9333EA", "#DB2777", "#374151"];

export function ProjectColorPicker({ color, onChange, disabled = false }: { color: string; onChange: (value: string) => void; disabled?: boolean }) {
  const valid = /^#[0-9a-f]{6}$/i.test(color);
  return (
    <View>
      <Text style={styles.label}>Color del proyecto</Text>
      <View style={styles.palette}>
        {colors.map((item) => (
          <Pressable key={item} onPress={() => onChange(item)} disabled={disabled} accessibilityRole="radio" accessibilityLabel={`Color ${item}`} accessibilityState={{ checked: item.toUpperCase() === color.toUpperCase(), disabled }} style={[styles.swatch, { backgroundColor: item }, item.toUpperCase() === color.toUpperCase() && styles.selected]} />
        ))}
      </View>
      <View style={styles.row}>
        <View style={[styles.preview, { backgroundColor: valid ? color : NodoColors.border }]} />
        <TextInput value={color} onChangeText={onChange} editable={!disabled} autoCapitalize="characters" autoCorrect={false} maxLength={7} accessibilityLabel="Color hexadecimal" placeholder="#C41230" style={styles.input} />
      </View>
      <Text style={styles.hint}>Elige un color o escribe su código hexadecimal de seis dígitos.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: "700", color: NodoColors.textPrimary, marginBottom: 8 },
  palette: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 12 },
  swatch: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: "transparent" },
  selected: { borderColor: NodoColors.textPrimary },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  preview: { width: 40, height: 40, borderRadius: 10, borderWidth: 1, borderColor: NodoColors.border },
  input: { flex: 1, backgroundColor: NodoColors.background, borderWidth: 1, borderColor: NodoColors.border, borderRadius: 12, padding: 12, color: NodoColors.textPrimary },
  hint: { fontSize: 12, color: NodoColors.textSecondary, marginTop: 8 },
});
