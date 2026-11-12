import type { Project } from "@/features/projects/types/project";

export interface HomeProjectsRepository {
  fetchCategories(): Promise<string[]>;
  fetchProjects(): Promise<Project[]>;
}

export async function loadHomeProjects(repository: HomeProjectsRepository) {
  const [categories, projects] = await Promise.all([
    repository.fetchCategories(),
    repository.fetchProjects(),
  ]);
  return { categories, projects };
}

export function filterHomeProjects(
  projects: Project[],
  category: string,
  query: string,
): Project[] {
  const search = query.trim().toLowerCase();
  return projects.filter((project) => {
    if (category !== "TODAS" && !project.categories.includes(category)) return false;
    if (!search) return true;
    return project.title.toLowerCase().includes(search) ||
      project.description.toLowerCase().includes(search) ||
      project.skills.some((skill) => skill.toLowerCase().includes(search));
  });
}
