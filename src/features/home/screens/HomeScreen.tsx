import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NodoColors } from "@/core/theme/colors";
import { useAuth } from "@/features/auth/context/auth-context";
import { projectService } from "@/features/projects/services/project-service";
import { Project } from "@/features/projects/types/project";
import { CategoryFilter } from "../components/CategoryFilter";
import { HomeHeader } from "../components/HomeHeader";
import { ProjectCard } from "../components/ProjectCard";
import { SearchBar } from "../components/SearchBar";

export function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isPublicSession } = useAuth();

  const [projects, setProjects] = useState<Project[]>([]);
  const [categories, setCategories] = useState<string[]>(["TODAS"]);
  const [selectedCategory, setSelectedCategory] = useState<string>("TODAS");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const [cats, projs] = await Promise.all([
        projectService.fetchCategories(),
        projectService.fetchProjects(),
      ]);
      setCategories(cats);
      setProjects(projs);
    } catch (err) {
      console.warn("Error al cargar iniciativas:", err);
      setError(
        "No se pudieron cargar las iniciativas. Desliza para reintentar.",
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // Carga inicial de datos remotos al montar la pantalla
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  // Filtrado compuesto: Categoría + Texto de Búsqueda
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      // 1. Filtro por categoría
      const matchesCategory =
        selectedCategory === "TODAS" || p.categories.includes(selectedCategory);
      if (!matchesCategory) return false;

      // 2. Filtro por texto
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const inTitle = p.title.toLowerCase().includes(q);
      const inDesc = p.description.toLowerCase().includes(q);
      const inSkills = p.skills.some((s) => s.toLowerCase().includes(q));

      return inTitle || inDesc || inSkills;
    });
  }, [projects, selectedCategory, searchQuery]);

  const handleProjectPress = (project: Project) => {
    router.push({
      pathname: "/project/[id]",
      params: { id: project.id },
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Cabecera de exploración */}
      <HomeHeader />

      {/* Barra de Búsqueda */}
      <SearchBar value={searchQuery} onChangeText={setSearchQuery} />

      {/* Carrusel de Categorías */}
      <CategoryFilter
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {/* Contenido principal */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={NodoColors.primary} />
          <Text style={styles.loadingText}>Cargando iniciativas...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredProjects}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ProjectCard
              project={item}
              onPress={() => handleProjectPress(item)}
            />
          )}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 100 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => loadData(true)}
              tintColor={NodoColors.primary}
              colors={[NodoColors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>💡</Text>
              <Text style={styles.emptyTitle}>
                {error ? "Error de conexión" : "No hay proyectos"}
              </Text>
              <Text style={styles.emptySubtitle}>
                {error ||
                  "No encontramos iniciativas con los filtros seleccionados. Sé el primero en crear una."}
              </Text>
            </View>
          }
        />
      )}

      {/* Crear nueva iniciativa */}
      <Pressable
        onPress={() =>
          router.push(isPublicSession ? "/auth/login" : "/create-project")
        }
        style={[styles.fab, { bottom: insets.bottom + 20 }]}
        accessibilityRole="button"
        accessibilityLabel="Crear iniciativa"
      >
        <Text style={styles.fabText}>＋</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: NodoColors.primary,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: NodoColors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabText: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "600",
    lineHeight: 32,
  },
  container: {
    flex: 1,
    backgroundColor: NodoColors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: NodoColors.textSecondary,
    fontWeight: "600",
  },
  listContent: {
    paddingTop: 8,
    flexGrow: 1,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyIcon: {
    fontSize: 44,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: NodoColors.textPrimary,
    marginBottom: 6,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 13,
    color: NodoColors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },
});
