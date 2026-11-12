import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
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

import { NodoColors } from "@/core/theme/colors";
import type { ProjectStatus } from "@/features/projects/types/project";
import { usePublishUpdate } from "../hooks/usePublishUpdate";

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: "idea", label: "Idea" },
  { value: "en_desarrollo", label: "En desarrollo" },
  { value: "cerrado", label: "Cerrado" },
];

export function PublishUpdateScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { project, title, setTitle, body, setBody, newStatus, setNewStatus, isLoading, isSubmitting, loadError, error, isCreator, isMember, submit } = usePublishUpdate(id);
  const back = () => router.canGoBack() ? router.back() : router.replace("/");
  const handleSubmit = async () => {
    if (await submit() && project) router.replace({ pathname: "/project/[id]", params: { id: project.id } });
  };

  if (isLoading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={NodoColors.primary} />
      </View>
    );
  }

  if (!project) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top, padding: 24 }]}>
        <Text style={styles.deniedText}>{loadError || "No se encontró el proyecto."}</Text>
        <Pressable onPress={back} style={styles.submitBtn}><Text style={styles.submitBtnText}>Volver</Text></Pressable>
      </View>
    );
  }

  if (!isCreator && !isMember) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top, padding: 24 }]}>
        <Text style={styles.headerTitle}>Acceso denegado</Text>
        <Text style={styles.deniedText}>
          Solo el líder o los colaboradores aceptados pueden publicar actualizaciones.
        </Text>
        <Pressable onPress={back} style={styles.submitBtn}>
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
          <Pressable onPress={back} style={styles.backBtn}>
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
