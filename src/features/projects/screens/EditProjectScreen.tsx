import { LineIcon } from "@/components/ui/line-icon";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NodoColors } from "@/core/theme/colors";
import { useEditProject } from "../hooks/useEditProject";

export function EditProjectScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { project, title, setTitle, description, setDescription, spots, setSpots, loading, saving, error, save } = useEditProject(id);
  const back = () => router.canGoBack() ? router.back() : router.replace("/profile");
  const handleSave = async () => { if (await save()) router.replace("/profile"); };

  if (loading) return <View style={styles.center}><ActivityIndicator color={NodoColors.primary} size="large" /></View>;
  if (!project) return <View style={styles.center}><Text style={styles.error}>{error || "No se encontró el proyecto."}</Text><Pressable onPress={back} accessibilityRole="button"><Text style={styles.backText}>Volver al perfil</Text></Pressable></View>;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
        <Pressable onPress={back} disabled={saving} accessibilityRole="button"><View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><LineIcon name="arrow-left" size={19} color={NodoColors.primary} /><Text style={styles.backText}>Volver</Text></View></Pressable>
        <Text style={styles.heading}>Editar proyecto</Text>
        <Text style={styles.subtitle}>Actualiza el nombre, la descripción y los cupos disponibles.</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Nombre de la iniciativa</Text>
          <TextInput value={title} onChangeText={setTitle} style={styles.input} editable={!saving} />
          <Text style={styles.label}>Descripción y objetivos</Text>
          <TextInput value={description} onChangeText={setDescription} style={[styles.input, styles.textArea]} multiline textAlignVertical="top" editable={!saving} />
          <Text style={styles.label}>Cupos totales</Text>
          <TextInput value={spots} onChangeText={setSpots} style={styles.input} keyboardType="number-pad" editable={!saving} />
          <Text style={styles.hint}>{project.filledSpots} cupos ocupados actualmente</Text>
          {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
          <Pressable onPress={handleSave} disabled={saving} accessibilityRole="button" style={[styles.button, saving && styles.disabled]}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Guardar cambios</Text>}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NodoColors.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, gap: 16, backgroundColor: NodoColors.background },
  content: { paddingHorizontal: 20 },
  backText: { color: NodoColors.primary, fontWeight: "700", fontSize: 15, paddingVertical: 12 },
  heading: { fontSize: 23, fontWeight: "900", color: NodoColors.textPrimary },
  subtitle: { fontSize: 14, color: NodoColors.textSecondary, marginTop: 6, marginBottom: 20 },
  card: { padding: 20, borderRadius: 20, borderWidth: 1, borderColor: NodoColors.border, backgroundColor: NodoColors.surface },
  label: { fontSize: 14, fontWeight: "700", color: NodoColors.textPrimary, marginTop: 12, marginBottom: 8 },
  input: { backgroundColor: NodoColors.background, borderWidth: 1, borderColor: NodoColors.border, borderRadius: 12, padding: 12, color: NodoColors.textPrimary, fontSize: 15 },
  textArea: { minHeight: 120 },
  hint: { color: NodoColors.textSecondary, marginTop: 8, fontSize: 12 },
  error: { color: "#B91C1C", marginTop: 14, textAlign: "center" },
  button: { backgroundColor: NodoColors.primary, borderRadius: 14, padding: 15, alignItems: "center", marginTop: 20 },
  buttonText: { color: "#fff", fontWeight: "800" },
  disabled: { opacity: 0.6 },
});
