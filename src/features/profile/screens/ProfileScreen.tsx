import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LineIcon } from "@/components/ui/line-icon";
import { NodoColors } from "@/core/theme/colors";
import { useServices } from "@/core/presentation/services-context";
import { useAuth } from "@/features/auth/context/auth-context";
import { ProjectCard } from "@/features/home/components/ProjectCard";
import { Project } from "@/features/projects/types/project";
import { loadProfileProjects, JoinedProject } from "../application/load-profile-projects";

type ProfileTab = "created" | "joined";

export function ProfileScreen() {
  const { projects: projectService, applicants: applicantService } = useServices();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signedInUser, isPublicSession, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<ProfileTab>("created");
  const [createdProjects, setCreatedProjects] = useState<Project[]>([]);
  const [joinedProjects, setJoinedProjects] = useState<JoinedProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleteBusy = useRef(false);

  const loadData = useCallback(async () => {
    if (!signedInUser) return;

    setError(null);
    try {
      const result = await loadProfileProjects(signedInUser.id, projectService, applicantService);
      setCreatedProjects(result.createdProjects);
      setJoinedProjects(result.joinedProjects);
    } catch (loadError) {
      console.warn("Error al cargar perfil:", loadError);
      setError("No fue posible cargar tus iniciativas. Intenta nuevamente.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [signedInUser, projectService, applicantService]);

  useFocusEffect(
    useCallback(() => {
      if (isPublicSession) {
        router.replace("/auth/login");
        return;
      }
      void loadData();
    }, [isPublicSession, loadData, router]),
  );

  const handleLogout = async () => {
    await logout();
    router.replace("/");
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    void loadData();
  };

  const confirmDelete = async () => {
    if (!projectToDelete || !signedInUser || deleteBusy.current) return;
    deleteBusy.current = true;
    setDeleting(true);
    setDeleteError(null);
    try {
      await projectService.archiveProject(projectToDelete.id, signedInUser);
      setCreatedProjects((previous) => previous.filter((project) => project.id !== projectToDelete.id));
      setProjectToDelete(null);
    } catch {
      setDeleteError("No se pudo eliminar el proyecto. Intenta nuevamente.");
    } finally {
      deleteBusy.current = false;
      setDeleting(false);
    }
  };

  const displayedProjects: JoinedProject[] =
    activeTab === "created"
      ? createdProjects.map((project) => ({ project, application: null }))
      : joinedProjects;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.canGoBack() ? router.back() : router.replace("/")}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <LineIcon name="arrow-left" size={22} color={NodoColors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Mi perfil</Text>
        <Pressable onPress={handleLogout} style={styles.logoutButton} accessibilityRole="button" accessibilityLabel="Cerrar sesión">
          <LineIcon name="exit" size={21} color={NodoColors.primary} />
        </Pressable>
      </View>

      <View style={styles.userCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {signedInUser?.name?.charAt(0).toUpperCase() || "U"}
          </Text>
        </View>
        <Text style={styles.userName}>{signedInUser?.name || "Estudiante"}</Text>
        <Text style={styles.userEmail}>{signedInUser?.email}</Text>
      </View>

      <View style={styles.tabs}>
        <ProfileTabButton
          label={`Creados (${createdProjects.length})`}
          isActive={activeTab === "created"}
          onPress={() => setActiveTab("created")}
        />
        <ProfileTabButton
          label={`Unidos (${joinedProjects.length})`}
          isActive={activeTab === "joined"}
          onPress={() => setActiveTab("joined")}
        />
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={NodoColors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>{error}</Text>
          <Pressable onPress={() => void loadData()} style={styles.retryButton}>
            <Text style={styles.retryText}>Reintentar</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={displayedProjects}
          keyExtractor={(item) => item.project.id}
          renderItem={({ item }) => {
            return (
              <View>
                {activeTab === "joined" && item.application ? (
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingText}>Postulación pendiente</Text>
                  </View>
                ) : null}
                <ProjectCard
                  project={item.project}
                  onPress={() =>
                    router.push({ pathname: "/project/[id]", params: { id: item.project.id } })
                  }
                  onEdit={activeTab === "created" ? () => router.push({ pathname: "/edit-project/[id]", params: { id: item.project.id } }) : undefined}
                  onDelete={activeTab === "created" ? () => { setDeleteError(null); setProjectToDelete(item.project); } : undefined}
                />
              </View>
            );
          }}
          contentContainerStyle={displayedProjects.length === 0 ? styles.emptyList : undefined}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={NodoColors.primary}
            />
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {activeTab === "created"
                ? "Todavía no has creado iniciativas."
                : "No tienes equipos ni postulaciones pendientes."}
            </Text>
          }
        />
      )}
      <Modal visible={Boolean(projectToDelete)} transparent animationType="fade" onRequestClose={() => { if (!deleting) setProjectToDelete(null); }}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>¿Eliminar proyecto?</Text>
            <Text style={styles.modalDescription}>“{projectToDelete?.title}” dejará de aparecer en la app. Sus datos, postulaciones y avances se conservarán en Roble.</Text>
            {deleteError ? <Text style={styles.modalError} accessibilityRole="alert">{deleteError}</Text> : null}
            <View style={styles.modalActions}>
              <Pressable onPress={() => setProjectToDelete(null)} disabled={deleting} accessibilityRole="button" style={styles.cancelAction}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </Pressable>
              <Pressable onPress={confirmDelete} disabled={deleting} accessibilityRole="button" style={[styles.deleteAction, deleting && { opacity: 0.6 }]}>
                {deleting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.deleteText}>Eliminar</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

interface ProfileTabButtonProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
}

function ProfileTabButton({ label, isActive, onPress }: ProfileTabButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.tab, isActive && styles.activeTab]}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
    >
      <Text style={[styles.tabText, isActive && styles.activeTabText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "rgba(0,0,0,0.45)" },
  modalCard: { backgroundColor: NodoColors.surface, borderRadius: 20, padding: 22, width: "100%", maxWidth: 420, alignSelf: "center" },
  modalTitle: { color: NodoColors.textPrimary, fontSize: 19, fontWeight: "800", marginBottom: 10 },
  modalDescription: { color: NodoColors.textSecondary, fontSize: 14, lineHeight: 21 },
  modalError: { color: "#B91C1C", marginTop: 12 },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 10, marginTop: 20 },
  cancelAction: { paddingHorizontal: 16, paddingVertical: 11, borderRadius: 10, backgroundColor: NodoColors.background },
  cancelText: { color: NodoColors.textPrimary, fontWeight: "700" },
  deleteAction: { paddingHorizontal: 16, paddingVertical: 11, borderRadius: 10, backgroundColor: "#B91C1C", minWidth: 90, alignItems: "center" },
  deleteText: { color: "#fff", fontWeight: "700" },
  container: { flex: 1, backgroundColor: NodoColors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: { padding: 8 },
  backText: { fontSize: 22, color: NodoColors.textPrimary },
  headerTitle: { fontSize: 18, fontWeight: "800", color: NodoColors.textPrimary },
  logoutButton: {
    backgroundColor: NodoColors.primaryMuted,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  userCard: {
    alignItems: "center",
    paddingVertical: 16,
    backgroundColor: NodoColors.surface,
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: NodoColors.border,
    marginBottom: 12,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: NodoColors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  avatarText: { fontSize: 24, fontWeight: "800", color: NodoColors.primary },
  userName: { fontSize: 18, fontWeight: "800", color: NodoColors.textPrimary },
  userEmail: { fontSize: 13, color: NodoColors.textSecondary },
  tabs: { flexDirection: "row", paddingHorizontal: 16, marginBottom: 8, gap: 8 },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: NodoColors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: NodoColors.border,
  },
  activeTab: { backgroundColor: NodoColors.primary, borderColor: NodoColors.primary },
  tabText: { fontSize: 13, fontWeight: "700", color: NodoColors.textSecondary },
  activeTabText: { color: "#FFFFFF" },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  emptyList: { flexGrow: 1, justifyContent: "center", padding: 32 },
  emptyText: { color: NodoColors.textSecondary, textAlign: "center", fontSize: 14 },
  pendingBadge: {
    alignSelf: "flex-start",
    marginLeft: 20,
    marginBottom: -8,
    zIndex: 1,
    backgroundColor: NodoColors.primaryMuted,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  pendingText: { color: NodoColors.primary, fontSize: 11, fontWeight: "700" },
  retryButton: {
    marginTop: 12,
    backgroundColor: NodoColors.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryText: { color: "#FFFFFF", fontWeight: "700" },
});
