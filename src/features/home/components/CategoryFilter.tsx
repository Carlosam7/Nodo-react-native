import { LayoutAnimation, Platform, Pressable, ScrollView, StyleSheet, Text } from "react-native";

import * as Haptics from "expo-haptics";

import { NodoColors } from "@/core/theme/colors";

interface CategoryFilterProps {
  categories: string[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
}

export function CategoryFilter({
  categories,
  selectedCategory,
  onSelectCategory,
}: CategoryFilterProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      style={styles.container}
    >
      {categories.map((cat) => {
        const isSelected = selectedCategory === cat;
        return (
          <Pressable
            key={cat}
            onPress={() => {
              if (cat === selectedCategory) return;
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              if (Platform.OS !== "web") void Haptics.selectionAsync().catch(() => {});
              onSelectCategory(cat);
            }}
            style={({ pressed }) => [
              styles.chip,
              isSelected ? styles.chipSelected : styles.chipUnselected,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
          >
            <Text
              style={[
                styles.chipText,
                isSelected
                  ? styles.chipTextSelected
                  : styles.chipTextUnselected,
              ]}
            >
              {cat}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 0,
    flexShrink: 0,
    minHeight: 52,
    marginBottom: 16,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 4,
    gap: 8,
    alignItems: "center",
  },
  chip: {
    flexShrink: 0,
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipSelected: {
    backgroundColor: NodoColors.primary,
    borderColor: NodoColors.primary,
  },
  chipUnselected: {
    backgroundColor: NodoColors.surface,
    borderColor: NodoColors.chipBorder,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  chipTextSelected: {
    color: "#FFFFFF",
  },
  chipTextUnselected: {
    color: NodoColors.textSecondary,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
});
