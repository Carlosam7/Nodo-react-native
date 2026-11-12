import { ValidationFailure } from "@/core/domain/validation-failure";
import type { User } from "@/features/auth/domain/user";
import type { Project } from "../types/project";

export interface ArchiveProjectRepository {
  fetchProjectById(id: string): Promise<Project | null>;
  archiveProject(recordId: string): Promise<void>;
}

export async function archiveProject(repository: ArchiveProjectRepository, id: string, actor: User): Promise<void> {
  const project = await repository.fetchProjectById(id);
  if (!project) throw new ValidationFailure("No se encontró el proyecto.");
  if (project.creatorId !== actor.id) throw new ValidationFailure("Solo el creador puede eliminar este proyecto.");
  await repository.archiveProject(project.recordId);
}
