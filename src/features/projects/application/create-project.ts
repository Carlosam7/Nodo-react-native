import type { User } from "@/features/auth/domain/user";
import type { Project, ProjectDraft } from "../types/project";
import { ValidationFailure } from "@/core/domain/validation-failure";

export interface CreateProjectRepository {
  ensureProfile(user: User): Promise<void>;
  saveProject(draft: ProjectDraft, creator: User): Promise<Project>;
}

export async function createProject(repository: CreateProjectRepository, draft: ProjectDraft, creator: User): Promise<Project> {
  if (draft.title.trim().length < 3) throw new ValidationFailure("El título debe tener al menos 3 caracteres.");
  if (draft.description.trim().length < 10) throw new ValidationFailure("La descripción debe tener al menos 10 caracteres.");
  if (draft.categories.length === 0 || !draft.categories.some((category) => category.trim())) throw new ValidationFailure("Selecciona al menos una categoría para clasificar tu iniciativa.");
  if (!Number.isInteger(draft.totalSpots) || draft.totalSpots < 1 || draft.totalSpots > 20) throw new ValidationFailure("El número de cupos debe estar entre 1 y 20.");
  await repository.ensureProfile(creator);
  return repository.saveProject({ ...draft, title: draft.title.trim(), description: draft.description.trim() }, creator);
}
