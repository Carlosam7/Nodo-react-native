import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { friendlyErrorMessage } from "@/core/errors/failures";
import { NodoColors } from "@/core/theme/colors";
import { applicantService } from "@/features/applicants/services/applicant-service";
import {
  Applicant,
  ApplicantStatus,
} from "@/features/applicants/types/applicant";
import { useAuth } from "@/features/auth/context/auth-context";
import { projectService } from "@/features/projects/services/project-service";
import { Project, ProjectStatus } from "@/features/projects/types/project";

export function ApplicantsAdminScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { signedInUser } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [selectedTab, setSelectedTab] = useState<ApplicantStatus>("pending");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(
    null,
  );

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      const proj = await projectService.fetchProjectById(id);
      setProject(proj);

      if (proj) {
        const apps = await applicantService.fetchApplicantsByProject(proj.id);
        setApplicants(apps);
      }
    } catch (err) {
      console.warn("Error al cargar panel de administración:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    // Carga inicial de datos remotos al montar la pantalla
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  if (isLoading || !project) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={NodoColors.primary} />
        <Text style={styles.loadingText}>Cargando panel de gestión...</Text>
      </View>
    );
  }

  // Regla: Solo el creador puede acceder
  if (signedInUser && signedInUser.id !== project.creatorId) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top, padding: 24 }]}>
        <Text style={styles.errorTitle}>Acceso denegado</Text>
        <Text style={styles.errorDesc}>
          Solo el líder o creador de este proyecto tiene permisos para auditar y
          decidir postulaciones.
        </Text>
        <Pressable onPress={() => router.back()} style={styles.backActionBtn}>
          <Text style={styles.backActionText}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  const isFull = project.filledSpots >= project.totalSpots;

  const handleStatusChange = (newStatus: ProjectStatus) => {
    Alert.alert(
      "Cambiar estado del proyecto",
      `¿Deseas cambiar el estado a "${newStatus.replace("_", " ").toUpperCase()}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          onPress: async () => {
            try {
              await projectService.updateProjectStatus(
                project.recordId,
                newStatus,
              );
              setProject((prev) =>
                prev ? { ...prev, status: newStatus } : null,
              );
            } catch (err) {
              Alert.alert("Error", friendlyErrorMessage(err));
            }
          },
        },
      ],
    );
  };

  const handleDecision = async (
    applicant: Applicant,
    decision: "accepted" | "rejected",
  ) => {
    if (!signedInUser) return;

    if (decision === "accepted" && isFull && applicant.status !== "accepted") {
      Alert.alert(
        "Cupo lleno",
        "No quedan vacantes disponibles en este proyecto. Para admitir un nuevo colaborador debes rechazar a uno previamente aceptado.",
      );
      return;
    }

    setActionInProgressId(applicant.id);
    try {
      const { updatedApplicant, updatedFilledSpots } =
        await applicantService.decideApplication({
          applicant,
          project,
          newStatus: decision,
          actor: signedInUser,
        });

      setApplicants((prev) =>
        prev.map((a) => (a.id === updatedApplicant.id ? updatedApplicant : a)),
      );

      setProject((prev) =>
        prev ? { ...prev, filledSpots: updatedFilledSpots } : null,
      );
    } catch (err) {
      Alert.alert("Error al gestionar solicitud", friendlyErrorMessage(err));
    } finally {
      setActionInProgressId(null);
    }
  };

  const pendingList = applicants.filter((a) => a.status === "pending");
  const acceptedList = applicants.filter((a) => a.status === "accepted");
  const rejectedList = applicants.filter((a) => a.status === "rejected");

  const currentList =
    selectedTab === "pending"
      ? pendingList
      : selectedTab === "accepted"
        ? acceptedList
        : rejectedList;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              setIsRefreshing(true);
              loadData();
            }}
            tintColor={NodoColors.primary}
          />
        }
      >
        {/* Cabecera */}
        <View style={styles.navRow}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.navBtn, pressed && styles.pressed]}
          >
            <Text style={styles.navBtnText}>←</Text>
          </Pressable>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {project.title}
            </Text>
            <Text style={styles.headerSubtitle}>
              Gestión de postulaciones y vacantes
            </Text>
          </View>
        </View>

        {/* Panel de Estado del Proyecto */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Estado actual del proyecto</Text>
          <View style={styles.statusRow}>
            {(["idea", "en_desarrollo", "cerrado"] as ProjectStatus[]).map(
              (st) => {
                const isActive = project.status === st;
                return (
                  <Pressable
                    key={st}
                    onPress={() => handleStatusChange(st)}
                    style={[
                      styles.statusPill,
                      isActive && styles.statusPillActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        isActive && styles.statusPillTextActive,
                      ]}
                    >
                      {st === "idea"
                        ? "Idea"
                        : st === "en_desarrollo"
                          ? "En desarrollo"
                          : "Cerrado"}
                    </Text>
                  </Pressable>
                );
              },
            )}
          </View>
        </View>

        {/* Resumen de Capacidad */}
        <View style={styles.card}>
          <View style={styles.capacityRow}>
            <View>
              <Text style={styles.capacityTitle}>
                Capacidad de colaboradores
              </Text>
              <Text style={styles.capacitySubtitle}>
                {isFull
                  ? "Todos los cupos están cubiertos"
                  : `${project.totalSpots - project.filledSpots} cupos aún disponibles`}
              </Text>
            </View>
            <View
              style={[
                styles.capacityBadge,
                isFull ? styles.capacityBadgeFull : styles.capacityBadgeOpen,
              ]}
            >
              <Text
                style={[
                  styles.capacityBadgeText,
                  isFull ? styles.capacityTextFull : styles.capacityTextOpen,
                ]}
              >
                {project.filledSpots} / {project.totalSpots}
              </Text>
            </View>
          </View>

          {isFull ? (
            <View style={styles.capacityWarning}>
              <Text style={styles.capacityWarningText}>
                ⚠️ Cupo lleno. Al rechazar o liberar cupos podrás aceptar nuevos
                postulantes.
              </Text>
            </View>
          ) : null}
        </View>

        {/* Selector de Pestañas de Postulantes */}
        <View style={styles.tabsRow}>
          <Pressable
            onPress={() => setSelectedTab("pending")}
            style={[
              styles.tabBtn,
              selectedTab === "pending" && styles.tabBtnActive,
            ]}
          >
            <Text
              style={[
                styles.tabBtnText,
                selectedTab === "pending" && styles.tabBtnTextActive,
              ]}
            >
              Pendientes ({pendingList.length})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setSelectedTab("accepted")}
            style={[
              styles.tabBtn,
              selectedTab === "accepted" && styles.tabBtnActive,
            ]}
          >
            <Text
              style={[
                styles.tabBtnText,
                selectedTab === "accepted" && styles.tabBtnTextActive,
              ]}
            >
              Aceptados ({acceptedList.length})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setSelectedTab("rejected")}
            style={[
              styles.tabBtn,
              selectedTab === "rejected" && styles.tabBtnActive,
            ]}
          >
            <Text
              style={[
                styles.tabBtnText,
                selectedTab === "rejected" && styles.tabBtnTextActive,
              ]}
            >
              Rechazados ({rejectedList.length})
            </Text>
          </Pressable>
        </View>

        {/* Listado de Solicitudes */}
        {currentList.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>
              No hay solicitudes en esta sección.
            </Text>
          </View>
        ) : (
          currentList.map((app) => {
            const isActing = actionInProgressId === app.id;
            return (
              <View key={app.id} style={styles.applicantCard}>
                <View style={styles.applicantHeader}>
                  <View style={styles.applicantAvatar}>
                    <Text style={styles.applicantAvatarText}>
                      {app.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.applicantName}>{app.name}</Text>
                    <Text style={styles.applicantProgram}>
                      {app.program} · {app.university}
                    </Text>
                  </View>
                  <Text style={styles.submittedDate}>
                    {app.submittedAt.toLocaleDateString()}
                  </Text>
                </View>

                {/* Motivación */}
                {app.motivation ? (
                  <View style={styles.textBox}>
                    <Text style={styles.textBoxLabel}>Motivación:</Text>
                    <Text style={styles.textBoxContent}>{app.motivation}</Text>
                  </View>
                ) : null}

                {/* Experiencia */}
                {app.experience ? (
                  <View style={styles.textBox}>
                    <Text style={styles.textBoxLabel}>
                      Experiencia / Aporte:
                    </Text>
                    <Text style={styles.textBoxContent}>{app.experience}</Text>
                  </View>
                ) : null}

                {/* Competencias */}
                {app.skills.length > 0 ? (
                  <View style={styles.skillsWrap}>
                    {app.skills.map((s) => (
                      <View key={s} style={styles.skillPill}>
                        <Text style={styles.skillPillText}>#{s}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}

                {/* Acciones de Decisión */}
                <View style={styles.actionsRow}>
                  {app.status !== "accepted" ? (
                    <Pressable
                      onPress={() => handleDecision(app, "accepted")}
                      disabled={isActing || isFull}
                      style={({ pressed }) => [
                        styles.acceptBtn,
                        isFull && styles.disabledBtn,
                        pressed && styles.pressed,
                      ]}
                    >
                      {isActing ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text style={styles.acceptBtnText}>✓ Aceptar</Text>
                      )}
                    </Pressable>
                  ) : null}

                  {app.status !== "rejected" ? (
                    <Pressable
                      onPress={() => handleDecision(app, "rejected")}
                      disabled={isActing}
                      style={({ pressed }) => [
                        styles.rejectBtn,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={styles.rejectBtnText}>✕ Rechazar</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NodoColors.background,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
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
    marginBottom: 16,
  },
  navBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: NodoColors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: NodoColors.border,
  },
  navBtnText: {
    fontSize: 22,
    fontWeight: "700",
    color: NodoColors.textPrimary,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: NodoColors.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: NodoColors.textSecondary,
  },
  card: {
    backgroundColor: NodoColors.surface,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: NodoColors.border,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: NodoColors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: "row",
    gap: 8,
  },
  statusPill: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: NodoColors.background,
    borderWidth: 1,
    borderColor: NodoColors.border,
  },
  statusPillActive: {
    backgroundColor: NodoColors.primary,
    borderColor: NodoColors.primary,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: NodoColors.textSecondary,
  },
  statusPillTextActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  capacityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  capacityTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: NodoColors.textPrimary,
  },
  capacitySubtitle: {
    fontSize: 12,
    color: NodoColors.textSecondary,
    marginTop: 2,
  },
  capacityBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  capacityBadgeOpen: {
    backgroundColor: "#ECFDF5",
  },
  capacityBadgeFull: {
    backgroundColor: "#FEF2F2",
  },
  capacityBadgeText: {
    fontSize: 16,
    fontWeight: "900",
  },
  capacityTextOpen: {
    color: "#047857",
  },
  capacityTextFull: {
    color: "#B91C1C",
  },
  capacityWarning: {
    marginTop: 12,
    backgroundColor: "#FFFBEB",
    padding: 10,
    borderRadius: 10,
  },
  capacityWarningText: {
    fontSize: 12,
    color: "#B45309",
    fontWeight: "600",
  },
  tabsRow: {
    flexDirection: "row",
    backgroundColor: NodoColors.surface,
    padding: 4,
    borderRadius: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: NodoColors.border,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
  },
  tabBtnActive: {
    backgroundColor: NodoColors.primaryMuted,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: NodoColors.textSecondary,
  },
  tabBtnTextActive: {
    color: NodoColors.primaryDark,
    fontWeight: "800",
  },
  emptyCard: {
    backgroundColor: NodoColors.surface,
    borderRadius: 18,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: NodoColors.border,
  },
  emptyIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    color: NodoColors.textSecondary,
    textAlign: "center",
  },
  applicantCard: {
    backgroundColor: NodoColors.surface,
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: NodoColors.border,
    marginBottom: 14,
  },
  applicantHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  applicantAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: NodoColors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  applicantAvatarText: {
    color: NodoColors.primary,
    fontWeight: "800",
    fontSize: 16,
  },
  applicantName: {
    fontSize: 15,
    fontWeight: "800",
    color: NodoColors.textPrimary,
  },
  applicantProgram: {
    fontSize: 12,
    color: NodoColors.textSecondary,
  },
  submittedDate: {
    fontSize: 11,
    color: NodoColors.textMuted,
  },
  textBox: {
    backgroundColor: NodoColors.background,
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  textBoxLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: NodoColors.textSecondary,
    marginBottom: 2,
  },
  textBoxContent: {
    fontSize: 13,
    color: NodoColors.textPrimary,
    lineHeight: 18,
  },
  skillsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
    marginBottom: 12,
  },
  skillPill: {
    backgroundColor: NodoColors.chipInactive,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  skillPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: NodoColors.textSecondary,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  acceptBtn: {
    flex: 1,
    backgroundColor: "#059669",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  acceptBtnText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 13,
  },
  rejectBtn: {
    flex: 1,
    backgroundColor: "#FEE2E2",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  rejectBtnText: {
    color: "#B91C1C",
    fontWeight: "700",
    fontSize: 13,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: NodoColors.textPrimary,
    marginBottom: 8,
  },
  errorDesc: {
    fontSize: 14,
    color: NodoColors.textSecondary,
    textAlign: "center",
    marginBottom: 20,
  },
  backActionBtn: {
    backgroundColor: NodoColors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backActionText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
});
