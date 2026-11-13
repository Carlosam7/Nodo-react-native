import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FloatingNotice } from "@/components/ui/FloatingNotice";
import { LineIcon } from "@/components/ui/line-icon";
import { NodoColors } from "@/core/theme/colors";
import type { AppNotification } from "../domain/notification";
import { useNotifications } from "../hooks/useNotifications";
import { findNewNotification } from "../application/find-new-notification";

/** Los avisos históricos se toman como línea base; solo se muestran nuevas llegadas. */
export function NotificationBubble() {
  const { items, userId, loading, error } = useNotifications();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const known = useRef<{ userId?: string; ids: Set<string> } | null>(null);
  const [bubble, setBubble] = useState<{ userId: string; item: AppNotification } | null>(null);

  useEffect(() => {
    if (!userId || loading || error) return;
    const ids = new Set(items.map((item) => item.id));
    if (!known.current || known.current.userId !== userId) {
      known.current = { userId, ids };
      return;
    }
    const incoming = findNewNotification(known.current.ids, items);
    known.current = { userId, ids };
    if (incoming) {
      setBubble({ userId, item: incoming });
    }
  }, [items, userId, loading, error]);

  const dismiss = useCallback(() => setBubble(null), []);

  if (!userId || bubble?.userId !== userId) return null;
  return <View style={[styles.overlay, { top: insets.top + 12 }]} pointerEvents="box-none">
    <FloatingNotice key={`${bubble.userId}:${bubble.item.id}`} onDismiss={dismiss} topOffset={insets.top + 12}>{(close) => <View style={styles.bubble} accessibilityLiveRegion="polite">
      <Pressable style={styles.content} onPress={() => close(() => router.push("/notifications"))} accessibilityRole="button" accessibilityLabel={`${bubble.item.title}. ${bubble.item.body}. Abrir notificaciones`}>
        <LineIcon name="bell-1" size={22} color={NodoColors.primary} />
        <View style={styles.copy}><Text style={styles.title}>{bubble.item.title}</Text><Text numberOfLines={2} style={styles.body}>{bubble.item.body}</Text></View>
      </Pressable>
      <Pressable onPress={() => close()} accessibilityRole="button" accessibilityLabel="Cerrar aviso" hitSlop={10} style={styles.close}><LineIcon name="xmark" size={18} color={NodoColors.textSecondary} /></Pressable>
    </View>}</FloatingNotice>
  </View>;
}
const styles = StyleSheet.create({
  overlay: { position: "absolute", left: 16, right: 16, zIndex: 1000, elevation: 20, alignItems: "center" },
  bubble: { maxWidth: 520, width: "100%", flexDirection: "row", alignItems: "center", backgroundColor: NodoColors.surface, borderRadius: 18, borderWidth: 1, borderColor: NodoColors.border, paddingHorizontal: 14, paddingVertical: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 10 },
  content: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 }, copy: { flex: 1 }, title: { color: NodoColors.textPrimary, fontWeight: "800", fontSize: 14 }, body: { color: NodoColors.textSecondary, fontSize: 13, marginTop: 3 }, close: { padding: 6 },
});
