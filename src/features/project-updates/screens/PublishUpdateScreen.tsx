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
import { useAuth } from "@/features/auth/context/auth-context";
import { projectService } from "@/features/projects/services/project-service";
import { Project, ProjectStatus, TeamMember } from "@/features/projects/types/project";

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: "idea", label: "Idea" },
  { value: "en_desarrollo", label: "En desarrollo" },
  { value: "cerrado", label: "Cerrado" },
];

export function PublishUpdateScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { signedInUser } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [newStatus, setNewStatus] = useState<ProjectStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    projectService
      .fetchProjectById(id)
      .then(async (loadedProject) => {
        setProject(loadedProject);
        if (loadedProject) {
          const members = await projectService.fetchTeamMembers(loadedProject);
          setTeamMembers(members);
        }
      })
      .catch((err) => console.warn("Error al cargar proyecto:", err))
      .finally(() => setIsLoading(false));
  }, [id]);

  const handleSubmit = async () => {
    setError(null);
    if (!title.trim() || !body.trim()) {
      setError("Completa el título y el contenido de la actualización.");
      return;
    }
    if (!project || !signedInUser) return;

    setIsSubmitting(true);
    try {
      await projectService.publishUpdate({
        projectId: project.id,
        projectRecordId: project.recordId,
        author: signedInUser,
        title,
        body,
        newStatus: newStatus && newStatus !== project.status ? newStatus : null,
      });
      Alert.alert("¡Actualización publicada!", "Tu equipo ya puede verla.", [
        { text: "Entendido", onPress: () => router.back() },
      ]);
    } catch (err) {
      setError(friendlyErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !project) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={NodoColors.primary} />
      </View>
    );
  }

  const isCreator = signedInUser?.id === project.creatorId;
  const isMember = teamMembers.some(
    (member) => member.userId === signedInUser?.id && !member.isCreator,
  );

  if (!isCreator && !isMember) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top, padding: 24 }]}>
        <Text style={styles.headerTitle}>Acceso denegado</Text>
        <Text style={styles.deniedText}>
          Solo el líder o los colaboradores aceptados pueden publicar actualizaciones.
        </Text>
        <Pressable onPress={() => router.back()} style={styles.submitBtn}>
          <Text style={styles.submitBtnText}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  const currentStatus = newStatus ?? project.status;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 32,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.navRow}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backBtnText}>←</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Nueva actualización</Text>
          <View style={{ width: 42 }} />
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.formCard}>
          <Text style={styles.label}>Título</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Ej. Primer prototipo listo"
            placeholderTextColor={NodoColors.textMuted}
          />

          <Text style={styles.label}>Contenido</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={body}
            onChangeText={setBody}
            placeholder="Cuéntale al equipo qué avanzó..."
            placeholderTextColor={NodoColors.textMuted}
            multiline
            textAlignVertical="top"
          />

          {isCreator ? (
            <>
              <Text style={styles.label}>Estado del proyecto</Text>
              <View style={styles.statusRow}>
                {STATUS_OPTIONS.map((opt) => {
                  const active = currentStatus === opt.value;
                  return (
                    <Pressable
                      key={opt.value}
                      onPress={() => setNewStatus(opt.value)}
                      style={[styles.statusChip, active && styles.statusChipActive]}
                    >
                      <Text
                        style={[
                          styles.statusChipText,
                          active && styles.statusChipTextActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : null}

          <Pressable
            onPress={handleSubmit}
            disabled={isSubmitting}
            style={[styles.submitBtn, isSubmitting && { opacity: 0.6 }]}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.submitBtnText}>Publicar actualización</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NodoColors.background },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: NodoColors.background,
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
  backBtnText: { fontSize: 22, fontWeight: "700", color: NodoColors.textPrimary },
  headerTitle: { fontSize: 17, fontWeight: "800", color: NodoColors.textPrimary },
  deniedText: {
    color: NodoColors.textSecondary,
    textAlign: "center",
    marginVertical: 12,
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
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: NodoColors.textPrimary,
    marginBottom: 8,
    marginTop: 6,
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
    marginBottom: 12,
  },
  textArea: { minHeight: 120 },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: NodoColors.chipInactive,
  },
  statusChipActive: { backgroundColor: NodoColors.primary },
  statusChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: NodoColors.textPrimary,
  },
  statusChipTextActive: { color: "#FFFFFF" },
  submitBtn: {
    backgroundColor: NodoColors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  submitBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
});
