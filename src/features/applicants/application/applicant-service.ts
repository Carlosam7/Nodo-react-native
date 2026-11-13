import type { ApplicantOperations, ProjectOperations } from "@/core/application/services";
import type { UserProfileRepository } from "@/core/application/repositories";
import type { User } from "@/features/auth/domain/user";
import type { Project } from "@/features/projects/types/project";
import type { Applicant, ApplicationDraft } from "../types/applicant";
import { decideApplication, type ApplicationDecisionRepository } from "./decide-application";
import { submitApplication } from "./submit-application";
import { ValidationFailure } from "@/core/domain/validation-failure";
import type { NewNotification } from "@/features/notifications/domain/notification";

export interface ApplicantRepository extends ApplicationDecisionRepository {
  fetchApplicantsByProject(id: string): Promise<Applicant[]>;
  fetchMyApplications(id: string): Promise<Applicant[]>;
  hasApplication(projectId: string, applicantId: string): Promise<boolean>;
  saveApplication(draft: ApplicationDraft, user: User, project: Project): Promise<Applicant>;
}

export class ApplicantService implements ApplicantOperations {
  constructor(private readonly repository: ApplicantRepository, private readonly profiles: UserProfileRepository, private readonly projects: Pick<ProjectOperations, "fetchProjectById">, private readonly notifications?: { send(item: NewNotification): Promise<void> }) {}
  fetchApplicantsByProject(id: string) { return this.repository.fetchApplicantsByProject(id); }
  fetchMyApplications(id: string) { return this.repository.fetchMyApplications(id); }
  async submitApplication(draft: ApplicationDraft, user: User, project: Project) {
    const application = await submitApplication({
      fetchProjectById: (id) => this.projects.fetchProjectById(id),
      hasApplication: (projectId, applicantId) => this.repository.hasApplication(projectId, applicantId),
      ensureProfile: (applicant) => this.profiles.ensureProfile(applicant),
      saveApplication: (input, applicant, selectedProject) => this.repository.saveApplication(input, applicant, selectedProject),
    }, draft, user, project);
    await this.notify({ recipientId: project.creatorId, projectId: project.id, kind: "application", title: "Nueva postulación", body: `${user.name} se postuló a ${project.title}.` });
    return application;
  }
  async decideApplication(input: { applicant: Applicant; project: Project; newStatus: "accepted" | "rejected"; actor: User }) {
    const project = await this.projects.fetchProjectById(input.project.id);
    if (!project) throw new ValidationFailure("No se encontró el proyecto.");
    if (project.creatorId !== input.actor.id) throw new ValidationFailure("Solo el líder o creador del proyecto tiene permiso para gestionar postulantes.");
    const applicants = await this.repository.fetchApplicantsByProject(project.id);
    const applicant = applicants.find((item) => item.id === input.applicant.id);
    if (!applicant) throw new ValidationFailure("No se encontró la postulación para este proyecto.");
    const result = await decideApplication(this.repository, { ...input, project, applicant });
    if (applicant.status !== input.newStatus) {
      await this.notify({ recipientId: applicant.applicantId, projectId: project.id, kind: input.newStatus, title: input.newStatus === "accepted" ? "Postulación aceptada" : "Postulación rechazada", body: `Tu postulación a ${project.title} fue ${input.newStatus === "accepted" ? "aceptada" : "rechazada"}.` });
    }
    return result;
  }
  private async notify(item: NewNotification) {
    try { await this.notifications?.send(item); } catch (error) { console.warn("No se pudo guardar la notificación", error); }
  }
}
