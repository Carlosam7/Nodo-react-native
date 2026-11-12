import { ValidationFailure } from "@/core/domain/validation-failure";
import type { User } from "@/features/auth/domain/user";
import type { Project } from "@/features/projects/types/project";
import type { Applicant, ApplicationDraft } from "../types/applicant";
import { assertCanApply } from "../domain/application-rules";

export interface SubmitApplicationRepository {
  fetchProjectById(id: string): Promise<Project | null>;
  hasApplication(projectId: string, applicantId: string): Promise<boolean>;
  ensureProfile(user: User): Promise<void>;
  saveApplication(draft: ApplicationDraft, user: User, project: Project): Promise<Applicant>;
}
export async function submitApplication(repository: SubmitApplicationRepository, draft: ApplicationDraft, user: User, project: Project): Promise<Applicant> {
  if (!draft.motivation.trim()) throw new ValidationFailure("Por favor indica tu motivación para sumarte al proyecto.");
  if (!draft.experience.trim()) throw new ValidationFailure("Cuéntanos sobre tu experiencia o rol previsto.");
  if (draft.projectId !== project.id) throw new ValidationFailure("La postulación no corresponde al proyecto indicado.");
  const currentProject = await repository.fetchProjectById(project.id);
  if (!currentProject) throw new ValidationFailure("No se encontró el proyecto.");
  assertCanApply(currentProject, user.id);
  if (await repository.hasApplication(currentProject.id, user.id)) {
    throw new ValidationFailure("Ya tienes una postulación registrada para esta iniciativa.");
  }
  await repository.ensureProfile(user);
  return repository.saveApplication(draft, user, currentProject);
}
