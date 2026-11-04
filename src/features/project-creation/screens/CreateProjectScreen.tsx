import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { friendlyErrorMessage } from "@/core/errors/failures";
import { NodoColors } from "@/core/theme/colors";
import { useAuth } from "@/features/auth/context/auth-context";
import { projectService } from "@/features/projects/services/project-service";

export function CreateProjectScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signedInUser, isPublicSession } = useAuth();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [totalSpots, setTotalSpots] = useState(3);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [availableSkills, setAvailableSkills] = useState<string[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [newSkillInput, setNewSkillInput] = useState("");
  const [selectedGradient, setSelectedGradient] = useState<string[]>([
    ...NodoColors.projectGradients[0],
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    projectService.fetchCategories().then((cats) => {
      setAvailableCategories(cats.filter((c) => c !== "TODAS"));
    });
  }, []);

  // Si está en sesión pública, mostrar pantalla de bienvenida / login prompt
  if (isPublicSession || !signedInUser) {
    return (
      <View style={[styles.guestContainer, { paddingTop: insets.top + 40 }]}>
        <View style={styles.guestCard}>
          <Text style={styles.guestIcon}>✨</Text>
          <Text style={styles.guestTitle}>Publica tu iniciativa</Text>
          <Text style={styles.guestSubtitle}>
            Para crear proyectos, reclutar colaboradores y formar equipos
            necesitas iniciar sesión con tu cuenta institucional.
          </Text>
          <Pressable
            onPress={() => router.push("/auth/login")}
            style={({ pressed }) => [
              styles.guestLoginBtn,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.guestLoginText}>Iniciar sesión</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const handleToggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  };

  const handleAddNewCategory = () => {
    const trimmed = newCategoryInput.trim().toUpperCase();
    if (trimmed && !selectedCategories.includes(trimmed)) {
      setSelectedCategories((prev) => [...prev, trimmed]);
      if (!availableCategories.includes(trimmed)) {
        setAvailableCategories((prev) => [...prev, trimmed]);
      }
      setNewCategoryInput("");
    }
  };

  const handleToggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill],
    );
  };

  const handleAddNewSkill = () => {
    const trimmed = newSkillInput.trim().toUpperCase();
    if (trimmed && !selectedSkills.includes(trimmed)) {
      setSelectedSkills((prev) => [...prev, trimmed]);
      if (!availableSkills.includes(trimmed)) {
        setAvailableSkills((prev) => [...prev, trimmed]);
      }
      setNewSkillInput("");
    }
  };

  const handleSubmit = async () => {
    setError(null);

    if (title.trim().length < 3) {
      setError("El título debe tener al menos 3 caracteres.");
      return;
    }
    if (description.trim().length < 10) {
      setError("La descripción debe tener al menos 10 caracteres.");
      return;
    }
    if (selectedCategories.length === 0) {
      setError(
        "Selecciona al menos una categoría para clasificar tu iniciativa.",
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await projectService.createProject(
        {
          title,
          description,
          totalSpots,
          categories: selectedCategories,
          skills: selectedSkills,
          gradientColors: selectedGradient,
        },
        signedInUser,
      );

      Alert.alert(
        "¡Iniciativa publicada!",
        "Tu proyecto ya está disponible en el catálogo de exploración.",
        [
          {
            text: "Ver proyecto",
            onPress: () => {
              // Limpiar formulario y navegar al proyecto
              setTitle("");
              setDescription("");
              setSelectedCategories([]);
              setSelectedSkills([]);
              router.push({
                pathname: "/project/[id]",
                params: { id: created.id },
              });
            },
          },
        ],
      );
    } catch (err) {
      setError(friendlyErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Cabecera */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Crear nueva iniciativa</Text>
          <Text style={styles.headerSubtitle}>
            Define los cupos y competencias que necesitas para consolidar tu
            equipo
          </Text>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.formCard}>
          {/* Título */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Nombre de la iniciativa *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Ej. Plataforma de carpooling universitario"
              placeholderTextColor={NodoColors.textMuted}
            />
          </View>

          {/* Descripción */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Descripción y objetivos *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe el problema que resuelve, los avances esperados y el valor para la comunidad..."
              placeholderTextColor={NodoColors.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Número de cupos */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              Cupos requeridos: {totalSpots} colaboradores
            </Text>
            <View style={styles.counterRow}>
              <Pressable
                onPress={() => setTotalSpots((prev) => Math.max(1, prev - 1))}
                style={({ pressed }) => [
                  styles.counterBtn,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.counterBtnText}>-</Text>
              </Pressable>
              <Text style={styles.counterValue}>{totalSpots}</Text>
              <Pressable
                onPress={() => setTotalSpots((prev) => Math.min(20, prev + 1))}
                style={({ pressed }) => [
                  styles.counterBtn,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.counterBtnText}>+</Text>
              </Pressable>
              <Text style={styles.counterHint}>
                (El líder administra las admisiones)
              </Text>
            </View>
          </View>

          {/* Categorías */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Categorías *</Text>
            <View style={styles.chipsWrap}>
              {availableCategories.map((cat) => {
                const isSelected = selectedCategories.includes(cat);
                return (
                  <Pressable
                    key={cat}
                    onPress={() => handleToggleCategory(cat)}
                    style={[
                      styles.selectableChip,
                      isSelected && styles.chipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipLabel,
                        isSelected && styles.chipLabelActive,
                      ]}
                    >
                      {cat}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.inlineAddRow}>
              <TextInput
                style={[styles.input, styles.inlineAddInput]}
                value={newCategoryInput}
                onChangeText={setNewCategoryInput}
                placeholder="Otra categoría..."
                placeholderTextColor={NodoColors.textMuted}
                autoCapitalize="characters"
                onSubmitEditing={handleAddNewCategory}
              />
              <Pressable
                onPress={handleAddNewCategory}
                style={({ pressed }) => [
                  styles.inlineAddBtn,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.inlineAddBtnText}>+ Agregar</Text>
              </Pressable>
            </View>
          </View>

          {/* Habilidades requeridas */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Competencias buscadas</Text>
            <View style={styles.chipsWrap}>
              {selectedSkills.map((skill) => (
                <View key={skill} style={styles.skillSelectedChip}>
                  <Text style={styles.skillSelectedText}>#{skill}</Text>
                  <Pressable
                    onPress={() => handleToggleSkill(skill)}
                    hitSlop={8}
                  >
                    <Text style={styles.skillRemove}>✕</Text>
                  </Pressable>
                </View>
              ))}
            </View>
            <View style={styles.inlineAddRow}>
              <TextInput
                style={[styles.input, styles.inlineAddInput]}
                value={newSkillInput}
                onChangeText={setNewSkillInput}
                placeholder="Ej. FIGMA, PYTHON, DERECHO..."
                placeholderTextColor={NodoColors.textMuted}
                autoCapitalize="characters"
                onSubmitEditing={handleAddNewSkill}
              />
              <Pressable
                onPress={handleAddNewSkill}
                style={({ pressed }) => [
                  styles.inlineAddBtn,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.inlineAddBtnText}>+ Añadir</Text>
              </Pressable>
            </View>
          </View>

          {/* Selector de Acento / Gradiente */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              Identidad visual de la tarjeta
            </Text>
            <View style={styles.gradientsRow}>
              {NodoColors.projectGradients.map((grad, idx) => {
                const isSelected = selectedGradient[0] === grad[0];
                return (
                  <Pressable
                    key={idx}
                    onPress={() => setSelectedGradient([...grad])}
                    style={[
                      styles.gradientCircle,
                      { backgroundColor: grad[0] },
                      isSelected && styles.gradientCircleSelected,
                    ]}
                  >
                    {isSelected ? (
                      <Text style={styles.checkmark}>✓</Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Botón de Publicación */}
          <Pressable
            onPress={handleSubmit}
            disabled={isSubmitting}
            style={({ pressed }) => [
              styles.submitBtn,
              pressed && styles.pressed,
              isSubmitting && styles.disabledBtn,
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.submitBtnText}>Publicar iniciativa 🚀</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NodoColors.background,
  },
  guestContainer: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
    backgroundColor: NodoColors.background,
  },
  guestCard: {
    backgroundColor: NodoColors.surface,
    padding: 32,
    borderRadius: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: NodoColors.border,
  },
  guestIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  guestTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: NodoColors.textPrimary,
    marginBottom: 8,
  },
  guestSubtitle: {
    fontSize: 14,
    color: NodoColors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  guestLoginBtn: {
    backgroundColor: NodoColors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    width: "100%",
    alignItems: "center",
  },
  guestLoginText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  header: {
    marginBottom: 18,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: NodoColors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 13,
    color: NodoColors.textSecondary,
    marginTop: 4,
  },
  errorBanner: {
    backgroundColor: "#FEE2E2",
    borderColor: "#FECACA",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: "#B91C1C",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  formCard: {
    backgroundColor: NodoColors.surface,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: NodoColors.border,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: NodoColors.textPrimary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: NodoColors.background,
    borderWidth: 1,
    borderColor: NodoColors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: NodoColors.textPrimary,
  },
  textArea: {
    minHeight: 90,
  },
  counterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  counterBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: NodoColors.chipInactive,
    alignItems: "center",
    justifyContent: "center",
  },
  counterBtnText: {
    fontSize: 20,
    fontWeight: "700",
    color: NodoColors.textPrimary,
  },
  counterValue: {
    fontSize: 18,
    fontWeight: "900",
    color: NodoColors.primary,
    minWidth: 24,
    textAlign: "center",
  },
  counterHint: {
    fontSize: 12,
    color: NodoColors.textMuted,
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  selectableChip: {
    backgroundColor: NodoColors.background,
    borderWidth: 1,
    borderColor: NodoColors.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  chipActive: {
    backgroundColor: NodoColors.primaryMuted,
    borderColor: NodoColors.primary,
  },
  chipLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: NodoColors.textSecondary,
  },
  chipLabelActive: {
    color: NodoColors.primaryDark,
    fontWeight: "800",
  },
  inlineAddRow: {
    flexDirection: "row",
    gap: 8,
  },
  inlineAddInput: {
    flex: 1,
  },
  inlineAddBtn: {
    backgroundColor: NodoColors.chipInactive,
    paddingHorizontal: 14,
    justifyContent: "center",
    borderRadius: 14,
  },
  inlineAddBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: NodoColors.textPrimary,
  },
  skillSelectedChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: NodoColors.chipInactive,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  skillSelectedText: {
    fontSize: 12,
    fontWeight: "700",
    color: NodoColors.textPrimary,
  },
  skillRemove: {
    fontSize: 11,
    color: NodoColors.textMuted,
  },
  gradientsRow: {
    flexDirection: "row",
    gap: 12,
  },
  gradientCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  gradientCircleSelected: {
    borderWidth: 3,
    borderColor: "#000000",
  },
  checkmark: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 14,
  },
  submitBtn: {
    backgroundColor: NodoColors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    shadowColor: NodoColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
});
