import type { ProjectOperations } from "@/core/application/services";
import type { UserProfileRepository } from "@/core/application/repositories";
import type { User } from "@/features/auth/domain/user";
import type { Project, ProjectDraft, ProjectEdit, ProjectStatus, ProjectUpdate, TeamMember } from "../types/project";
import { createProject } from "./create-project";
import { publishUpdate, type PublishUpdateInput } from "./publish-update";
import { selectProjects } from "./list-projects";
import { editProject } from "./edit-project";
import { archiveProject } from "./archive-project";
import { changeProjectStatus } from "./change-project-status";

export interface ProjectRepository {
  fetchCategories(): Promise<string[]>;
  fetchProjects(): Promise<Project[]>;
  fetchProjectById(id: string): Promise<Project | null>;
  saveProject(draft: ProjectDraft, creator: User): Promise<Project>;
  saveProjectEdit(recordId: string, draft: ProjectEdit): Promise<void>;
  archiveProject(recordId: string): Promise<void>;
  updateProjectStatus(recordId: string, status: ProjectStatus): Promise<void>;
  fetchUpdates(id: string): Promise<ProjectUpdate[]>;
  fetchTeamMembers(project: Project): Promise<TeamMember[]>;
  saveUpdate(input: PublishUpdateInput): Promise<ProjectUpdate>;
}

export class ProjectService implements ProjectOperations {
  constructor(private readonly repository: ProjectRepository, private readonly profiles: UserProfileRepository) {}
  fetchCategories() { return this.repository.fetchCategories(); }
  async fetchProjects(options?: { category?: string }) { return selectProjects(await this.repository.fetchProjects(), options?.category); }
  fetchProjectById(id: string) { return this.repository.fetchProjectById(id); }
  fetchUpdates(id: string) { return this.repository.fetchUpdates(id); }
  fetchTeamMembers(project: Project) { return this.repository.fetchTeamMembers(project); }
  updateProjectStatus(projectId: string, status: ProjectStatus, actor: User) { return changeProjectStatus(this.repository, projectId, status, actor); }
  createProject(draft: ProjectDraft, creator: User) {
    return createProject({ ensureProfile: (user) => this.profiles.ensureProfile(user), saveProject: (input, user) => this.repository.saveProject(input, user) }, draft, creator);
  }
  editProject(id: string, draft: ProjectEdit, actor: User) { return editProject(this.repository, id, draft, actor); }
  archiveProject(id: string, actor: User) { return archiveProject(this.repository, id, actor); }
  publishUpdate(input: PublishUpdateInput) { return publishUpdate(this.repository, input); }
}
