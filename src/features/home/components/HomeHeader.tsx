import { useRouter } from "expo-router";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { NodoColors } from "@/core/theme/colors";
import { useAuth } from "@/features/auth/context/auth-context";

export function HomeHeader() {
  const router = useRouter();
  const { isPublicSession, signedInUser, logout } = useAuth();

  const handleNotificationPress = () => {
    // Modo maqueta (stub) conforme al acuerdo del Lienzo de Alineación
    Alert.alert("Notificaciones", "Módulo en maqueta para esta iteración.");
  };

  const handleAuthPress = () => {
    if (isPublicSession) {
      router.push("/auth/login");
    } else {
      // Aún no existe pantalla de perfil: ofrecer cerrar sesión
      Alert.alert(signedInUser?.name ?? "Mi cuenta", undefined, [
        { text: "Cancelar", style: "cancel" },
        { text: "Cerrar sesión", style: "destructive", onPress: () => logout() },
      ]);
    }
  };

  const initials = signedInUser?.name
    ? signedInUser.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "U";

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
          {/* Campana de Notificaciones (Stub acordado) */}
          <Pressable
            onPress={handleNotificationPress}
            style={({ pressed }) => [
              styles.iconButton,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Notificaciones"
          >
            <Text style={styles.bellIcon}>🔔</Text>
            <View style={styles.notificationDot} />
          </Pressable>

          {/* Perfil o Iniciar Sesión */}
          {isPublicSession ? (
            <Pressable
              onPress={handleAuthPress}
              style={({ pressed }) => [
                styles.loginButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.loginButtonText}>Entrar</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={handleAuthPress}
              style={({ pressed }) => [
                styles.avatarButton,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.avatarText}>{initials}</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 14,
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
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
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
