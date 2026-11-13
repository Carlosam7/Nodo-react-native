import { LineIcon } from "@/components/ui/line-icon";
import { useState } from "react";
import { useRouter } from "expo-router";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NodoColors } from "@/core/theme/colors";
import type { AppNotification } from "../domain/notification";
import { useNotifications } from "../hooks/useNotifications";

export function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { items, error, loading, refresh, markRead, userId } = useNotifications();
  const [actionError, setActionError] = useState<string | null>(null);
  const open = async (item: AppNotification) => {
    try {
      setActionError(null);
      await markRead(item);
      router.push({ pathname: "/project/[id]", params: { id: item.projectId } });
    } catch { setActionError("No se pudo marcar la notificación como leída. Inténtalo de nuevo."); }
  };
  return <View style={[styles.container, { paddingTop: insets.top }]}>
    <View style={styles.header}>
      <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace("/")} accessibilityRole="button" accessibilityLabel="Volver"><View style={{ paddingRight: 18 }}><LineIcon name="arrow-left" size={22} color={NodoColors.textPrimary} /></View></Pressable>
      <Text style={styles.title}>Notificaciones</Text>
    </View>
    {!userId ? <View style={styles.center}><Text style={styles.empty}>Inicia sesión para ver tus notificaciones.</Text><Pressable onPress={() => router.push("/auth/login")}><Text style={styles.link}>Iniciar sesión</Text></Pressable></View> : loading ? <View style={styles.center}><ActivityIndicator size="large" color={NodoColors.primary} /></View> : <>
      {error || actionError ? <Text accessibilityRole="alert" style={styles.error}>{actionError || error}</Text> : null}
      {error ? <Pressable onPress={() => void refresh()}><Text style={styles.link}>Reintentar</Text></Pressable> : null}
      <FlatList data={items} keyExtractor={(item) => item.id} contentContainerStyle={styles.list} onRefresh={() => void refresh()} refreshing={false}
        ListEmptyComponent={!error ? <Text style={styles.empty}>Aún no tienes notificaciones.</Text> : undefined}
        renderItem={({ item }) => <Pressable onPress={() => void open(item)} accessibilityRole="button" accessibilityLabel={`${item.title}. ${item.body}`} style={[styles.item, !item.readAt && styles.unread]}>
          <Text style={styles.itemTitle}>{item.title}{!item.readAt ? " · Nueva" : ""}</Text><Text style={styles.body}>{item.body}</Text>
          <Text style={styles.date}>{item.createdAt.toLocaleString()}</Text>
        </Pressable>} />
    </>}
  </View>;
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: NodoColors.background }, header: { flexDirection: "row", alignItems: "center", padding: 20, backgroundColor: NodoColors.surface }, back: { fontSize: 24, color: NodoColors.textPrimary, marginRight: 18 }, title: { fontSize: 20, fontWeight: "800", color: NodoColors.textPrimary },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }, list: { padding: 20 }, empty: { color: NodoColors.textSecondary, textAlign: "center", marginTop: 24 }, link: { color: NodoColors.primary, textAlign: "center", padding: 12, fontWeight: "700" },
  item: { backgroundColor: NodoColors.surface, padding: 16, borderRadius: 14, borderWidth: 1, borderColor: NodoColors.border, marginBottom: 10 }, unread: { borderColor: NodoColors.primary }, itemTitle: { color: NodoColors.textPrimary, fontWeight: "800", fontSize: 15 }, body: { color: NodoColors.textSecondary, marginTop: 6 }, date: { color: NodoColors.textMuted, fontSize: 11, marginTop: 8 }, error: { color: "#B91C1C", padding: 12, textAlign: "center" },
});
