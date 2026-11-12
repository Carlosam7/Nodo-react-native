import type { User } from "@/features/auth/domain/user";
import { ValidationFailure } from "@/core/domain/validation-failure";
import type { Project, ProjectStatus, ProjectUpdate, TeamMember } from "../types/project";
import { assertCanPublishUpdate } from "../domain/update-rules";

export interface PublishUpdateInput {
  projectId: string;
  author: User;
  title: string;
  body: string;
  newStatus?: ProjectStatus | null;
  projectRecordId?: string;
}
export interface PublishUpdateRepository {
  fetchProjectById(id: string): Promise<Project | null>;
  fetchTeamMembers(project: Project): Promise<TeamMember[]>;
  saveUpdate(input: PublishUpdateInput): Promise<ProjectUpdate>;
  updateProjectStatus(recordId: string, status: ProjectStatus): Promise<void>;
}
export async function publishUpdate(repository: PublishUpdateRepository, input: PublishUpdateInput): Promise<ProjectUpdate> {
  if (!input.title.trim() || !input.body.trim()) throw new ValidationFailure("Completa el título y el contenido de la actualización.");
  const project = await repository.fetchProjectById(input.projectId);
  if (!project) throw new ValidationFailure("No se encontró el proyecto.");
  const isCreator = project.creatorId === input.author.id;
  const isMember = !isCreator && (await repository.fetchTeamMembers(project)).some(
    (member) => member.userId === input.author.id && !member.isCreator,
  );
  assertCanPublishUpdate(isCreator, isMember, Boolean(input.newStatus));
  const update = await repository.saveUpdate(input);
  if (input.newStatus) {
    await repository.updateProjectStatus(project.recordId, input.newStatus);
  }
  return update;
}
