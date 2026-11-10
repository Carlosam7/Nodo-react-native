import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NodoColors } from "@/core/theme/colors";
import { applicantService } from "@/features/applicants/services/applicant-service";
import { Applicant } from "@/features/applicants/types/applicant";
import { useAuth } from "@/features/auth/context/auth-context";
import { ProjectCard } from "@/features/home/components/ProjectCard";
import { projectService } from "@/features/projects/services/project-service";
import { Project } from "@/features/projects/types/project";

type ProfileTab = "created" | "joined";

interface JoinedProject {
  project: Project;
  application: Applicant | null;
}

export function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signedInUser, isPublicSession, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<ProfileTab>("created");
  const [createdProjects, setCreatedProjects] = useState<Project[]>([]);
  const [joinedProjects, setJoinedProjects] = useState<JoinedProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!signedInUser) return;

    setError(null);
    try {
      const [allProjects, applications] = await Promise.all([
        projectService.fetchProjects(),
        applicantService.fetchMyApplications(signedInUser.id),
      ]);
      const ownedProjects = allProjects.filter(
        (project) => project.creatorId === signedInUser.id,
      );
      const relevantApplications = applications.filter(
        (application) =>
          application.status === "accepted" || application.status === "pending",
      );
      const membershipItems = await Promise.all(
        relevantApplications.map(async (application) => {
          const project = await projectService.fetchProjectById(
            application.projectId,
          );
          return project
            ? {
                project,
                application:
                  application.status === "pending" ? application : null,
              }
            : null;
        }),
      );

      setCreatedProjects(ownedProjects);
      setJoinedProjects(
        membershipItems.filter((item): item is JoinedProject => item !== null),
      );
    } catch (loadError) {
      console.warn("Error al cargar perfil:", loadError);
      setError("No fue posible cargar tus iniciativas. Intenta nuevamente.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [signedInUser]);

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

  const displayedProjects: JoinedProject[] =
    activeTab === "created"
      ? createdProjects.map((project) => ({ project, application: null }))
      : joinedProjects;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Mi perfil</Text>
        <Pressable onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Salir</Text>
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
  logoutText: { color: NodoColors.primary, fontWeight: "700", fontSize: 13 },
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
