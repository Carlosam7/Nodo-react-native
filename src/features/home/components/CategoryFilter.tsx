import { useState } from "react";
import { LayoutAnimation, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import * as Haptics from "expo-haptics";

import { LineIcon } from "@/components/ui/line-icon";
import { NodoColors } from "@/core/theme/colors";

interface CategoryFilterProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

export function CategoryFilter({ categories, selectedCategory, onSelectCategory }: CategoryFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => setIsOpen((open) => !open)}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={`Filtrar por categoría. Seleccionada: ${selectedCategory}`}
        accessibilityState={{ expanded: isOpen }}
      >
        <View style={styles.buttonTextContainer}>
          <Text style={styles.label}>Categoría</Text>
          <Text style={styles.selection} numberOfLines={1}>{selectedCategory === "TODAS" ? "Todas las categorías" : selectedCategory}</Text>
        </View>
        <Text style={styles.arrow} aria-hidden>{isOpen ? "▴" : "▾"}</Text>
      </Pressable>
      {isOpen ? (
        <ScrollView style={styles.options} nestedScrollEnabled keyboardShouldPersistTaps="handled">
          {categories.map((category) => {
            const selected = selectedCategory === category;
            return (
              <Pressable
                key={category}
                onPress={() => {
                  if (!selected) {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    if (Platform.OS !== "web") void Haptics.selectionAsync().catch(() => {});
                    onSelectCategory(category);
                  }
                  setIsOpen(false);
                }}
                style={({ pressed }) => [styles.option, selected && styles.selectedOption, pressed && styles.pressed]}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
              >
                <Text style={[styles.optionText, selected && styles.selectedText]}>{category === "TODAS" ? "Todas las categorías" : category}</Text>
                {selected ? <LineIcon name="check" size={20} color={NodoColors.primary} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginHorizontal: 20, marginBottom: 16 },
  button: { minHeight: 56, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 8, backgroundColor: NodoColors.surface, borderColor: NodoColors.border, borderWidth: 1, borderRadius: 14 },
  buttonTextContainer: { flex: 1 },
  label: { color: NodoColors.textSecondary, fontSize: 11, fontWeight: "700" },
  selection: { color: NodoColors.textPrimary, fontSize: 14, fontWeight: "700", marginTop: 2 },
  arrow: { color: NodoColors.primary, fontSize: 20, marginLeft: 12 },
  options: { maxHeight: 220, marginTop: 6, backgroundColor: NodoColors.surface, borderColor: NodoColors.border, borderWidth: 1, borderRadius: 14 },
  option: { minHeight: 48, paddingHorizontal: 16, paddingVertical: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  selectedOption: { backgroundColor: NodoColors.primaryLight },
  optionText: { flex: 1, color: NodoColors.textPrimary, fontSize: 14 },
  selectedText: { color: NodoColors.primary, fontWeight: "700" },
  pressed: { opacity: 0.7 },
});
