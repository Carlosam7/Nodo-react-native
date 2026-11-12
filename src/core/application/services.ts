import type { User } from "@/features/auth/domain/user";
import type { Project, ProjectDraft, ProjectEdit, ProjectStatus, ProjectUpdate, TeamMember } from "@/features/projects/types/project";
import type { PublishUpdateInput } from "@/features/projects/application/publish-update";
import type { Applicant, ApplicationDraft } from "@/features/applicants/types/applicant";

export interface ProjectOperations {
  fetchCategories(): Promise<string[]>;
  fetchProjects(options?: { category?: string }): Promise<Project[]>;
  fetchProjectById(id: string): Promise<Project | null>;
  createProject(draft: ProjectDraft, creator: User): Promise<Project>;
  editProject(id: string, draft: ProjectEdit, actor: User): Promise<void>;
  archiveProject(id: string, actor: User): Promise<void>;
  updateProjectStatus(projectId: string, status: ProjectStatus, actor: User): Promise<void>;
  fetchUpdates(id: string): Promise<ProjectUpdate[]>;
  fetchTeamMembers(project: Project): Promise<TeamMember[]>;
  publishUpdate(input: PublishUpdateInput): Promise<ProjectUpdate>;
}
export interface ApplicantOperations {
  fetchApplicantsByProject(id: string): Promise<Applicant[]>;
  fetchMyApplications(id: string): Promise<Applicant[]>;
  submitApplication(draft: ApplicationDraft, user: User, project: Project): Promise<Applicant>;
  decideApplication(input: { applicant: Applicant; project: Project; newStatus: "accepted" | "rejected"; actor: User }): Promise<{ updatedApplicant: Applicant; updatedFilledSpots: number }>;
}
