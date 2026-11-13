import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LineIcon, type LineIconName } from "@/components/ui/line-icon";
import { NodoColors } from "@/core/theme/colors";
import { useAuth } from "@/features/auth/context/auth-context";

type MenuContentProps = {
  name?: string;
  isPublicSession: boolean;
  isLoading: boolean;
  onHome: () => void;
  onProfile: () => void;
  onNotifications: () => void;
  onAuth: () => void;
  onClose: () => void;
};

export function AppMenuContent({ name, isPublicSession, isLoading, onHome, onProfile, onNotifications, onAuth, onClose }: MenuContentProps) {
  const insets = useSafeAreaInsets();
  const item = (icon: LineIconName, label: string, action: () => void, disabled = false) => (
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={action} style={({ pressed }) => [styles.item, pressed && styles.pressed, disabled && styles.disabled]}>
      <LineIcon name={icon} size={21} color={NodoColors.primary} /><Text style={styles.itemText}>{label}</Text>
    </Pressable>
  );
  return <View style={[styles.panel, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 20 }]} accessibilityViewIsModal>
    <View style={styles.heading}>
      <View style={styles.logo}><Text style={styles.logoText}>N</Text></View>
      <View style={styles.brand}><Text style={styles.title}>NODO</Text><Text style={styles.subtitle}>Innovación Uninorte</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel="Cerrar menú" onPress={onClose} hitSlop={10} style={styles.close}><LineIcon name="xmark" size={20} color={NodoColors.textSecondary} /></Pressable>
    </View>
    <View style={styles.account}><Text style={styles.accountLabel}>{isPublicSession ? "Modo visitante" : "Tu cuenta"}</Text><Text numberOfLines={1} style={styles.accountName}>{isPublicSession ? "Explora iniciativas" : name || "Usuario"}</Text></View>
    <View style={styles.links}>
      {item("home-2", "Inicio", onHome)}
      {item("user-4", "Mi perfil", onProfile)}
      {item("bell-1", "Notificaciones", onNotifications)}
    </View>
    <View style={styles.footer}>{item(isPublicSession ? "enter" : "exit", isPublicSession ? "Iniciar sesión" : "Cerrar sesión", onAuth, isLoading)}</View>
  </View>;
}

export function AppMenu({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const router = useRouter();
  const { isPublicSession, signedInUser, logout, isLoading } = useAuth();
  const goProfile = () => {
    onClose();
    if (isPublicSession) router.push({ pathname: "/auth/login", params: { returnTo: "profile" } });
    else router.push("/profile");
  };
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.overlay}>
      <Pressable style={styles.backdrop} accessibilityRole="button" accessibilityLabel="Cerrar menú" onPress={onClose} />
      <AppMenuContent name={signedInUser?.name} isPublicSession={isPublicSession} isLoading={isLoading}
        onClose={onClose} onHome={onClose} onProfile={goProfile}
        onNotifications={() => { onClose(); router.push("/notifications"); }}
        onAuth={() => { onClose(); if (isPublicSession) router.push("/auth/login"); else void logout(); }} />
    </View>
  </Modal>;
}
const styles = StyleSheet.create({
  overlay: { flex: 1, flexDirection: "row" }, backdrop: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(15, 23, 42, 0.48)" },
  panel: { width: "80%", maxWidth: 320, height: "100%", backgroundColor: NodoColors.surface, paddingHorizontal: 20, shadowColor: "#000", shadowOffset: { width: 4, height: 0 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 12 },
  heading: { flexDirection: "row", alignItems: "center", gap: 10 }, logo: { width: 42, height: 42, backgroundColor: NodoColors.primary, borderRadius: 13, alignItems: "center", justifyContent: "center" }, logoText: { color: "#fff", fontSize: 21, fontWeight: "900" }, brand: { flex: 1 }, title: { color: NodoColors.textPrimary, fontSize: 18, fontWeight: "900", letterSpacing: 1.3 }, subtitle: { color: NodoColors.textSecondary, fontSize: 11 }, close: { padding: 6 },
  account: { backgroundColor: NodoColors.background, borderRadius: 14, padding: 14, marginTop: 30, marginBottom: 18 }, accountLabel: { color: NodoColors.textSecondary, fontSize: 12 }, accountName: { color: NodoColors.textPrimary, fontSize: 15, fontWeight: "700", marginTop: 4 }, links: { gap: 4 },
  item: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 14, paddingHorizontal: 12, borderRadius: 12 }, itemText: { color: NodoColors.textPrimary, fontSize: 15, fontWeight: "700" }, footer: { marginTop: "auto", borderTopWidth: 1, borderTopColor: NodoColors.border, paddingTop: 10 }, pressed: { backgroundColor: NodoColors.primaryMuted }, disabled: { opacity: 0.5 },
});
