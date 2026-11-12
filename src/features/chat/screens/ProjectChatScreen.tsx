import { useLocalSearchParams, useRouter } from "expo-router";
import { useRef } from "react";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NodoColors } from "@/core/theme/colors";
import type { ChatMessage } from "../domain/message";
import { useProjectChat } from "../hooks/useProjectChat";

export function ProjectChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const list = useRef<FlatList<ChatMessage>>(null);
  const { messages, text, setText, loading, sending, error, send, authorized, userId } = useProjectChat(id);
  const back = () => router.canGoBack() ? router.back() : router.replace("/");
  return (
    <KeyboardAvoidingView style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.header}>
        <Pressable onPress={back} accessibilityRole="button" accessibilityLabel="Volver"><Text style={styles.back}>←</Text></Pressable>
        <View style={styles.heading}><Text style={styles.title}>Chat del equipo</Text><Text style={styles.subtitle}>Líder e integrantes aceptados</Text></View>
      </View>
      {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
      {loading ? <View style={styles.center}><ActivityIndicator color={NodoColors.primary} size="large" /></View> : authorized ? (
        <FlatList
          ref={list}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={<Text style={styles.empty}>Aún no hay mensajes. Saluda a tu equipo.</Text>}
          renderItem={({ item }) => {
            const mine = item.authorId === userId;
            return <View style={[styles.message, mine ? styles.mine : styles.theirs]}>
              {!mine ? <Text style={styles.author}>{item.authorName}</Text> : null}
              <Text style={[styles.body, mine && styles.mineText]}>{item.body}</Text>
              <Text style={[styles.time, mine && styles.mineText]}>{item.createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
            </View>;
          }}
        />
      ) : <View style={styles.center} />}
      {authorized ? <View style={styles.composer}>
        <TextInput value={text} onChangeText={setText} placeholder="Escribe un mensaje..." placeholderTextColor={NodoColors.textMuted} multiline maxLength={1000} style={styles.input} accessibilityLabel="Mensaje" />
        <Pressable onPress={() => void send()} disabled={sending || loading || !text.trim()} accessibilityRole="button" accessibilityLabel="Enviar mensaje" style={[styles.send, (sending || loading || !text.trim()) && styles.disabled]}>
          {sending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.sendText}>Enviar</Text>}
        </Pressable>
      </View> : null}
    </KeyboardAvoidingView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NodoColors.background },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14, backgroundColor: NodoColors.surface, borderBottomWidth: 1, borderBottomColor: NodoColors.border },
  back: { fontSize: 24, color: NodoColors.textPrimary, paddingRight: 18 },
  heading: { flex: 1 }, title: { fontSize: 18, fontWeight: "800", color: NodoColors.textPrimary }, subtitle: { fontSize: 12, color: NodoColors.textSecondary, marginTop: 2 },
  center: { flex: 1, justifyContent: "center" }, list: { flexGrow: 1, paddingHorizontal: 16, paddingVertical: 16 },
  empty: { color: NodoColors.textSecondary, textAlign: "center", marginTop: 35 },
  message: { maxWidth: "82%", borderRadius: 16, padding: 12, marginBottom: 10 },
  mine: { alignSelf: "flex-end", backgroundColor: NodoColors.primary }, theirs: { alignSelf: "flex-start", backgroundColor: NodoColors.surface, borderWidth: 1, borderColor: NodoColors.border },
  author: { fontSize: 12, fontWeight: "800", color: NodoColors.primary, marginBottom: 4 }, body: { color: NodoColors.textPrimary, fontSize: 15, lineHeight: 21 }, time: { color: NodoColors.textSecondary, fontSize: 10, textAlign: "right", marginTop: 4 }, mineText: { color: "#fff" },
  error: { color: "#B91C1C", backgroundColor: "#FEE2E2", padding: 10, textAlign: "center" },
  composer: { flexDirection: "row", alignItems: "flex-end", gap: 10, padding: 12, backgroundColor: NodoColors.surface, borderTopWidth: 1, borderTopColor: NodoColors.border },
  input: { flex: 1, borderRadius: 14, borderWidth: 1, borderColor: NodoColors.border, backgroundColor: NodoColors.background, color: NodoColors.textPrimary, paddingHorizontal: 12, paddingVertical: 10, maxHeight: 100 },
  send: { backgroundColor: NodoColors.primary, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 14, minWidth: 76, alignItems: "center" }, sendText: { color: "#fff", fontWeight: "800" }, disabled: { opacity: 0.5 },
});
