import { ValidationFailure } from "@/core/domain/validation-failure";
import type { User } from "@/features/auth/domain/user";
import type { Project, ProjectEdit } from "../types/project";

export interface EditProjectRepository {
  fetchProjectById(id: string): Promise<Project | null>;
  saveProjectEdit(recordId: string, draft: ProjectEdit): Promise<void>;
}

export async function editProject(repository: EditProjectRepository, id: string, draft: ProjectEdit, actor: User): Promise<void> {
  const project = await repository.fetchProjectById(id);
  if (!project) throw new ValidationFailure("No se encontró el proyecto.");
  if (project.creatorId !== actor.id) throw new ValidationFailure("Solo el creador puede editar este proyecto.");
  const title = draft.title.trim();
  const description = draft.description.trim();
  if (title.length < 3) throw new ValidationFailure("El título debe tener al menos 3 caracteres.");
  if (description.length < 10) throw new ValidationFailure("La descripción debe tener al menos 10 caracteres.");
  if (!Number.isInteger(draft.totalSpots) || draft.totalSpots < 1 || draft.totalSpots > 20) throw new ValidationFailure("El número de cupos debe estar entre 1 y 20.");
  if (draft.totalSpots < project.filledSpots) throw new ValidationFailure("Los cupos no pueden ser menores que los ya ocupados.");
  await repository.saveProjectEdit(project.recordId, { title, description, totalSpots: draft.totalSpots });
}
