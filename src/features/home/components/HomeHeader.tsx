import { LineIcon } from "@/components/ui/line-icon";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { NodoColors } from "@/core/theme/colors";
import { useNotifications } from "@/features/notifications/hooks/useNotifications";
import { AppMenu } from "./AppMenu";

export function HomeHeader() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const { items } = useNotifications();
  const unreadCount = items.filter((item) => !item.readAt).length;

  const handleNotificationPress = () => {
    router.push("/notifications");
  };

  return (
    <View style={styles.container}>
      <View style={styles.brandRow}>
        <View style={styles.brandContainer}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoLetter}>N</Text>
          </View>
          <View>
            <Text style={styles.brandTitle}>NODO</Text>
            <Text style={styles.brandSubtitle}>Innovación Uninorte</Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          {/* Bandeja de notificaciones */}
          <Pressable
            onPress={handleNotificationPress}
            style={({ pressed }) => [
              styles.iconButton,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={
              unreadCount
                ? `Notificaciones, ${unreadCount} sin leer`
                : "Notificaciones"
            }
          >
            <LineIcon name="bell-1" size={21} color={NodoColors.textPrimary} />
            {unreadCount > 0 ? <View style={styles.notificationDot} /> : null}
          </Pressable>

          <Pressable
            onPress={() => setMenuOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Abrir menú"
            style={({ pressed }) => [
              styles.iconButton,
              pressed && styles.pressed,
            ]}
          >
            <LineIcon
              name="menu-hamburger-1"
              size={21}
              color={NodoColors.textPrimary}
            />
          </Pressable>
        </View>
      </View>
      <AppMenu visible={menuOpen} onClose={() => setMenuOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 45,
    paddingBottom: 30,
    backgroundColor: NodoColors.background,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  logoBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: NodoColors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: NodoColors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  logoLetter: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 20,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 1.5,
    color: NodoColors.textPrimary,
  },
  brandSubtitle: {
    fontSize: 11,
    color: NodoColors.textSecondary,
    fontWeight: "500",
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: NodoColors.surface,
    borderWidth: 1,
    borderColor: NodoColors.border,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  bellIcon: {
    fontSize: 16,
  },
  notificationDot: {
    position: "absolute",
    top: 9,
    right: 10,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: NodoColors.primary,
  },
  loginButton: {
    backgroundColor: NodoColors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  disabled: { opacity: 0.5 },
  avatarButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: NodoColors.primaryMuted,
    borderWidth: 1.5,
    borderColor: NodoColors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: NodoColors.primary,
    fontWeight: "800",
    fontSize: 14,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
});
