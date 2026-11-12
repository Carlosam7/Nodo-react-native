import { TactilePressable } from "@/components/ui/tactile-pressable";
import { LineIcon } from "@/components/ui/line-icon";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { NodoColors } from "@/core/theme/colors";
import { Project } from "@/features/projects/types/project";

interface ProjectCardProps {
  project: Project;
  onPress: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function ProjectCard({ project, onPress, onEdit, onDelete }: ProjectCardProps) {
  const availableSpots = Math.max(0, project.totalSpots - project.filledSpots);
  const isFull = availableSpots === 0;

  // Badge de Estado
  const statusConfig =
    project.status === "en_desarrollo"
      ? NodoColors.statusEnDesarrollo
      : project.status === "cerrado"
        ? NodoColors.statusCerrado
        : NodoColors.statusIdea;

  const primaryColor = project.gradientColors[0] || NodoColors.primary;

  return (
    <View style={styles.card}>
      <TactilePressable
        onPress={onPress}
        style={({ pressed }) => pressed && styles.cardPressed}
        accessibilityRole="button"
        accessibilityLabel={`Proyecto ${project.title}`}
      >
      {/* Barra superior con color identitario del proyecto */}
      <View style={[styles.colorBar, { backgroundColor: primaryColor }]} />

      <View style={styles.cardContent}>
        {/* Fila superior: Estado y Cupos */}
        <View style={styles.metaRow}>
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

          <View
            style={[
              styles.spotsBadge,
              isFull ? styles.spotsBadgeFull : styles.spotsBadgeOpen,
            ]}
          >
            <Text
              style={[
                styles.spotsText,
                isFull ? styles.spotsTextFull : styles.spotsTextOpen,
              ]}
            >
              {isFull ? "Cupo lleno" : `${availableSpots} vacantes`}
            </Text>
          </View>
        </View>

        {/* Título y descripción */}
        <Text style={styles.title} numberOfLines={2}>
          {project.title}
        </Text>

        {project.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {project.description}
          </Text>
        ) : null}

        {/* Habilidades requeridas y Categorías */}
        <View style={styles.tagsContainer}>
          {project.categories.slice(0, 2).map((cat) => (
            <View key={cat} style={styles.categoryTag}>
              <Text style={styles.categoryTagText}>{cat}</Text>
            </View>
          ))}

          {project.skills.slice(0, 3).map((skill) => (
            <View key={skill} style={styles.skillTag}>
              <Text style={styles.skillTagText}>#{skill}</Text>
            </View>
          ))}

          {project.skills.length > 3 ? (
            <Text style={styles.moreSkillsText}>
              +{project.skills.length - 3}
            </Text>
          ) : null}
        </View>
      </View>
      </TactilePressable>
      {onEdit || onDelete ? (
        <View style={styles.footer}>
          {onEdit ? <Pressable
            onPress={onEdit}
            accessibilityRole="button"
            accessibilityLabel={`Editar ${project.title}`}
            style={({ pressed }) => [styles.editButton, pressed && styles.cardPressed]}
          >
            <LineIcon name="pencil-1" size={16} color={NodoColors.primary} /><Text style={styles.editText}>Editar</Text>
          </Pressable> : null}
          {onDelete ? <Pressable
            onPress={onDelete}
            accessibilityRole="button"
            accessibilityLabel={`Eliminar ${project.title}`}
            style={({ pressed }) => [styles.editButton, pressed && styles.cardPressed]}
          >
            <LineIcon name="trash-3" size={16} color="#B91C1C" /><Text style={styles.deleteText}>Eliminar</Text>
          </Pressable> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: NodoColors.surface,
    borderRadius: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: NodoColors.border,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.92,
  },
  colorBar: {
    height: 6,
    width: "100%",
  },
  cardContent: {
    padding: 18,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: NodoColors.border,
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  editButton: { paddingHorizontal: 8, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 5 },
  editText: { color: NodoColors.primary, fontSize: 13, fontWeight: "700" },
  deleteText: { color: "#B91C1C", fontSize: 13, fontWeight: "700" },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  spotsBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  spotsBadgeOpen: {
    backgroundColor: "#ECFDF5",
  },
  spotsBadgeFull: {
    backgroundColor: "#FEF2F2",
  },
  spotsText: {
    fontSize: 12,
    fontWeight: "700",
  },
  spotsTextOpen: {
    color: "#047857",
  },
  spotsTextFull: {
    color: "#B91C1C",
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    color: NodoColors.textPrimary,
    lineHeight: 22,
    marginBottom: 6,
  },
  description: {
    fontSize: 13,
    color: NodoColors.textSecondary,
    lineHeight: 18,
    marginBottom: 14,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    alignItems: "center",
  },
  categoryTag: {
    backgroundColor: NodoColors.primaryMuted,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryTagText: {
    color: NodoColors.primaryDark,
    fontSize: 11,
    fontWeight: "700",
  },
  skillTag: {
    backgroundColor: NodoColors.chipInactive,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  skillTagText: {
    color: NodoColors.textSecondary,
    fontSize: 11,
    fontWeight: "600",
  },
  moreSkillsText: {
    fontSize: 11,
    color: NodoColors.textMuted,
    fontWeight: "600",
  },
});
