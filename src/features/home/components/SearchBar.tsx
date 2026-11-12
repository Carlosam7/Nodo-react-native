import { LineIcon } from "@/components/ui/line-icon";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

import { NodoColors } from "@/core/theme/colors";

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = "Buscar iniciativas, habilidades...",
}: SearchBarProps) {
  return (
    <View style={styles.container}>
      <View style={{ marginRight: 8 }}><LineIcon name="search-1" size={19} color={NodoColors.textMuted} /></View>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={NodoColors.textMuted}
        returnKeyType="search"
        clearButtonMode="while-editing"
      />
      {value.length > 0 ? (
        <Pressable
          onPress={() => onChangeText("")}
          style={styles.clearButton}
          accessibilityRole="button"
          accessibilityLabel="Limpiar búsqueda"
        >
          <LineIcon name="xmark" size={16} color={NodoColors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: NodoColors.surface,
    borderWidth: 1,
    borderColor: NodoColors.border,
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 48,
    marginHorizontal: 20,
    marginBottom: 12,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
    opacity: 0.6,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: NodoColors.textPrimary,
    height: "100%",
  },
  clearButton: {
    padding: 6,
  },
  clearText: {
    fontSize: 12,
    color: NodoColors.textMuted,
    fontWeight: "700",
  },
});
