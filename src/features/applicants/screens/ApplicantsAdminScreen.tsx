import { LineIcon } from "@/components/ui/line-icon";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
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
import type { Applicant } from "@/features/applicants/types/applicant";
import type { ProjectStatus } from "@/features/projects/types/project";
import { useApplicantsAdmin } from "../hooks/useApplicantsAdmin";

export function ApplicantsAdminScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { project, applicants, selectedTab, setSelectedTab, isLoading, isRefreshing, actionInProgressId, canManage, retry, refresh, changeStatus, decide } = useApplicantsAdmin(id);
  const [pendingStatus, setPendingStatus] = useState<ProjectStatus | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const goBack = () => router.canGoBack() ? router.back() : router.replace("/");

  if (isLoading) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={NodoColors.primary} />
        <Text style={styles.loadingText}>Cargando panel de gestión...</Text>
      </View>
    );
  }

  if (!project) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top, padding: 24 }]}>
        <Text style={styles.errorTitle}>No se pudo cargar el proyecto</Text>
        <Pressable onPress={retry} style={styles.backActionBtn}>
          <Text style={styles.backActionText}>Reintentar</Text>
        </Pressable>
        <Pressable onPress={goBack} style={styles.backActionBtn}>
          <Text style={styles.backActionText}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  // Regla: Solo el creador puede acceder
  if (!canManage) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top, padding: 24 }]}>
        <Text style={styles.errorTitle}>Acceso denegado</Text>
        <Text style={styles.errorDesc}>
          Solo el líder o creador de este proyecto tiene permisos para auditar y
          decidir postulaciones.
        </Text>
        <Pressable onPress={goBack} style={styles.backActionBtn}>
          <Text style={styles.backActionText}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  const isFull = project.filledSpots >= project.totalSpots;

  const handleStatusChange = (newStatus: ProjectStatus) => {
    setActionError(null);
    setPendingStatus(newStatus);
  };

  const confirmStatusChange = async () => {
    if (!pendingStatus || updatingStatus) return;
    setUpdatingStatus(true);
    try {
      await changeStatus(pendingStatus);
      setPendingStatus(null);
    } catch (err) {
      setActionError(friendlyErrorMessage(err));
      setPendingStatus(null);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDecision = async (
    applicant: Applicant,
    decision: "accepted" | "rejected",
  ) => {
    if (decision === "accepted" && isFull && applicant.status !== "accepted") {
      setActionError("No quedan vacantes disponibles. Para admitir a otro colaborador, primero debes rechazar a uno previamente aceptado.");
      return;
    }

    try {
      setActionError(null);
      await decide(applicant, decision);
    } catch (err) {
      setActionError(friendlyErrorMessage(err));
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
            onRefresh={refresh}
            tintColor={NodoColors.primary}
          />
        }
      >
        {/* Cabecera */}
        <View style={styles.navRow}>
          <Pressable
            onPress={goBack}
            style={({ pressed }) => [styles.navBtn, pressed && styles.pressed]}
          >
            <LineIcon name="arrow-left" size={22} color={NodoColors.textPrimary} />
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

        {actionError ? <Text accessibilityRole="alert" style={styles.actionError}>{actionError}</Text> : null}

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
                Cupo lleno. Al rechazar o liberar cupos podrás aceptar nuevos
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
            <LineIcon name="clipboard" size={42} color={NodoColors.textMuted} />
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
      <Modal visible={pendingStatus !== null} transparent animationType="fade" onRequestClose={() => { if (!updatingStatus) setPendingStatus(null); }}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.cardTitle}>Cambiar estado del proyecto</Text>
            <Text style={styles.modalText}>¿Deseas cambiar el estado a {pendingStatus?.replace("_", " ").toUpperCase()}?</Text>
            <View style={styles.modalActions}>
              <Pressable disabled={updatingStatus} onPress={() => setPendingStatus(null)} style={styles.modalButton}><Text>Cancelar</Text></Pressable>
              <Pressable disabled={updatingStatus} onPress={confirmStatusChange} style={styles.modalButton}><Text>{updatingStatus ? "Guardando..." : "Confirmar"}</Text></Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  actionError: { color: "#a31515", marginBottom: 16 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 },
  modalCard: { backgroundColor: "#fff", borderRadius: 16, padding: 20 },
  modalText: { marginTop: 12, color: "#333" },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 20 },
  modalButton: { padding: 12 },
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
