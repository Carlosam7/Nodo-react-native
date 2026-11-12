import { ValidationFailure } from "@/core/domain/validation-failure";
import type { User } from "@/features/auth/domain/user";
import type { Project, ProjectStatus } from "../types/project";

export interface ChangeProjectStatusRepository {
  fetchProjectById(id: string): Promise<Project | null>;
  updateProjectStatus(recordId: string, status: ProjectStatus): Promise<void>;
}

export async function changeProjectStatus(repository: ChangeProjectStatusRepository, id: string, status: ProjectStatus, actor: User): Promise<void> {
  const project = await repository.fetchProjectById(id);
  if (!project) throw new ValidationFailure("No se encontró el proyecto.");
  if (project.creatorId !== actor.id) throw new ValidationFailure("Solo el líder puede cambiar el estado del proyecto.");
  if (!["idea", "en_desarrollo", "cerrado"].includes(status)) throw new ValidationFailure("El estado del proyecto no es válido.");
  await repository.updateProjectStatus(project.recordId, status);
}
