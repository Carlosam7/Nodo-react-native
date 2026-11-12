import type { Project } from "../types/project";

export function selectProjects(projects: Project[], category?: string): Project[] {
  return projects
    .filter((project) => !category || category === "TODAS" || project.categories.includes(category))
    .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));
}
