import { useCallback, useEffect, useMemo, useState } from "react";

import { useServices } from "@/core/presentation/services-context";
import { Project } from "@/features/projects/types/project";
import { filterHomeProjects, loadHomeProjects } from "../application/home-projects";

export function useHomeProjects() {
  const { projects: projectService } = useServices();
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
      const result = await loadHomeProjects(projectService);
      setCategories(result.categories);
      setProjects(result.projects);
    } catch (err) {
      console.warn("Error al cargar iniciativas:", err);
      setError(
        "No se pudieron cargar las iniciativas. Desliza para reintentar.",
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [projectService]);

  useEffect(() => {
    // Carga inicial de datos remotos al montar la pantalla
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  const filteredProjects = useMemo(
    () => filterHomeProjects(projects, selectedCategory, searchQuery),
    [projects, selectedCategory, searchQuery],
  );

  return { categories, selectedCategory, setSelectedCategory, searchQuery, setSearchQuery, isLoading, isRefreshing, error, filteredProjects, loadData };
}
