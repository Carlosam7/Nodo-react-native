import { LineIcon } from "@/components/ui/line-icon";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback } from "react";
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

import { FloatingNotice } from "@/components/ui/FloatingNotice";
import { NodoColors } from "@/core/theme/colors";
import { useAuth } from "@/features/auth/context/auth-context";
import { Project } from "@/features/projects/types/project";
import { CategoryFilter } from "../components/CategoryFilter";
import { HomeHeader } from "../components/HomeHeader";
import { PublishedBanner } from "../components/PublishedBanner";
import { ProjectCard } from "../components/ProjectCard";
import { SearchBar } from "../components/SearchBar";
import { useHomeProjects } from "../hooks/useHomeProjects";

export function HomeScreen() {
  const router = useRouter();
  const { published } = useLocalSearchParams<{ published?: string }>();
  const insets = useSafeAreaInsets();
  const { isPublicSession } = useAuth();

  const { categories, selectedCategory, setSelectedCategory, searchQuery, setSearchQuery, isLoading, isRefreshing, error, filteredProjects, loadData } = useHomeProjects();

  const dismissPublished = useCallback(() => router.setParams({ published: undefined }), [router]);

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

      {published === "1" ? (
        <View style={[styles.floatingSuccess, { top: insets.top + 12 }]} pointerEvents="box-none">
          <FloatingNotice onDismiss={dismissPublished} topOffset={insets.top + 12}>{(close) => <PublishedBanner onDismiss={() => close()} />}</FloatingNotice>
        </View>
      ) : null}

      {/* Barra de Búsqueda */}
      <SearchBar value={searchQuery} onChangeText={setSearchQuery} />

      {/* Filtro de categorías */}
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
              <LineIcon name="bulb-2" size={42} color={NodoColors.primary} />
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
  floatingSuccess: { position: "absolute", left: 0, right: 0, zIndex: 100, elevation: 10 },
  successBanner: {
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#ECFDF5",
  },
  successText: { color: "#047857", fontWeight: "700", textAlign: "center" },
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
