import { LineIcon } from "@/components/ui/line-icon";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NodoColors } from "@/core/theme/colors";
import { useServices } from "@/core/presentation/services-context";
import { Applicant } from "@/features/applicants/types/applicant";
import { useAuth } from "@/features/auth/context/auth-context";
import { loadProjectDetail } from "../application/load-project-detail";
import {
  Project,
  ProjectUpdate,
  TeamMember,
} from "@/features/projects/types/project";

export function ProjectDetailScreen() {
  const { projects: projectService, applicants: applicantService } = useServices();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { signedInUser, isPublicSession } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [updates, setUpdates] = useState<ProjectUpdate[]>([]);
  const [myApplication, setMyApplication] = useState<Applicant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadProjectData = useCallback(async () => {
    if (!id) {
      setIsLoading(false);
      return;
    }
    try {
      const result = await loadProjectDetail(projectService, applicantService, id, signedInUser?.id);
      setProject(result?.project ?? null);
      setTeamMembers(result?.members ?? []);
      setUpdates(result?.updates ?? []);
      setMyApplication(result?.myApplication ?? null);
    } catch (err) {
      console.warn("Error al cargar detalle del proyecto:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [id, signedInUser, projectService, applicantService]);

  useFocusEffect(useCallback(() => {
    void loadProjectData();
  }, [loadProjectData]));

  if (isLoading) {
    return (
      <View style={[styles.centeredContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={NodoColors.primary} />
        <Text style={styles.loadingText}>Cargando proyecto...</Text>
      </View>
    );
  }

  if (!project) {
    return (
      <View style={[styles.centeredContainer, { paddingTop: insets.top }]}>
        <Text style={styles.loadingText}>No se pudo cargar el proyecto.</Text>
        <Pressable onPress={() => { setIsLoading(true); void loadProjectData(); }} accessibilityRole="button">
          <Text style={styles.loadingText}>Reintentar</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} accessibilityRole="button">
          <Text style={styles.loadingText}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  const isCreator = Boolean(
    signedInUser && signedInUser.id === project.creatorId,
  );
  const isMember = Boolean(
    signedInUser &&
    (myApplication?.status === "accepted" || teamMembers.some((m) => m.userId === signedInUser.id && !m.isCreator)),
  );

  const availableSpots = Math.max(0, project.totalSpots - project.filledSpots);
  const isFull = availableSpots === 0;

  const statusConfig =
    project.status === "en_desarrollo"
      ? NodoColors.statusEnDesarrollo
      : project.status === "cerrado"
        ? NodoColors.statusCerrado
        : NodoColors.statusIdea;

  const primaryAccent = project.gradientColors[0] || NodoColors.primary;

  const handleApplyPress = () => {
    if (isPublicSession) {
      router.push("/auth/login");
      return;
    }
    router.push({
      pathname: "/apply/[id]",
      params: { id: project.id },
    });
  };

  const handleAdminPress = () => {
    router.push({
      pathname: "/project-admin/[id]",
      params: { id: project.id },
    });
  };

  const handlePublishUpdatePress = () => {
    router.push({
      pathname: "/publish-update/[id]",
      params: { id: project.id },
    });
  };

  const handleChatPress = () => {
    router.push({ pathname: "/chat/[id]", params: { id: project.id } });
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 90 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              setIsRefreshing(true);
              loadProjectData();
            }}
            tintColor={NodoColors.primary}
          />
        }
      >
        {/* Barra superior de navegación */}
        <View style={styles.navRow}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.navButton,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <LineIcon name="arrow-left" size={22} color={NodoColors.textPrimary} />
          </Pressable>
          <View style={styles.navBadges}>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: statusConfig.background,
                  borderColor: statusConfig.border,
                },
              ]}
            >
              <Text style={[styles.statusText, { color: statusConfig.text }]}>
                {statusConfig.label}
              </Text>
            </View>
          </View>
        </View>

        {/* Hero Banner del Proyecto */}
        <View style={styles.heroCard}>
          <View
            style={[styles.heroColorStripe, { backgroundColor: primaryAccent }]}
          />
          <View style={styles.heroContent}>
            <Text style={styles.projectTitle}>{project.title}</Text>

            {/* Cupos y Capacidad */}
            <View style={styles.spotsBanner}>
              <View style={styles.spotsCounter}>
                <Text style={styles.spotsNumber}>
                  {project.filledSpots} / {project.totalSpots}
                </Text>
                <Text style={styles.spotsLabel}>cupos cubiertos</Text>
              </View>
              <View
                style={[
                  styles.vacanciesPill,
                  isFull ? styles.vacanciesFull : styles.vacanciesOpen,
                ]}
              >
                <Text
                  style={[
                    styles.vacanciesText,
                    isFull
                      ? styles.vacanciesTextFull
                      : styles.vacanciesTextOpen,
                  ]}
                >
                  {isFull
                    ? "Cupos agotados"
                    : `${availableSpots} vacantes disponibles`}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {isMember ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Estado del proyecto</Text>
            <Text style={styles.descriptionText}>Estado actual: {statusConfig.label}</Text>
            <Text style={styles.descriptionText}>Cupos ocupados: {project.filledSpots} de {project.totalSpots} · Disponibles: {availableSpots}</Text>
            <Text style={styles.descriptionText}>Integrantes del equipo: {teamMembers.length}</Text>
            <Text style={styles.descriptionText}>Avances registrados: {updates.length}</Text>
          </View>
        ) : null}

        {/* Descripción */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Propósito y descripción</Text>
          <Text style={styles.descriptionText}>
            {project.description || "Sin descripción detallada por el momento."}
          </Text>
        </View>

        {/* Categorías y Habilidades Requeridas */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>
            Perfil y competencias buscadas
          </Text>

          <Text style={styles.subLabel}>Categorías</Text>
          <View style={styles.chipsRow}>
            {project.categories.map((c) => (
              <View key={c} style={styles.categoryChip}>
                <Text style={styles.categoryChipText}>{c}</Text>
              </View>
            ))}
          </View>

          <Text style={[styles.subLabel, { marginTop: 12 }]}>
            Habilidades requeridas
          </Text>
          <View style={styles.chipsRow}>
            {project.skills.map((s) => (
              <View key={s} style={styles.skillChip}>
                <Text style={styles.skillChipText}>#{s}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Equipo de Trabajo */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Equipo consolidado</Text>
          <Text style={styles.sectionSubtitle}>
            Líder e integrantes admitidos formalmente en la iniciativa
          </Text>

          <View style={styles.teamList}>
            {teamMembers.map((member) => (
              <View key={member.userId} style={styles.teamMemberRow}>
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberAvatarText}>
                    {member.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{member.name}</Text>
                  <Text style={styles.memberRole}>
                    {member.isCreator
                      ? "Líder / Creador"
                      : member.program || "Colaborador"}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {isCreator || isMember ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Canales de comunicación</Text>
            <Text style={styles.sectionSubtitle}>Comunícate con los integrantes del proyecto</Text>
            <Pressable onPress={handleChatPress} style={styles.channelButton} accessibilityRole="button" accessibilityLabel="Abrir chat del equipo">
              <LineIcon name="chat-bubble-2" size={20} color={NodoColors.primaryDark} />
              <Text style={styles.smallActionText}>Chat del equipo</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Bitácora de Avances */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Bitácora de avances</Text>
            {isCreator || isMember ? (
              <Pressable
                onPress={handlePublishUpdatePress}
                style={({ pressed }) => [
                  styles.smallActionBtn,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.smallActionText}>+ Reportar avance</Text>
              </Pressable>
            ) : null}
          </View>

          {updates.length === 0 ? (
            <Text style={styles.noUpdatesText}>
              Aún no se han registrado bitácoras de avance para este proyecto.
            </Text>
          ) : (
            <View style={styles.updatesTimeline}>
              {updates.map((upd, idx) => (
                <View key={upd.id} style={styles.updateCard}>
                  <View style={styles.updateDot} />
                  <View style={styles.updateContent}>
                    <View style={styles.updateHeader}>
                      <Text style={styles.updateTitle}>{upd.title}</Text>
                      <Text style={styles.updateDate}>
                        {upd.createdAt.toLocaleDateString()}
                      </Text>
                    </View>
                    <Text style={styles.updateAuthor}>
                      Por {upd.authorName}
                      {upd.status ? ` · Estado: ${upd.status}` : ""}
                    </Text>
                    <Text style={styles.updateBody}>{upd.body}</Text>
                  </View>
                  {idx < updates.length - 1 ? (
                    <View style={styles.timelineLine} />
                  ) : null}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Barra de Acción Inferior Asimétrica */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
        {isCreator ? (
          <View style={styles.creatorActionsRow}>
            <Pressable
              onPress={handleAdminPress}
              style={({ pressed }) => [
                styles.primaryBtn,
                styles.creatorBtn,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.primaryBtnText}>
                Gestionar solicitudes y cupos
              </Text>
            </Pressable>
          </View>
        ) : isMember ? (
          <View style={styles.memberStatusBanner}>
            <Text style={styles.memberStatusText}>
              ✓ Formas parte del equipo de este proyecto
            </Text>
          </View>
        ) : myApplication ? (
          <View style={styles.appliedBanner}>
            <Text style={styles.appliedText}>
              Has enviado tu postulación · Estado:{" "}
              <Text style={styles.appliedStatusHighlight}>
                {myApplication.status === "accepted"
                  ? "Aceptada"
                  : myApplication.status === "rejected"
                    ? "Rechazada"
                    : "Pendiente de revisión"}
              </Text>
            </Text>
          </View>
        ) : isFull ? (
          <View style={styles.disabledBanner}>
            <Text style={styles.disabledBannerText}>
              Cupos completos · Convocatoria cerrada
            </Text>
          </View>
        ) : (
          <Pressable
            onPress={handleApplyPress}
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.primaryBtnText}>
              {isPublicSession
                ? "Iniciar sesión para postularme"
                : "Postularme al equipo"}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  channelButton: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: NodoColors.primaryMuted, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginTop: 12 },
  container: {
    flex: 1,
    backgroundColor: NodoColors.background,
  },
  centeredContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: NodoColors.background,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: NodoColors.textSecondary,
    fontWeight: "600",
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  navButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: NodoColors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: NodoColors.border,
  },
  navButtonText: {
    fontSize: 22,
    fontWeight: "700",
    color: NodoColors.textPrimary,
  },
  navBadges: {
    flexDirection: "row",
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  heroCard: {
    backgroundColor: NodoColors.surface,
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: NodoColors.border,
    marginBottom: 16,
  },
  heroColorStripe: {
    height: 8,
    width: "100%",
  },
  heroContent: {
    padding: 20,
  },
  projectTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: NodoColors.textPrimary,
    lineHeight: 28,
    marginBottom: 16,
  },
  spotsBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: NodoColors.background,
    padding: 14,
    borderRadius: 14,
  },
  spotsCounter: {
    flexDirection: "column",
  },
  spotsNumber: {
    fontSize: 18,
    fontWeight: "900",
    color: NodoColors.textPrimary,
  },
  spotsLabel: {
    fontSize: 11,
    color: NodoColors.textSecondary,
    fontWeight: "500",
  },
  vacanciesPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  vacanciesOpen: {
    backgroundColor: "#ECFDF5",
  },
  vacanciesFull: {
    backgroundColor: "#FEF2F2",
  },
  vacanciesText: {
    fontSize: 12,
    fontWeight: "700",
  },
  vacanciesTextOpen: {
    color: "#047857",
  },
  vacanciesTextFull: {
    color: "#B91C1C",
  },
  sectionCard: {
    backgroundColor: NodoColors.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: NodoColors.border,
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: NodoColors.textPrimary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: NodoColors.textSecondary,
    marginBottom: 14,
  },
  descriptionText: {
    fontSize: 14,
    color: NodoColors.textPrimary,
    lineHeight: 22,
  },
  subLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: NodoColors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryChip: {
    backgroundColor: NodoColors.primaryMuted,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: NodoColors.primaryDark,
  },
  skillChip: {
    backgroundColor: NodoColors.chipInactive,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  skillChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: NodoColors.textSecondary,
  },
  teamList: {
    gap: 12,
  },
  teamMemberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  memberAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: NodoColors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  memberAvatarText: {
    fontSize: 15,
    fontWeight: "800",
    color: NodoColors.primary,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontWeight: "700",
    color: NodoColors.textPrimary,
  },
  memberRole: {
    fontSize: 12,
    color: NodoColors.textSecondary,
  },
  smallActionBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: NodoColors.primaryMuted,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  smallActionText: {
    fontSize: 12,
    fontWeight: "700",
    color: NodoColors.primaryDark,
  },
  noUpdatesText: {
    fontSize: 13,
    color: NodoColors.textMuted,
    fontStyle: "italic",
  },
  updatesTimeline: {
    marginTop: 8,
  },
  updateCard: {
    position: "relative",
    paddingLeft: 20,
    marginBottom: 16,
  },
  updateDot: {
    position: "absolute",
    left: 0,
    top: 5,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: NodoColors.primary,
  },
  timelineLine: {
    position: "absolute",
    left: 4.5,
    top: 18,
    bottom: -10,
    width: 1,
    backgroundColor: NodoColors.border,
  },
  updateContent: {
    backgroundColor: NodoColors.background,
    padding: 14,
    borderRadius: 12,
  },
  updateHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  updateTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: NodoColors.textPrimary,
    flex: 1,
  },
  updateDate: {
    fontSize: 11,
    color: NodoColors.textMuted,
    marginLeft: 8,
  },
  updateAuthor: {
    fontSize: 11,
    color: NodoColors.textSecondary,
    fontWeight: "600",
    marginBottom: 6,
  },
  updateBody: {
    fontSize: 13,
    color: NodoColors.textPrimary,
    lineHeight: 18,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: NodoColors.surface,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: NodoColors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryBtn: {
    backgroundColor: NodoColors.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: NodoColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  creatorActionsRow: {
    flexDirection: "row",
  },
  creatorBtn: {
    flex: 1,
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  memberStatusBanner: {
    backgroundColor: "#ECFDF5",
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  memberStatusText: {
    color: "#047857",
    fontWeight: "700",
    fontSize: 13,
  },
  appliedBanner: {
    backgroundColor: "#FEF3C7",
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  appliedText: {
    color: "#92400E",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  appliedStatusHighlight: {
    fontWeight: "800",
  },
  disabledBanner: {
    backgroundColor: NodoColors.chipInactive,
    padding: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  disabledBannerText: {
    color: NodoColors.textSecondary,
    fontWeight: "700",
    fontSize: 13,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
});
