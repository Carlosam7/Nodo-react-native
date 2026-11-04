import { useLocalSearchParams, useRouter } from "expo-router";
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
import { applicantService } from "@/features/applicants/services/applicant-service";
import { useAuth } from "@/features/auth/context/auth-context";
import { projectService } from "@/features/projects/services/project-service";
import { Project } from "@/features/projects/types/project";

export default function ApplyScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { signedInUser, isPublicSession } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [motivation, setMotivation] = useState("");
  const [experience, setExperience] = useState("");
  const [skillsInput, setSkillsInput] = useState("");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [isLoadingProject, setIsLoadingProject] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isPublicSession) {
      router.replace("/auth/login");
      return;
    }

    if (!id) return;
    projectService
      .fetchProjectById(id)
      .then((p) => {
        setProject(p);
        if (p?.skills) {
          // Pre-sugerir habilidades del proyecto
          setSelectedSkills(p.skills.slice(0, 3));
        }
      })
      .finally(() => setIsLoadingProject(false));
  }, [id, isPublicSession, router]);

  const handleAddSkill = () => {
    const trimmed = skillsInput.trim().toUpperCase();
    if (trimmed && !selectedSkills.includes(trimmed)) {
      setSelectedSkills((prev) => [...prev, trimmed]);
      setSkillsInput("");
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setSelectedSkills((prev) => prev.filter((s) => s !== skill));
  };

  const handleSubmit = async () => {
    setError(null);

    if (!motivation.trim()) {
      setError("Por favor indica tu motivación para sumarte al proyecto.");
      return;
    }
    if (!experience.trim()) {
      setError("Cuéntanos sobre tu experiencia o rol previsto.");
      return;
    }
    if (!project || !signedInUser) return;

    setIsSubmitting(true);
    try {
      await applicantService.submitApplication(
        {
          projectId: project.id,
          motivation,
          experience,
          skills: selectedSkills,
        },
        signedInUser,
        project,
      );

      Alert.alert(
        "¡Postulación enviada!",
        "El líder de la iniciativa revisará tu perfil y competencias para gestionar el cupo.",
        [
          {
            text: "Entendido",
            onPress: () => router.back(),
          },
        ],
      );
    } catch (err) {
      setError(friendlyErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingProject || !project) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={NodoColors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Cabecera */}
        <View style={styles.navRow}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
          >
            <Text style={styles.backBtnText}>←</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Postulación al equipo</Text>
          <View style={{ width: 42 }} />
        </View>

        {/* Resumen del Proyecto */}
        <View style={styles.projectSummaryCard}>
          <Text style={styles.summaryLabel}>Postulándote a:</Text>
          <Text style={styles.summaryTitle}>{project.title}</Text>
          <Text style={styles.summarySpots}>
            {Math.max(0, project.totalSpots - project.filledSpots)} vacantes
            disponibles
          </Text>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Formulario */}
        <View style={styles.formCard}>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>
              ¿Por qué quieres unirte a este proyecto?
            </Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={motivation}
              onChangeText={setMotivation}
              placeholder="Explica qué te motiva de esta iniciativa y qué esperas lograr con el equipo..."
              placeholderTextColor={NodoColors.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Experiencia, trayectoria o aporte</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={experience}
              onChangeText={setExperience}
              placeholder="Menciona proyectos previos, cursos, materias o habilidades prácticas relacionadas..."
              placeholderTextColor={NodoColors.textMuted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Competencias que aportas al equipo</Text>
            <View style={styles.skillInputRow}>
              <TextInput
                style={[styles.input, styles.skillTextInput]}
                value={skillsInput}
                onChangeText={setSkillsInput}
                placeholder="Ej. REACT, FIGMA, MARKETING..."
                placeholderTextColor={NodoColors.textMuted}
                autoCapitalize="characters"
                onSubmitEditing={handleAddSkill}
              />
              <Pressable
                onPress={handleAddSkill}
                style={({ pressed }) => [
                  styles.addSkillBtn,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.addSkillText}>+ Añadir</Text>
              </Pressable>
            </View>

            <View style={styles.chipsContainer}>
              {selectedSkills.map((skill) => (
                <View key={skill} style={styles.skillChip}>
                  <Text style={styles.skillChipText}>#{skill}</Text>
                  <Pressable
                    onPress={() => handleRemoveSkill(skill)}
                    hitSlop={8}
                  >
                    <Text style={styles.removeChipText}>✕</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </View>

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
              <Text style={styles.submitBtnText}>Enviar postulación ✉️</Text>
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
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: NodoColors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: NodoColors.border,
  },
  backBtnText: {
    fontSize: 22,
    fontWeight: "700",
    color: NodoColors.textPrimary,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: NodoColors.textPrimary,
  },
  projectSummaryCard: {
    backgroundColor: NodoColors.surface,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: NodoColors.border,
    marginBottom: 16,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: NodoColors.textSecondary,
    textTransform: "uppercase",
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: NodoColors.textPrimary,
    marginVertical: 4,
  },
  summarySpots: {
    fontSize: 12,
    fontWeight: "700",
    color: "#047857",
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
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
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
  skillInputRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  skillTextInput: {
    flex: 1,
  },
  addSkillBtn: {
    backgroundColor: NodoColors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
  },
  addSkillText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  skillChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: NodoColors.chipInactive,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  skillChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: NodoColors.textPrimary,
  },
  removeChipText: {
    fontSize: 11,
    color: NodoColors.textSecondary,
    fontWeight: "700",
  },
  submitBtn: {
    backgroundColor: NodoColors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
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
    fontSize: 15,
    fontWeight: "800",
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
});
